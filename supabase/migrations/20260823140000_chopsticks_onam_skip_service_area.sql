-- Temporary Onam season: Chopsticks Onam Sadhya pre-book orders must not be
-- blocked by service_pincodes or max_distance_km. Other tenants unchanged.
-- Identified by special_instructions starting with ONAM SADHYA PRE-BOOK and
-- organization slug chopsticksspicemalabar.

CREATE OR REPLACE FUNCTION public.enforce_order_service_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check RECORD;
  v_slug TEXT;
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

  -- Chopsticks Onam Sadhya: allow parcel orders regardless of pincode/km.
  IF NEW.special_instructions IS NOT NULL
    AND NEW.special_instructions LIKE 'ONAM SADHYA PRE-BOOK%'
  THEN
    SELECT lower(o.slug) INTO v_slug
      FROM public.organizations o
     WHERE o.id = NEW.organization_id;

    IF v_slug IN ('chopsticksspicemalabar', 'chopstickspicemalabar') THEN
      RETURN NEW;
    END IF;
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

COMMENT ON FUNCTION public.enforce_order_service_area() IS
  'Blocks customer orders outside the service area, except Chopsticks Onam Sadhya pre-books.';

NOTIFY pgrst, 'reload schema';
