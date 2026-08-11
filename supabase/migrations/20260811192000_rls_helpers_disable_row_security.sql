-- Explicitly disable row_security inside auth helper functions.
-- SECURITY DEFINER alone was still hitting infinite recursion on orders/profiles
-- under Postgres 17 / Supabase when helpers were used from RLS policies.

CREATE OR REPLACE FUNCTION public.is_platform_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'platform_master'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_platform_master()
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
$$;

CREATE OR REPLACE FUNCTION public.is_delivery()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'delivery'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_phone()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.normalized_phone(phone)
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.owns_order(target_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = target_order_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_delivery_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.order_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
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

CREATE OR REPLACE FUNCTION public.customer_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT DISTINCT o.user_id
  FROM public.orders o
  INNER JOIN public.delivery d ON d.order_id = o.id
  WHERE o.user_id IS NOT NULL
    AND public.is_delivery()
    AND (
      d.partner_user_id = auth.uid()
      OR (
        public.normalized_phone(d.partner_phone) <> ''
        AND public.normalized_phone(d.partner_phone) =
          public.current_profile_phone()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.address_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT DISTINCT o.address_id
  FROM public.orders o
  INNER JOIN public.delivery d ON d.order_id = o.id
  WHERE o.address_id IS NOT NULL
    AND public.is_delivery()
    AND (
      d.partner_user_id = auth.uid()
      OR (
        public.normalized_phone(d.partner_phone) <> ''
        AND public.normalized_phone(d.partner_phone) =
          public.current_profile_phone()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_delivery_partner(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
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

-- Restore delivery-partner visibility with row_security=off helpers.
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
