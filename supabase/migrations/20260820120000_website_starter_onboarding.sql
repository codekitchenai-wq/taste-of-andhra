-- Website Starter onboarding (isolated from existing starter/Growth tenants).
-- Additive only: new plan, columns, tables. Does not alter ToA / Chopsticks entitlements.

-- ---------------------------------------------------------------------------
-- Organization compliance + onboarding columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS fssai_valid_until date,
  ADD COLUMN IF NOT EXISTS fssai_certificate_url text,
  ADD COLUMN IF NOT EXISTS onboarding_status text;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_onboarding_status_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_onboarding_status_check
  CHECK (
    onboarding_status IS NULL
    OR onboarding_status IN (
      'intake',
      'pending_setup',
      'pending_review',
      'live',
      'rejected'
    )
  );

COMMENT ON COLUMN public.organizations.legal_name IS
  'FSSAI legal business name — immutable to restaurant admins; Master may correct OCR.';
COMMENT ON COLUMN public.organizations.fssai_valid_until IS
  'FSSAI licence expiry date.';
COMMENT ON COLUMN public.organizations.fssai_certificate_url IS
  'Public or signed URL to uploaded FSSAI certificate image/PDF.';
COMMENT ON COLUMN public.organizations.onboarding_status IS
  'Website-starter assisted onboarding state; NULL for legacy tenants.';

-- ---------------------------------------------------------------------------
-- Feature + website_starter plan (new restaurants only)
-- ---------------------------------------------------------------------------

INSERT INTO public.features (key, name, description, is_add_on, default_enabled, display_order)
VALUES
  (
    'ai_menu_import',
    'AI menu import',
    'Parse menu photos/PDF into categories and dishes (review required)',
    TRUE,
    FALSE,
    210
  )
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_add_on = EXCLUDED.is_add_on,
  default_enabled = EXCLUDED.default_enabled,
  display_order = EXCLUDED.display_order;

INSERT INTO public.plans (id, code, name, description, price_monthly, price_yearly, is_active)
VALUES (
  'b0000000-0000-4000-8000-000000000010',
  'website_starter',
  'Website Starter',
  'Free digital website + menu (no online ordering). New restaurants only.',
  0,
  0,
  TRUE
)
ON CONFLICT (id) DO UPDATE
SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  is_active = EXCLUDED.is_active;

-- Website starter: menu + settings + AI menu import only (no orders/payments)
DELETE FROM public.plan_features
WHERE plan_id = 'b0000000-0000-4000-8000-000000000010';

INSERT INTO public.plan_features (plan_id, feature_key)
VALUES
  ('b0000000-0000-4000-8000-000000000010', 'menu'),
  ('b0000000-0000-4000-8000-000000000010', 'settings'),
  ('b0000000-0000-4000-8000-000000000010', 'ai_menu_import')
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Onboarding invites (setup magic link token)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.onboarding_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  owner_email text,
  owner_phone text,
  temporary_password text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_invites_org_idx
  ON public.onboarding_invites (organization_id);

CREATE INDEX IF NOT EXISTS onboarding_invites_token_idx
  ON public.onboarding_invites (token);

ALTER TABLE public.onboarding_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_invites_master_all ON public.onboarding_invites;
CREATE POLICY onboarding_invites_master_all
  ON public.onboarding_invites
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

DROP POLICY IF EXISTS onboarding_invites_anon_read_token ON public.onboarding_invites;
CREATE POLICY onboarding_invites_anon_read_token
  ON public.onboarding_invites
  FOR SELECT
  TO anon, authenticated
  USING (
    consumed_at IS NULL
    AND expires_at > now()
  );

-- ---------------------------------------------------------------------------
-- Menu import jobs (AI / manual draft → apply)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.menu_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'parsing', 'ready', 'failed', 'applied')),
  source_paths text[] NOT NULL DEFAULT '{}',
  draft_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_import_jobs_org_idx
  ON public.menu_import_jobs (organization_id, created_at DESC);

ALTER TABLE public.menu_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_import_jobs_master_all ON public.menu_import_jobs;
CREATE POLICY menu_import_jobs_master_all
  ON public.menu_import_jobs
  FOR ALL
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());

DROP POLICY IF EXISTS menu_import_jobs_org_member ON public.menu_import_jobs;
CREATE POLICY menu_import_jobs_org_member
  ON public.menu_import_jobs
  FOR ALL
  TO authenticated
  USING (
    public.is_org_member(organization_id)
    OR public.is_platform_master()
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    OR public.is_platform_master()
  );

-- ---------------------------------------------------------------------------
-- Slug availability helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.suggest_organization_slug(
  proposed_name text,
  city text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := lower(trim(both '-' FROM regexp_replace(
    regexp_replace(coalesce(proposed_name, ''), '[^\w\s-]', '', 'g'),
    '\s+',
    '-',
    'g'
  )));
  IF base IS NULL OR base = '' THEN
    base := 'restaurant';
  END IF;

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations o WHERE o.slug = candidate) LOOP
    n := n + 1;
    IF n = 1 AND city IS NOT NULL AND length(trim(city)) > 0 THEN
      candidate := base || '-' || lower(regexp_replace(trim(city), '[^\w]+', '', 'g'));
    ELSE
      candidate := base || '-' || n::text;
    END IF;
    IF n > 50 THEN
      candidate := base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      EXIT;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.suggest_organization_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggest_organization_slug(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_organization_slug_available(candidate text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.slug = lower(trim(candidate))
  );
$$;

REVOKE ALL ON FUNCTION public.is_organization_slug_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_slug_available(text) TO anon, authenticated;
