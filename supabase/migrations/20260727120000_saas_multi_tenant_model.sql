-- SaaS multi-tenant domain model (Phase 1 foundation + Phase 3 catalog)
-- Based on docs/SAAS_MULTI_TENANT_ARCHITECTURE.md §4 Domain model
--
-- Creates: organizations, organization_members, features, plans, plan_features,
--          subscriptions, organization_entitlements
-- Adds organization_id to tenant-owned tables and backfills Taste of Andhra.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.organization_status AS ENUM (
  'active',
  'trialing',
  'suspended',
  'cancelled'
);

CREATE TYPE public.organization_member_role AS ENUM (
  'restaurant_owner',
  'restaurant_admin',
  'delivery'
);

CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'suspended'
);

CREATE TYPE public.entitlement_source AS ENUM (
  'plan',
  'addon',
  'manual'
);

-- Platform master is separate from restaurant admin (do not reuse global admin).
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';

-- ---------------------------------------------------------------------------
-- Organizations (tenants)
-- ---------------------------------------------------------------------------

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status public.organization_status NOT NULL DEFAULT 'trialing',
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  tagline TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  gstin TEXT,
  fssai_license TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_status ON public.organizations (status);

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Organization members
-- ---------------------------------------------------------------------------

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.organization_member_role NOT NULL DEFAULT 'restaurant_admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_organization_members_user_id
  ON public.organization_members (user_id);

CREATE INDEX idx_organization_members_org_role
  ON public.organization_members (organization_id, role)
  WHERE is_active = TRUE;

CREATE TRIGGER set_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Feature catalog, plans, entitlements, subscriptions
-- ---------------------------------------------------------------------------

CREATE TABLE public.features (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_add_on BOOLEAN NOT NULL DEFAULT FALSE,
  default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_monthly >= 0),
  price_yearly NUMERIC(10, 2) CHECK (price_yearly IS NULL OR price_yearly >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans (id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES public.features (key) ON DELETE CASCADE,
  UNIQUE (plan_id, feature_key)
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans (id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  provider TEXT,
  provider_ref TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_subscriptions_one_active_per_org
  ON public.subscriptions (organization_id)
  WHERE status IN ('trialing', 'active', 'past_due');

CREATE INDEX idx_subscriptions_status_period
  ON public.subscriptions (status, current_period_end);

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.organization_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES public.features (key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  source public.entitlement_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, feature_key)
);

CREATE TRIGGER set_organization_entitlements_updated_at
  BEFORE UPDATE ON public.organization_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: Taste of Andhra = tenant #1
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (
  id,
  name,
  slug,
  status,
  branding,
  tagline,
  description,
  phone,
  email,
  address,
  opening_hours,
  gstin,
  fssai_license
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'The Taste of Andhra',
  'taste-of-andhra',
  'active',
  jsonb_build_object(
    'logo_url', NULL,
    'primary_color', NULL
  ),
  'Authentic Andhra Cuisine',
  'Experience the rich flavors of Andhra Pradesh — order online for delivery or pickup.',
  '+91 98765 43210',
  'thetasteofandhra@gmail.com',
  'D 304 Harsha Pride, 6 Cross Kaggadaspura, CV Raman Nagar, Bangalore, 560093',
  jsonb_build_object(
    'weekdays', '11:00 AM – 11:00 PM',
    'weekends', '10:00 AM – 11:30 PM'
  ),
  '29AABCT1332L1ZV',
  NULL
);

-- Map existing global admins → restaurant_owner for tenant #1
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'restaurant_owner'::public.organization_member_role
FROM public.profiles p
WHERE p.role = 'admin'
  AND p.is_active = TRUE
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Map existing delivery users → delivery membership for tenant #1
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'delivery'::public.organization_member_role
FROM public.profiles p
WHERE p.role = 'delivery'
  AND p.is_active = TRUE
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: feature catalog (coarse modules)
-- ---------------------------------------------------------------------------

INSERT INTO public.features (key, name, description, is_add_on, default_enabled, display_order) VALUES
  ('menu', 'Menu', 'Categories and dishes', FALSE, TRUE, 10),
  ('orders', 'Orders', 'Orders and dashboard', FALSE, TRUE, 20),
  ('customers', 'Customers', 'Customer directory', FALSE, TRUE, 30),
  ('offers', 'Offers', 'Coupons and promotions', FALSE, TRUE, 40),
  ('reports', 'Reports', 'Sales and ops reports', FALSE, TRUE, 50),
  ('settings', 'Settings', 'Brand, GST, FSSAI, hours', FALSE, TRUE, 60),
  ('delivery_own', 'Own delivery', 'In-house delivery partners', FALSE, TRUE, 70),
  ('branches', 'Multi-branch', 'Multiple locations', TRUE, FALSE, 80),
  ('qr_tables', 'QR tables', 'Table QR ordering', TRUE, FALSE, 90),
  ('party_inquiries', 'Party inquiries', 'Catering / party leads', TRUE, FALSE, 100),
  ('delivery_pidge', 'Pidge delivery', 'Pidge logistics provider', TRUE, FALSE, 110),
  ('loyalty', 'Loyalty', 'Points and rewards', TRUE, FALSE, 120);

INSERT INTO public.plans (id, code, name, description, price_monthly, is_active)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'starter',
  'Starter',
  'Base restaurant operations for a single location',
  0,
  TRUE
);

-- Starter plan includes all base (non add-on) features
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT 'b0000000-0000-4000-8000-000000000001'::uuid, f.key
FROM public.features f
WHERE f.is_add_on = FALSE;

-- Active subscription for Taste of Andhra (pilot / first tenant)
INSERT INTO public.subscriptions (
  organization_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  provider,
  provider_ref
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  'manual',
  'pilot-taste-of-andhra'
);

-- Explicit entitlements for add-ons already used by Taste of Andhra
INSERT INTO public.organization_entitlements (organization_id, feature_key, enabled, source, notes)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'branches', TRUE, 'manual', 'Pilot: multi-location enabled'),
  ('a0000000-0000-4000-8000-000000000001', 'qr_tables', TRUE, 'manual', 'Pilot: QR tables enabled'),
  ('a0000000-0000-4000-8000-000000000001', 'party_inquiries', TRUE, 'manual', 'Pilot: party inquiries enabled'),
  ('a0000000-0000-4000-8000-000000000001', 'delivery_pidge', TRUE, 'manual', 'Pilot: Pidge enabled');

