-- Scope check_delivery_service_area() to the address tenant (organization_id).
-- Branch lookup, delivery_settings, and distance rules must not leak across restaurants.

CREATE OR REPLACE FUNCTION public.check_delivery_service_area(
  p_address_id UUID,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_serviceable BOOLEAN,
  reason TEXT,
  distance_km NUMERIC,
  max_distance_km NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address public.addresses%ROWTYPE;
  v_branch public.branches%ROWTYPE;
  v_settings public.delivery_settings%ROWTYPE;
  v_distance NUMERIC;
  v_branch_found BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_address FROM public.addresses WHERE id = p_address_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'We could not find that delivery address.'::TEXT,
      NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL
    AND v_address.user_id <> auth.uid()
    AND NOT public.is_admin()
  THEN
    RETURN QUERY SELECT FALSE, 'We could not find that delivery address.'::TEXT,
      NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT * INTO v_branch
      FROM public.branches
     WHERE id = p_branch_id
       AND organization_id = v_address.organization_id;

    IF FOUND THEN
      v_branch_found := TRUE;
    END IF;
  END IF;

  IF NOT v_branch_found THEN
    SELECT * INTO v_branch
      FROM public.branches
     WHERE organization_id = v_address.organization_id
       AND is_default
       AND is_active
     LIMIT 1;

    IF FOUND THEN
      v_branch_found := TRUE;
    END IF;
  END IF;

  IF v_branch_found THEN
    SELECT * INTO v_settings
      FROM public.delivery_settings
     WHERE branch_id = v_branch.id
       AND organization_id = v_address.organization_id
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT * INTO v_settings
      FROM public.delivery_settings
     WHERE branch_id IS NULL
       AND organization_id = v_address.organization_id
     LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF COALESCE(array_length(v_settings.service_pincodes, 1), 0) > 0
    AND NOT (btrim(v_address.pincode) = ANY (v_settings.service_pincodes))
  THEN
    RETURN QUERY SELECT FALSE,
      format('We do not deliver to pincode %s yet.', v_address.pincode)::TEXT,
      NULL::NUMERIC, v_settings.max_distance_km;
    RETURN;
  END IF;

  IF v_settings.require_location_pin
    AND (v_address.latitude IS NULL OR v_address.longitude IS NULL)
  THEN
    RETURN QUERY SELECT FALSE,
      'Pin this address on the map so we can check whether we deliver there.'::TEXT,
      NULL::NUMERIC, v_settings.max_distance_km;
    RETURN;
  END IF;

  IF v_branch_found
    AND v_branch.latitude IS NOT NULL
    AND v_branch.longitude IS NOT NULL
    AND v_address.latitude IS NOT NULL
    AND v_address.longitude IS NOT NULL
  THEN
    v_distance := public.haversine_km(
      v_branch.latitude,
      v_branch.longitude,
      v_address.latitude,
      v_address.longitude
    );

    IF v_settings.max_distance_km IS NOT NULL
      AND v_distance > v_settings.max_distance_km
    THEN
      RETURN QUERY SELECT FALSE,
        format(
          'This address is %s km from our %s kitchen, beyond the %s km we deliver to.',
          trim_scale(ROUND(v_distance, 1)),
          v_branch.name,
          trim_scale(ROUND(v_settings.max_distance_km, 1))
        )::TEXT,
        v_distance, v_settings.max_distance_km;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_distance, v_settings.max_distance_km;
END;
$$;

COMMENT ON FUNCTION public.check_delivery_service_area(UUID, UUID) IS
  'Single source of truth for whether an address is inside the delivery area (scoped by organization_id).';

NOTIFY pgrst, 'reload schema';
