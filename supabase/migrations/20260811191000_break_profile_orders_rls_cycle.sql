-- Break profiles -> orders recursion for admin reads.
-- Keep delivery partner customer visibility via a non-recursive helper later if needed.

DROP POLICY IF EXISTS "Profiles are viewable by assigned delivery partner"
  ON public.profiles;

DROP POLICY IF EXISTS "Addresses are viewable by assigned delivery partner"
  ON public.addresses;

-- Also remove broad ALL policy SELECT path that re-enters is_admin on every profile read.
-- Admin management remains via explicit update/insert/delete policies if present;
-- recreate a SELECT-safe admin view using only auth.uid() role claim is not available,
-- so keep "Profiles are manageable by admin" but ensure is_admin is plpgsql (already done).

-- Harden order_items: remove is_delivery() blanket access (use assigned policy only).
DROP POLICY IF EXISTS "Order items are viewable by order owner"
  ON public.order_items;

CREATE POLICY "Order items are viewable by order owner"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.owns_order(order_id) OR public.is_admin());

NOTIFY pgrst, 'reload schema';
