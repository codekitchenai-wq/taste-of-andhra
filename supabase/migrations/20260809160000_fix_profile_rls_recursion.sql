-- Fix admin/customer login: profile SELECT hit infinite RLS recursion via
-- "Profiles are viewable by assigned delivery partner" (subquery on orders).
-- Move order lookups into SECURITY DEFINER helpers so nested RLS is skipped.

CREATE OR REPLACE FUNCTION public.customer_ids_for_assigned_delivery()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.customer_ids_for_assigned_delivery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.address_ids_for_assigned_delivery() TO authenticated;

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
