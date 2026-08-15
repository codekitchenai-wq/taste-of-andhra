-- P0 architecture gates: org-scoped RLS, payment schema seams, audit, webhook idempotency.
-- Defaults keep Taste of Andhra working; unfinished modes stay disconnected / dark.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_org_delivery(target_org_id UUID)
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
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
        AND role = 'delivery'
    )
    OR (
      public.is_delivery()
      AND EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND is_active = TRUE
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.order_organization_id(p_order_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM public.orders WHERE id = p_order_id;
$$;

-- Re-seed legacy profile admins onto Taste of Andhra (safe if already present).
INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'restaurant_admin'::public.organization_member_role,
  TRUE
FROM public.profiles p
WHERE p.role = 'admin'
  AND COALESCE(p.is_active, TRUE) = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
      AND m.user_id = p.id
  );

INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'delivery'::public.organization_member_role,
  TRUE
FROM public.profiles p
WHERE p.role = 'delivery'
  AND COALESCE(p.is_active, TRUE) = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
      AND m.user_id = p.id
  );

-- ---------------------------------------------------------------------------
-- Payments enrichment
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'razorpay';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (payment_mode IN ('DIRECT', 'ROUTE'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.payments p
SET organization_id = o.organization_id
FROM public.orders o
WHERE p.order_id = o.id
  AND p.organization_id IS NULL;

-- Orphan safety: attach to Taste of Andhra if any remain
UPDATE public.payments
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_organization_id
  ON public.payments (organization_id);

CREATE INDEX IF NOT EXISTS idx_payments_organization_created
  ON public.payments (organization_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Organization payment configs (DIRECT default; ROUTE held)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay'
    CHECK (provider IN ('razorpay')),
  mode TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (mode IN ('DIRECT', 'ROUTE')),
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (
      status IN (
        'disconnected',
        'pending',
        'connected',
        'error',
        'disabled'
      )
    ),
  onboarding_status TEXT NOT NULL DEFAULT 'not_started',
  provider_account_reference TEXT,
  credential_reference TEXT,
  public_key_id TEXT,
  last_error TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_payment_configs_status
  ON public.organization_payment_configs (status);

DROP TRIGGER IF EXISTS set_organization_payment_configs_updated_at
  ON public.organization_payment_configs;
CREATE TRIGGER set_organization_payment_configs_updated_at
  BEFORE UPDATE ON public.organization_payment_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.organization_payment_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins read payment config"
  ON public.organization_payment_configs;
CREATE POLICY "Org admins read payment config"
  ON public.organization_payment_configs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Platform master manages payment config"
  ON public.organization_payment_configs;
CREATE POLICY "Platform master manages payment config"
  ON public.organization_payment_configs
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

INSERT INTO public.organization_payment_configs (
  organization_id,
  provider,
  mode,
  status,
  onboarding_status
)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'razorpay',
  'DIRECT',
  'disconnected',
  'not_started'
)
ON CONFLICT (organization_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Razorpay webhook idempotency
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT,
  payment_id UUID REFERENCES public.payments (id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT razorpay_webhook_events_provider_event_id_key UNIQUE (provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_org
  ON public.razorpay_webhook_events (organization_id);

ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform master reads razorpay webhook events"
  ON public.razorpay_webhook_events;
CREATE POLICY "Platform master reads razorpay webhook events"
  ON public.razorpay_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_master());

-- ---------------------------------------------------------------------------
-- Audit logs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform master reads audit logs"
  ON public.audit_logs;
CREATE POLICY "Platform master reads audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR (
      organization_id IS NOT NULL
      AND public.is_org_admin(organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Feature catalog gates (held / dark by default)
-- ---------------------------------------------------------------------------

INSERT INTO public.features (key, name, description, is_add_on, default_enabled, display_order)
VALUES
  ('payments_razorpay', 'Razorpay payments', 'Online food payments via Razorpay DIRECT', FALSE, TRUE, 75),
  ('payments_razorpay_route', 'Razorpay Route', 'Platform Route / linked accounts (held)', TRUE, FALSE, 76),
  ('whatsapp_embedded_signup', 'WhatsApp Embedded Signup', 'Meta Embedded Signup onboarding (held)', TRUE, FALSE, 115),
  ('whatsapp_usage_billing', 'WhatsApp usage billing', 'Charge tenants for WA usage (held)', TRUE, FALSE, 116),
  ('ai_assistant', 'AI assistant', 'AI order assistance (held)', TRUE, FALSE, 200)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_key)
SELECT 'b0000000-0000-4000-8000-000000000001'::uuid, 'payments_razorpay'
WHERE EXISTS (SELECT 1 FROM public.plans WHERE id = 'b0000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: tenant-owned tables → is_org_admin(organization_id)
-- ---------------------------------------------------------------------------

-- categories
DROP POLICY IF EXISTS "Active categories are viewable by everyone" ON public.categories;
CREATE POLICY "Active categories are viewable by everyone"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Categories are manageable by admin" ON public.categories;
CREATE POLICY "Categories are manageable by admin"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- dishes
DROP POLICY IF EXISTS "Available dishes are viewable by everyone" ON public.dishes;
CREATE POLICY "Available dishes are viewable by everyone"
  ON public.dishes
  FOR SELECT
  TO anon, authenticated
  USING (is_available = TRUE OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Dishes are manageable by admin" ON public.dishes;
CREATE POLICY "Dishes are manageable by admin"
  ON public.dishes
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- orders
DROP POLICY IF EXISTS "Orders are viewable by owner" ON public.orders;
CREATE POLICY "Orders are viewable by owner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_admin(organization_id)
    OR public.is_org_delivery(organization_id)
  );

DROP POLICY IF EXISTS "Orders are insertable by owner" ON public.orders;
CREATE POLICY "Orders are insertable by owner"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Orders are updatable by owner or admin" ON public.orders;
CREATE POLICY "Orders are updatable by owner or admin"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_admin(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Orders are manageable by admin" ON public.orders;
CREATE POLICY "Orders are manageable by admin"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- order_items (via order org)
DROP POLICY IF EXISTS "Order items are viewable by order owner" ON public.order_items;
CREATE POLICY "Order items are viewable by order owner"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    public.owns_order(order_id)
    OR public.is_org_admin(public.order_organization_id(order_id))
    OR public.is_org_delivery(public.order_organization_id(order_id))
  );

DROP POLICY IF EXISTS "Order items are insertable by order owner" ON public.order_items;
CREATE POLICY "Order items are insertable by order owner"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_order(order_id)
    OR public.is_org_admin(public.order_organization_id(order_id))
  );

DROP POLICY IF EXISTS "Order items are manageable by admin" ON public.order_items;
CREATE POLICY "Order items are manageable by admin"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(public.order_organization_id(order_id)))
  WITH CHECK (public.is_org_admin(public.order_organization_id(order_id)));

-- payments
DROP POLICY IF EXISTS "Payments are viewable by order owner" ON public.payments;
CREATE POLICY "Payments are viewable by order owner"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    public.owns_order(order_id)
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Payments are insertable by order owner" ON public.payments;
CREATE POLICY "Payments are insertable by order owner"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.owns_order(order_id)
      OR public.is_org_admin(organization_id)
    )
    AND organization_id = public.order_organization_id(order_id)
  );

DROP POLICY IF EXISTS "Payments are updatable by admin" ON public.payments;
CREATE POLICY "Payments are updatable by admin"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Payments are manageable by admin" ON public.payments;
CREATE POLICY "Payments are manageable by admin"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- offers
DROP POLICY IF EXISTS "Active offers are viewable by everyone" ON public.offers;
CREATE POLICY "Active offers are viewable by everyone"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      is_active = TRUE
      AND CURRENT_DATE >= start_date
      AND CURRENT_DATE <= end_date
    )
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Offers are manageable by admin" ON public.offers;
CREATE POLICY "Offers are manageable by admin"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- branches
DROP POLICY IF EXISTS "Active branches are publicly readable" ON public.branches;
CREATE POLICY "Active branches are publicly readable"
  ON public.branches
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Branches are manageable by admin" ON public.branches;
CREATE POLICY "Branches are manageable by admin"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- party_inquiries
DROP POLICY IF EXISTS "Admins can view party inquiries" ON public.party_inquiries;
CREATE POLICY "Admins can view party inquiries"
  ON public.party_inquiries
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can update party inquiries" ON public.party_inquiries;
CREATE POLICY "Admins can update party inquiries"
  ON public.party_inquiries
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- delivery_partners
DROP POLICY IF EXISTS "Delivery partners are viewable by admin" ON public.delivery_partners;
DROP POLICY IF EXISTS "Delivery partners manageable by admin" ON public.delivery_partners;
DROP POLICY IF EXISTS "Admins manage delivery partners" ON public.delivery_partners;

