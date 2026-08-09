-- Fix login-blocking RLS recursion:
-- profiles SELECT policy queried orders, orders policies call is_admin(),
-- which reads profiles again → "infinite recursion detected in policy for relation orders".

CREATE OR REPLACE FUNCTION public.can_delivery_read_profile(target_profile_id UUID)
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
      FROM public.orders o
      JOIN public.delivery d ON d.order_id = o.id
      WHERE o.user_id = target_profile_id
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

CREATE OR REPLACE FUNCTION public.can_delivery_read_address(target_address_id UUID)
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
      FROM public.orders o
      JOIN public.delivery d ON d.order_id = o.id
      WHERE o.address_id = target_address_id
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

GRANT EXECUTE ON FUNCTION public.can_delivery_read_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delivery_read_address(UUID) TO authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by assigned delivery partner"
  ON public.profiles;

CREATE POLICY "Profiles are viewable by assigned delivery partner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.can_delivery_read_profile(id));

DROP POLICY IF EXISTS "Addresses are viewable by assigned delivery partner"
  ON public.addresses;

CREATE POLICY "Addresses are viewable by assigned delivery partner"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (public.can_delivery_read_address(id));
