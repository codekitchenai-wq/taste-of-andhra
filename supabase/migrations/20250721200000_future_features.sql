-- Future features: branches, favorites, loyalty, notifications, GST invoices,
-- QR tables, delivery GPS + partner user link

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------

CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  gstin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  opening_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_branches_one_default
  ON public.branches (is_default)
  WHERE is_default = TRUE;

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.branches (
  name, slug, phone, email, address_line1, city, state, pincode,
  gstin, is_active, is_default, opening_hours, latitude, longitude
) VALUES (
  'CV Raman Nagar',
  'cv-raman-nagar',
  '+91 98765 43210',
  'thetasteofandhra@gmail.com',
  'D 304 Harsha Pride, 6 Cross Kaggadaspura, CV Raman Nagar',
  'Bangalore',
  'Karnataka',
  '560093',
  '29AABCT1332L1ZV',
  TRUE,
  TRUE,
  'Mon–Fri 11:00 AM – 11:00 PM · Sat–Sun 10:00 AM – 11:30 PM',
  12.9854,
  77.6632
);

ALTER TABLE public.orders
  ADD COLUMN branch_id UUID REFERENCES public.branches (id) ON DELETE RESTRICT;

ALTER TABLE public.dishes
  ADD COLUMN branch_id UUID REFERENCES public.branches (id) ON DELETE SET NULL;

UPDATE public.orders o
SET branch_id = b.id
FROM public.branches b
WHERE b.is_default = TRUE
  AND o.branch_id IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN branch_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dish_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites (user_id);
CREATE INDEX idx_favorites_dish_id ON public.favorites (dish_id);

-- ---------------------------------------------------------------------------
-- Loyalty
-- ---------------------------------------------------------------------------

CREATE TABLE public.loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_loyalty_accounts_updated_at
  BEFORE UPDATE ON public.loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.loyalty_accounts (id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('earn', 'redeem', 'adjust')
  ),
  order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_account_id
  ON public.loyalty_transactions (account_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

CREATE TYPE public.notification_channel AS ENUM (
  'in_app',
  'email',
  'sms',
  'whatsapp'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  notification_type TEXT NOT NULL DEFAULT 'general',
  order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE is_read = FALSE;

-- ---------------------------------------------------------------------------
-- GST invoices
-- ---------------------------------------------------------------------------

CREATE TABLE public.gst_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders (id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES public.branches (id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,
  gstin TEXT NOT NULL,
  taxable_amount NUMERIC(10, 2) NOT NULL CHECK (taxable_amount >= 0),
  cgst NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  sgst NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (sgst >= 0),
  igst NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (igst >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gst_invoices_order_id ON public.gst_invoices (order_id);

-- ---------------------------------------------------------------------------
-- QR menu tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.qr_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  table_code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_tables_branch_id ON public.qr_tables (branch_id);

-- ---------------------------------------------------------------------------
-- Delivery GPS + partner profile link
-- ---------------------------------------------------------------------------

ALTER TABLE public.delivery
  ADD COLUMN partner_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN current_lat NUMERIC,
  ADD COLUMN current_lng NUMERIC,
  ADD COLUMN location_updated_at TIMESTAMPTZ;

CREATE INDEX idx_delivery_partner_user_id ON public.delivery (partner_user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tables ENABLE ROW LEVEL SECURITY;

-- Branches: public read active; admin manage
CREATE POLICY "Active branches are publicly readable"
  ON public.branches
  FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Branches are manageable by admin"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Favorites
CREATE POLICY "Favorites are viewable by owner"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Favorites are insertable by owner"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Favorites are deletable by owner"
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Loyalty
CREATE POLICY "Loyalty accounts are viewable by owner"
  ON public.loyalty_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Loyalty accounts are insertable by owner"
  ON public.loyalty_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Loyalty accounts are updatable by owner or admin"
  ON public.loyalty_accounts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Loyalty transactions are viewable by owner"
  ON public.loyalty_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR account_id IN (
      SELECT id FROM public.loyalty_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Loyalty transactions are insertable by owner or admin"
  ON public.loyalty_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR account_id IN (
      SELECT id FROM public.loyalty_accounts WHERE user_id = auth.uid()
    )
  );

-- Notifications
CREATE POLICY "Notifications are viewable by owner"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Notifications are insertable by authenticated"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_delivery()
  );

CREATE POLICY "Notifications are updatable by owner"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Notifications are deletable by owner or admin"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- GST invoices
CREATE POLICY "GST invoices are viewable by order owner or admin"
  ON public.gst_invoices
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "GST invoices are insertable by admin or order owner"
  ON public.gst_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- QR tables: public read active
CREATE POLICY "Active QR tables are publicly readable"
  ON public.qr_tables
  FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "QR tables are manageable by admin"
  ON public.qr_tables
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customers can view delivery for their own orders (live GPS)
CREATE POLICY "Delivery is viewable by order owner"
  ON public.delivery
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Delivery partners matched by partner_user_id
CREATE POLICY "Delivery is viewable by assigned partner user"
  ON public.delivery
  FOR SELECT
  TO authenticated
  USING (
    public.is_delivery()
    AND partner_user_id = auth.uid()
  );

CREATE POLICY "Delivery is updatable by assigned partner user"
  ON public.delivery
  FOR UPDATE
  TO authenticated
  USING (
    public.is_delivery()
    AND partner_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_delivery()
    AND partner_user_id = auth.uid()
  );

-- Allow delivery partners to read orders assigned to them
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
         OR partner_phone = (
           SELECT phone FROM public.profiles WHERE id = auth.uid()
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
         OR partner_phone = (
           SELECT phone FROM public.profiles WHERE id = auth.uid()
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
         OR d.partner_phone = (
           SELECT phone FROM public.profiles WHERE id = auth.uid()
         )
    )
  );

-- Enable Realtime for live GPS tracking
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Award loyalty points (callable by delivery partners / admin after deliver)
CREATE OR REPLACE FUNCTION public.award_loyalty_for_order(
  p_user_id UUID,
  p_order_id UUID,
  p_order_total NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_account_id UUID;
BEGIN
  v_points := FLOOR(p_order_total)::INTEGER;
  IF v_points <= 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.loyalty_transactions lt
    INNER JOIN public.loyalty_accounts la ON la.id = lt.account_id
    WHERE lt.order_id = p_order_id
      AND lt.transaction_type = 'earn'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_account_id
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (
    account_id, points, transaction_type, order_id, note
  ) VALUES (
    v_account_id,
    v_points,
    'earn',
    p_order_id,
    'Earned ' || v_points || ' points for order'
  );

  UPDATE public.loyalty_accounts
  SET
    points_balance = points_balance + v_points,
    lifetime_earned = lifetime_earned + v_points
  WHERE id = v_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_loyalty_for_order(UUID, UUID, NUMERIC)
  TO authenticated;