-- ---------------------------------------------------------------------------
-- Add organization_id to tenant-owned tables + backfill
-- ---------------------------------------------------------------------------

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.party_inquiries
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.delivery_quotes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.qr_tables
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.gst_invoices
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

-- Backfill all existing rows to Taste of Andhra
UPDATE public.categories SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.dishes SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.orders SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.offers SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.branches SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.party_inquiries SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.delivery_partners SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.delivery_settings SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.delivery_quotes SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.qr_tables SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.gst_invoices SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE public.app_settings SET organization_id = 'a0000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;

-- Require organization_id going forward
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.dishes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.offers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.branches ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.party_inquiries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.delivery_partners ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.delivery_settings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.delivery_quotes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.qr_tables ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.gst_invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN organization_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Composite uniqueness (per organization)
-- ---------------------------------------------------------------------------

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_org_slug
  ON public.categories (organization_id, slug);

ALTER TABLE public.dishes DROP CONSTRAINT IF EXISTS dishes_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dishes_org_slug
  ON public.dishes (organization_id, slug);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_org_order_number
  ON public.orders (organization_id, order_number);

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_coupon_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_org_coupon_code
  ON public.offers (organization_id, coupon_code)
  WHERE coupon_code IS NOT NULL;

ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_org_slug
  ON public.branches (organization_id, slug);

DROP INDEX IF EXISTS public.idx_branches_one_default;
CREATE UNIQUE INDEX idx_branches_one_default_per_org
  ON public.branches (organization_id)
  WHERE is_default = TRUE;

ALTER TABLE public.delivery_partners DROP CONSTRAINT IF EXISTS delivery_partners_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_partners_org_phone
  ON public.delivery_partners (organization_id, phone);