DO $$
BEGIN
  -- Recreate common policy names used across migrations
  EXECUTE $p$
    DROP POLICY IF EXISTS "delivery_partners_select_admin" ON public.delivery_partners;
    DROP POLICY IF EXISTS "delivery_partners_all_admin" ON public.delivery_partners;
  $p$;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "Delivery partners are manageable by org admin" ON public.delivery_partners;
CREATE POLICY "Delivery partners are manageable by org admin"
  ON public.delivery_partners
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Delivery partners are viewable by org staff" ON public.delivery_partners;
CREATE POLICY "Delivery partners are viewable by org staff"
  ON public.delivery_partners
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR public.is_org_delivery(organization_id)
  );

-- delivery_settings / quotes
DROP POLICY IF EXISTS "Delivery settings are viewable by everyone" ON public.delivery_settings;
DROP POLICY IF EXISTS "Delivery settings are manageable by admin" ON public.delivery_settings;
DROP POLICY IF EXISTS "Delivery settings are manageable by org admin" ON public.delivery_settings;
CREATE POLICY "Delivery settings are viewable by everyone"
  ON public.delivery_settings
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
CREATE POLICY "Delivery settings are manageable by org admin"
  ON public.delivery_settings
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Delivery quotes are viewable by owner or admin" ON public.delivery_quotes;
DROP POLICY IF EXISTS "Delivery quotes are manageable by admin" ON public.delivery_quotes;
DROP POLICY IF EXISTS "Delivery quotes are manageable by org admin" ON public.delivery_quotes;
CREATE POLICY "Delivery quotes are viewable by owner or admin"
  ON public.delivery_quotes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_admin(organization_id)
  );
