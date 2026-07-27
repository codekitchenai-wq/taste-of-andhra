-- Delivery partner account link, live GPS columns, and matching policies.
-- Idempotent: safe to re-run, and safe if 20250721200000_future_features.sql
-- was only partly applied (production has the new tables but not these columns).

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS partner_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS current_lat NUMERIC;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS current_lng NUMERIC;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_delivery_partner_user_id
  ON public.delivery (partner_user_id);

-- ---------------------------------------------------------------------------
-- Phone matching helper
--
-- Assignments store a 10-digit local number while profiles may hold "+91…",
-- so exact string comparison silently hides orders from the assigned partner.
-- Returns '' for missing input; callers must reject that to avoid matching
-- every row when both sides are blank.
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

-- Backfill the account link for assignments that already match a delivery login.
UPDATE public.delivery d
SET partner_user_id = p.id
FROM public.profiles p
WHERE d.partner_user_id IS NULL
  AND p.role = 'delivery'
  AND public.normalized_phone(p.phone) <> ''
  AND public.normalized_phone(p.phone) = public.normalized_phone(d.partner_phone);

-- ---------------------------------------------------------------------------
-- Policies: a partner is "assigned" by account link OR normalized phone match
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Delivery records are viewable by admin and delivery partners" ON public.delivery;
DROP POLICY IF EXISTS "Delivery is viewable by assigned partner user" ON public.delivery;
DROP POLICY IF EXISTS "Delivery is viewable by order owner" ON public.delivery;
DROP POLICY IF EXISTS "Delivery status is updatable by admin or assigned partner" ON public.delivery;
DROP POLICY IF EXISTS "Delivery is updatable by assigned partner user" ON public.delivery;

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
          AND public.normalized_phone(partner_phone) = public.current_profile_phone()
        )
      )
    )
    OR order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Delivery is updatable by admin or assigned partner"
  ON public.delivery
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_delivery()
      AND (
        partner_user_id = auth.uid()
        OR (
          public.normalized_phone(partner_phone) <> ''
          AND public.normalized_phone(partner_phone) = public.current_profile_phone()
        )
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_delivery()
      AND (
        partner_user_id = auth.uid()
        OR (
          public.normalized_phone(partner_phone) <> ''
          AND public.normalized_phone(partner_phone) = public.current_profile_phone()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Partners need the order, its items, and the drop-off address
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Orders are viewable by assigned delivery partner" ON public.orders;
DROP POLICY IF EXISTS "Order items are viewable by assigned delivery partner" ON public.order_items;
DROP POLICY IF EXISTS "Addresses are viewable by assigned delivery partner" ON public.addresses;

CREATE POLICY "Orders are viewable by assigned delivery partner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND id IN (
      SELECT order_id
      FROM public.delivery
      WHERE partner_user_id = auth.uid()
         OR (
           public.normalized_phone(partner_phone) <> ''
           AND public.normalized_phone(partner_phone) = public.current_profile_phone()
         )
    )
  );

CREATE POLICY "Order items are viewable by assigned delivery partner"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND order_id IN (
      SELECT order_id
      FROM public.delivery
      WHERE partner_user_id = auth.uid()
         OR (
           public.normalized_phone(partner_phone) <> ''
           AND public.normalized_phone(partner_phone) = public.current_profile_phone()
         )
    )
  );

CREATE POLICY "Addresses are viewable by assigned delivery partner"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND id IN (
      SELECT o.address_id
      FROM public.orders o
      INNER JOIN public.delivery d ON d.order_id = o.id
      WHERE d.partner_user_id = auth.uid()
         OR (
           public.normalized_phone(d.partner_phone) <> ''
           AND public.normalized_phone(d.partner_phone) = public.current_profile_phone()
         )
    )
  );

NOTIFY pgrst, 'reload schema';
