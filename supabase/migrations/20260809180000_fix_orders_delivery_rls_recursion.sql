-- Break orders <-> delivery RLS recursion that blocked phone-order create
-- (PostgREST INSERT ... RETURNING evaluates SELECT policies).

CREATE OR REPLACE FUNCTION public.order_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.order_id
  FROM public.delivery d
  WHERE public.is_delivery()
    AND (
      d.partner_user_id = auth.uid()
      OR (
        public.normalized_phone(d.partner_phone) <> ''
        AND public.normalized_phone(d.partner_phone) =
          public.current_profile_phone()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_delivery_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.order_ids_for_assigned_delivery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_delivery_order(UUID) TO authenticated;

DROP POLICY IF EXISTS "Orders are viewable by assigned delivery partner"
  ON public.orders;

CREATE POLICY "Orders are viewable by assigned delivery partner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.order_ids_for_assigned_delivery()));

DROP POLICY IF EXISTS "Delivery is viewable by admin, assigned partner, or order owner"
  ON public.delivery;

CREATE POLICY "Delivery is viewable by admin, assigned partner, or order owner"
  ON public.delivery
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_delivery()
      AND (
        partner_user_id = auth.uid()
        OR (
          public.normalized_phone(partner_phone) <> ''
          AND public.normalized_phone(partner_phone) =
            public.current_profile_phone()
        )
      )
    )
    OR public.owns_delivery_order(order_id)
  );

DROP POLICY IF EXISTS "Order items are viewable by assigned delivery partner"
  ON public.order_items;

CREATE POLICY "Order items are viewable by assigned delivery partner"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND order_id IN (SELECT public.order_ids_for_assigned_delivery())
  );

NOTIFY pgrst, 'reload schema';