ALTER TABLE public.qr_tables DROP CONSTRAINT IF EXISTS qr_tables_table_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_tables_org_table_code
  ON public.qr_tables (organization_id, table_code);

ALTER TABLE public.gst_invoices DROP CONSTRAINT IF EXISTS gst_invoices_invoice_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gst_invoices_org_invoice_number
  ON public.gst_invoices (organization_id, invoice_number);

-- app_settings: key is global PK today → make composite with organization_id
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_pkey PRIMARY KEY (organization_id, key);

CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON public.categories (organization_id);
CREATE INDEX IF NOT EXISTS idx_dishes_organization_id ON public.dishes (organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_offers_organization_id ON public.offers (organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON public.branches (organization_id);
CREATE INDEX IF NOT EXISTS idx_party_inquiries_organization_id ON public.party_inquiries (organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_organization_id ON public.delivery_partners (organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_organization_id ON public.delivery_settings (organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_quotes_organization_id ON public.delivery_quotes (organization_id);

-- ---------------------------------------------------------------------------
-- Membership / entitlement helpers (SECURITY DEFINER for RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'platform_master'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
        AND role IN ('restaurant_owner', 'restaurant_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
        AND role = 'restaurant_owner'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_delivery(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
        AND role = 'delivery'
    );
$$;

CREATE OR REPLACE FUNCTION public.org_subscription_active(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = target_org_id
      AND s.status IN ('trialing', 'active')
      AND s.current_period_end > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_feature(target_org_id UUID, feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN NOT public.org_subscription_active(target_org_id) THEN FALSE
      WHEN EXISTS (
        SELECT 1
        FROM public.organization_entitlements oe
        WHERE oe.organization_id = target_org_id
          AND oe.feature_key = has_feature.feature_key
      ) THEN (
        SELECT oe.enabled
        FROM public.organization_entitlements oe
        WHERE oe.organization_id = target_org_id
          AND oe.feature_key = has_feature.feature_key
      )
      WHEN EXISTS (
        SELECT 1
        FROM public.features f
        WHERE f.key = has_feature.feature_key
          AND f.default_enabled = TRUE
      ) THEN TRUE
      WHEN EXISTS (
        SELECT 1
        FROM public.subscriptions s
        JOIN public.plan_features pf ON pf.plan_id = s.plan_id
        WHERE s.organization_id = target_org_id
          AND s.status IN ('trialing', 'active', 'past_due')
          AND pf.feature_key = has_feature.feature_key
      ) THEN TRUE
      ELSE FALSE
    END;
$$;

-- Keep is_admin() working during migration: global admin OR org admin of any org
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ---------------------------------------------------------------------------
-- RLS on new SaaS tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "Members can read their organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_member(id)
  );

CREATE POLICY "Public can read active organizations by slug"
  ON public.organizations
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'trialing'));

CREATE POLICY "Platform master manages organizations"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

CREATE POLICY "Org admins can update their organization"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

-- Organization members
CREATE POLICY "Members can read org membership"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR user_id = auth.uid()
    OR public.is_org_admin(organization_id)
  );

CREATE POLICY "Platform master manages membership"
  ON public.organization_members
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

CREATE POLICY "Org owners manage membership"
  ON public.organization_members
  FOR ALL
  TO authenticated
  USING (public.is_org_owner(organization_id))
  WITH CHECK (public.is_org_owner(organization_id));

-- Features / plans (catalog readable by authenticated; master writes)
CREATE POLICY "Features are readable by authenticated"
  ON public.features
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Platform master manages features"
  ON public.features
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

CREATE POLICY "Active plans are readable by authenticated"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR public.is_platform_master());

CREATE POLICY "Platform master manages plans"
  ON public.plans
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

CREATE POLICY "Plan features are readable by authenticated"
  ON public.plan_features
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Platform master manages plan features"
  ON public.plan_features
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

-- Subscriptions
CREATE POLICY "Org admins can read their subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

CREATE POLICY "Platform master manages subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

-- Entitlements
CREATE POLICY "Org admins can read their entitlements"
  ON public.organization_entitlements
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

CREATE POLICY "Platform master manages entitlements"
  ON public.organization_entitlements
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());
