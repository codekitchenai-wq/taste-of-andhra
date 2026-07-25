-- Admin-controlled service area: one rule set that decides whether an address
-- can be ordered to, applied identically to own-fleet and third-party delivery.
--
-- The rules live in delivery_settings so the restaurant can change coverage
-- without a deploy. check_delivery_service_area() is the single source of truth
-- and is called from three places: the quote Edge Function, checkout, and a
-- BEFORE INSERT guard on orders that stops an out-of-area order even if the
-- browser skips the checkout gate.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Additional service-area settings
-- ---------------------------------------------------------------------------

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS require_location_pin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS service_area_note TEXT;

COMMENT ON COLUMN public.delivery_settings.require_location_pin IS
  'Blocks addresses without map coordinates, so the distance rule cannot be dodged.';
COMMENT ON COLUMN public.delivery_settings.service_area_note IS
  'Customer-facing sentence describing where the restaurant delivers.';

-- ---------------------------------------------------------------------------
-- Straight-line distance helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.haversine_km(
  p_from_lat NUMERIC,
  p_from_lng NUMERIC,
  p_to_lat NUMERIC,
  p_to_lng NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ROUND(
    (
      6371 * 2 * asin(
        sqrt(
          sin(radians(p_to_lat - p_from_lat) / 2) ^ 2 +
          cos(radians(p_from_lat)) *
          cos(radians(p_to_lat)) *
          sin(radians(p_to_lng - p_from_lng) / 2) ^ 2
        )
      )
    )::NUMERIC,
    2
  );
$$;

COMMENT ON FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS
  'Straight-line km between two points. Used for the max delivery distance rule.';

-- ---------------------------------------------------------------------------
-- Service area check
-- ---------------------------------------------------------------------------

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
BEGIN
  SELECT * INTO v_address FROM public.addresses WHERE id = p_address_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'We could not find that delivery address.'::TEXT,
      NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- The service role (Edge Functions) has no auth.uid(); every other caller may
  -- only ask about their own addresses.
  IF auth.uid() IS NOT NULL
    AND v_address.user_id <> auth.uid()
    AND NOT public.is_admin()
  THEN
    RETURN QUERY SELECT FALSE, 'We could not find that delivery address.'::TEXT,
      NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT * INTO v_branch FROM public.branches WHERE id = p_branch_id;
  ELSE
    SELECT * INTO v_branch
      FROM public.branches
     WHERE is_default AND is_active
     LIMIT 1;
  END IF;

  -- Branch settings win; the branch-less row is the default for everyone else.
  SELECT * INTO v_settings
    FROM public.delivery_settings
   WHERE branch_id = v_branch.id
   LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_settings
      FROM public.delivery_settings
     WHERE branch_id IS NULL
     LIMIT 1;
  END IF;

  -- No configuration yet means no restriction, so ordering keeps working.
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

  IF v_branch.latitude IS NOT NULL
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
  'Single source of truth for whether an address is inside the delivery area.';

REVOKE ALL ON FUNCTION public.check_delivery_service_area(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_delivery_service_area(UUID, UUID)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Order guard
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_service_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check RECORD;
BEGIN
  IF NEW.address_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Staff still take phone and counter orders for addresses the website will
  -- not accept, and a service-role caller has already made its own decision, so
  -- the guard only applies to customer checkouts.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_check
    FROM public.check_delivery_service_area(NEW.address_id, NEW.branch_id);

  IF v_check.is_serviceable IS FALSE THEN
    RAISE EXCEPTION 'OUTSIDE_SERVICE_AREA: %',
      COALESCE(v_check.reason, 'We do not deliver to this address yet.')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_service_area ON public.orders;
CREATE TRIGGER enforce_order_service_area
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_service_area();

NOTIFY pgrst, 'reload schema';
