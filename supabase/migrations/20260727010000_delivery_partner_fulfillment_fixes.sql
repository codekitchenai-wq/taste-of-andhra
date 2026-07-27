-- Delivery partner fulfillment fixes:
-- 1) Read customer name/phone and drop-off address for assigned orders
-- 2) Atomically mark delivery + order as delivered (avoids partial updates)
-- 3) Allow assigned partners to update order_status when needed as a fallback
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so nested RLS does not hide assignment rows)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalized_phone(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT RIGHT(REGEXP_REPLACE(COALESCE(input, ''), '\D', '', 'g'), 10);
$$;

CREATE OR REPLACE FUNCTION public.current_profile_phone()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.normalized_phone(phone)
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_delivery_partner(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_delivery()
    AND EXISTS (
      SELECT 1
      FROM public.delivery d
      WHERE d.order_id = p_order_id
        AND (
          d.partner_user_id = auth.uid()
          OR (
            public.normalized_phone(d.partner_phone) <> ''
            AND public.normalized_phone(d.partner_phone) =
              public.current_profile_phone()
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_delivery_record(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_delivery()
    AND EXISTS (
      SELECT 1
      FROM public.delivery d
      WHERE d.id = p_delivery_id
        AND (
          d.partner_user_id = auth.uid()
          OR (
            public.normalized_phone(d.partner_phone) <> ''
            AND public.normalized_phone(d.partner_phone) =
              public.current_profile_phone()
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_assigned_delivery_partner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_delivery_record(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: assigned partners can read customer name + phone
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles are viewable by assigned delivery partner"
  ON public.profiles;

CREATE POLICY "Profiles are viewable by assigned delivery partner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND id IN (
      SELECT o.user_id
      FROM public.orders o
      WHERE public.is_assigned_delivery_partner(o.id)
    )
  );

-- ---------------------------------------------------------------------------
-- Addresses: recreate with helper (avoids phone-format mismatches / recursion)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Addresses are viewable by assigned delivery partner"
  ON public.addresses;

CREATE POLICY "Addresses are viewable by assigned delivery partner"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND id IN (
      SELECT o.address_id
      FROM public.orders o
      WHERE o.address_id IS NOT NULL
        AND public.is_assigned_delivery_partner(o.id)
    )
  );

-- ---------------------------------------------------------------------------
-- Orders: assigned partners may update status (fallback path)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Orders are updatable by assigned delivery partner"
  ON public.orders;

CREATE POLICY "Orders are updatable by assigned delivery partner"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_assigned_delivery_partner(id) OR public.is_admin())
  WITH CHECK (public.is_assigned_delivery_partner(id) OR public.is_admin());

-- ---------------------------------------------------------------------------
-- Atomic status update for delivery + order (preferred client path)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_delivery_and_order_status(
  p_delivery_id UUID,
  p_status public.order_status
)
RETURNS public.delivery
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.delivery%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_allowed public.order_status[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.is_admin() OR public.is_assigned_delivery_record(p_delivery_id)) THEN
    RAISE EXCEPTION 'Not allowed to update this delivery';
  END IF;

  SELECT * INTO v_delivery
  FROM public.delivery
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_delivery.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Partners may only move an active assignment to delivered.
  IF public.is_delivery() AND NOT public.is_admin() THEN
    IF p_status IS DISTINCT FROM 'delivered'::public.order_status THEN
      RAISE EXCEPTION 'Delivery partners can only mark orders as delivered';
    END IF;
  END IF;

  v_allowed := CASE v_order.order_status
    WHEN 'pending' THEN ARRAY['confirmed', 'cancelled']::public.order_status[]
    WHEN 'confirmed' THEN ARRAY['preparing', 'cancelled']::public.order_status[]
    WHEN 'preparing' THEN ARRAY['ready', 'cancelled']::public.order_status[]
    WHEN 'ready' THEN ARRAY['out_for_delivery', 'cancelled']::public.order_status[]
    WHEN 'out_for_delivery' THEN ARRAY['delivered']::public.order_status[]
    ELSE ARRAY[]::public.order_status[]
  END;

  IF v_order.order_status IS DISTINCT FROM p_status
     AND NOT (p_status = ANY (v_allowed)) THEN
    -- Allow repairing a delivery row that was marked delivered while the order
    -- update previously failed under the old RLS rules.
    IF NOT (
      p_status = 'delivered'::public.order_status
      AND v_delivery.status = 'delivered'::public.order_status
      AND v_order.order_status = 'out_for_delivery'::public.order_status
    ) THEN
      RAISE EXCEPTION 'Invalid status transition from % to %',
        v_order.order_status, p_status;
    END IF;
  END IF;

  UPDATE public.delivery
  SET
    status = p_status,
    delivered_at = CASE
      WHEN p_status = 'delivered'::public.order_status
        THEN COALESCE(delivered_at, NOW())
      ELSE delivered_at
    END
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;

  IF v_order.order_status IS DISTINCT FROM p_status THEN
    UPDATE public.orders
    SET order_status = p_status
    WHERE id = v_order.id;
  END IF;

  RETURN v_delivery;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_delivery_and_order_status(UUID, public.order_status)
  TO authenticated;

-- Repair any rows left inconsistent by the previous client-side two-step update.
UPDATE public.orders o
SET order_status = 'delivered'
FROM public.delivery d
WHERE d.order_id = o.id
  AND d.status = 'delivered'
  AND o.order_status = 'out_for_delivery';

NOTIFY pgrst, 'reload schema';