-- Writes remain service-role only (Edge Functions).

-- qr_tables
DROP POLICY IF EXISTS "QR tables are manageable by admin" ON public.qr_tables;
DROP POLICY IF EXISTS "QR tables publicly readable when active" ON public.qr_tables;
DROP POLICY IF EXISTS "Active QR tables are publicly readable" ON public.qr_tables;

CREATE POLICY "QR tables are manageable by org admin"
  ON public.qr_tables
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Active QR tables are publicly readable"
  ON public.qr_tables
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_org_admin(organization_id));

-- gst_invoices
DROP POLICY IF EXISTS "GST invoices are viewable by order owner or admin" ON public.gst_invoices;
CREATE POLICY "GST invoices are viewable by order owner or admin"
  ON public.gst_invoices
  FOR SELECT
  TO authenticated
  USING (
    public.owns_order(order_id)
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "GST invoices are insertable by admin or order owner" ON public.gst_invoices;
CREATE POLICY "GST invoices are insertable by admin or order owner"
  ON public.gst_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_order(order_id)
    OR public.is_org_admin(organization_id)
  );

-- app_settings
DROP POLICY IF EXISTS "App settings are manageable by admin" ON public.app_settings;
DROP POLICY IF EXISTS "App settings are viewable by authenticated" ON public.app_settings;
DROP POLICY IF EXISTS "App settings readable by admin" ON public.app_settings;
DROP POLICY IF EXISTS "App settings are manageable by org admin" ON public.app_settings;
CREATE POLICY "App settings are viewable by authenticated"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
CREATE POLICY "App settings are manageable by org admin"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- modifiers
DROP POLICY IF EXISTS "Active modifier groups are viewable by everyone" ON public.modifier_groups;
CREATE POLICY "Active modifier groups are viewable by everyone"
  ON public.modifier_groups
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Modifier groups are manageable by admin" ON public.modifier_groups;
CREATE POLICY "Modifier groups are manageable by admin"
  ON public.modifier_groups
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Available modifiers are viewable by everyone" ON public.modifiers;
CREATE POLICY "Available modifiers are viewable by everyone"
  ON public.modifiers
  FOR SELECT
  TO anon, authenticated
  USING (is_available = TRUE OR public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Modifiers are manageable by admin" ON public.modifiers;
CREATE POLICY "Modifiers are manageable by admin"
  ON public.modifiers
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Dish modifier groups are manageable by admin" ON public.dish_modifier_groups;
CREATE POLICY "Dish modifier groups are manageable by admin"
  ON public.dish_modifier_groups
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- delivery rows scoped via order org
DROP POLICY IF EXISTS "Delivery records are viewable by admin and delivery partners"
  ON public.delivery;
DROP POLICY IF EXISTS "Delivery is viewable by order owner" ON public.delivery;
DROP POLICY IF EXISTS "Delivery is viewable by assigned partner user" ON public.delivery;
CREATE POLICY "Delivery records are viewable by admin and delivery partners"
  ON public.delivery
  FOR SELECT
  TO authenticated
  USING (
    public.owns_order(order_id)
    OR public.is_org_admin(public.order_organization_id(order_id))
    OR (
      public.is_org_delivery(public.order_organization_id(order_id))
      AND (
        partner_user_id = auth.uid()
        OR partner_phone = (
          SELECT phone FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Delivery records are insertable by admin" ON public.delivery;
CREATE POLICY "Delivery records are insertable by admin"
  ON public.delivery
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(public.order_organization_id(order_id)));

DROP POLICY IF EXISTS "Delivery status is updatable by admin or assigned partner"
  ON public.delivery;
CREATE POLICY "Delivery status is updatable by admin or assigned partner"
  ON public.delivery
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_admin(public.order_organization_id(order_id))
    OR (
      public.is_org_delivery(public.order_organization_id(order_id))
      AND partner_phone = (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_org_admin(public.order_organization_id(order_id))
    OR (
      public.is_org_delivery(public.order_organization_id(order_id))
      AND partner_phone = (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Delivery records are manageable by admin" ON public.delivery;
CREATE POLICY "Delivery records are manageable by admin"
  ON public.delivery
  FOR ALL
  TO authenticated
  USING (public.is_org_admin(public.order_organization_id(order_id)))
  WITH CHECK (public.is_org_admin(public.order_organization_id(order_id)));

-- ---------------------------------------------------------------------------
-- Isolation probe (callable in SQL tests; service role / postgres)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_org_admin_isolation(
  p_org_a UUID,
  p_org_b UUID
)
RETURNS TABLE (check_name TEXT, passed BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'orgs_distinct'::text,
    (p_org_a IS DISTINCT FROM p_org_b),
    'organization ids must differ'::text;

  RETURN QUERY
  SELECT
    'is_org_admin_fn_exists'::text,
    EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'is_org_admin'
    ),
    'is_org_admin helper'::text;

  RETURN QUERY
  SELECT
    'payments_have_organization_id'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'organization_id'
    ),
    'payments.organization_id column'::text;

  RETURN QUERY
  SELECT
    'payment_configs_table'::text,
    to_regclass('public.organization_payment_configs') IS NOT NULL,
    'organization_payment_configs exists'::text;
END;
$$;

COMMENT ON FUNCTION public.assert_org_admin_isolation(UUID, UUID) IS
  'Structural isolation checks for P0 architecture gates.';
