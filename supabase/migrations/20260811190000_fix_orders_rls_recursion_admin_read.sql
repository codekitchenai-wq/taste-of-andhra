-- Fix infinite RLS recursion on orders/profiles that blocked admin order reads.
-- Root cause: SQL-language helpers used in policies can be planned in ways that
-- re-enter orders/profiles policies. Use PL/pgSQL SECURITY DEFINER helpers and
-- narrow the broad "orders viewable by owner" policy (remove is_delivery()).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND is_active = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND role IN ('restaurant_owner', 'restaurant_admin')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_delivery()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'delivery'
      AND is_active = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_delivery() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT o.user_id
  FROM public.orders o
  INNER JOIN public.delivery d ON d.order_id = o.id
  WHERE o.user_id IS NOT NULL
    AND (
      d.partner_user_id = auth.uid()
      OR (
        public.normalized_phone(d.partner_phone) <> ''
        AND public.normalized_phone(d.partner_phone) =
          public.current_profile_phone()
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.order_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_delivery() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT d.order_id
  FROM public.delivery d
  WHERE
    d.partner_user_id = auth.uid()
    OR (
      public.normalized_phone(d.partner_phone) <> ''
      AND public.normalized_phone(d.partner_phone) =
        public.current_profile_phone()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.address_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_delivery() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT o.address_id
  FROM public.orders o
  INNER JOIN public.delivery d ON d.order_id = o.id
  WHERE o.address_id IS NOT NULL
    AND (
      d.partner_user_id = auth.uid()
      OR (
        public.normalized_phone(d.partner_phone) <> ''
        AND public.normalized_phone(d.partner_phone) =
          public.current_profile_phone()
      )
    );
END;
$$;

-- Delivery partners must not see every order; assigned-partner policy covers them.
DROP POLICY IF EXISTS "Orders are viewable by owner" ON public.orders;
CREATE POLICY "Orders are viewable by owner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Orders are viewable by assigned delivery partner"
  ON public.orders;
CREATE POLICY "Orders are viewable by assigned delivery partner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.order_ids_for_assigned_delivery()));

DROP POLICY IF EXISTS "Profiles are viewable by assigned delivery partner"
  ON public.profiles;
CREATE POLICY "Profiles are viewable by assigned delivery partner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND id IN (SELECT public.customer_ids_for_assigned_delivery())
  );

DROP POLICY IF EXISTS "Addresses are viewable by assigned delivery partner"
  ON public.addresses;
CREATE POLICY "Addresses are viewable by assigned delivery partner"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND id IN (SELECT public.address_ids_for_assigned_delivery())
  );

NOTIFY pgrst, 'reload schema';
