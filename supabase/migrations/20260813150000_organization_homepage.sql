-- Per-tenant public homepage: platform subdomain, custom domain, or any link.
-- Slug stays the internal tenant key; homepage_url is what customers are given.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS homepage_mode TEXT NOT NULL DEFAULT 'platform_subdomain',
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS homepage_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_homepage_mode_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_homepage_mode_check
      CHECK (
        homepage_mode IN (
          'platform_subdomain',
          'custom_domain',
          'external_link',
          'set_later'
        )
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_custom_domain_unique
  ON public.organizations (lower(custom_domain))
  WHERE custom_domain IS NOT NULL AND btrim(custom_domain) <> '';

COMMENT ON COLUMN public.organizations.homepage_mode IS
  'How the public restaurant home is assigned: platform subdomain, custom domain, external URL, or set later.';
COMMENT ON COLUMN public.organizations.custom_domain IS
  'Hostname only (e.g. order.chopsticks.com). Used when homepage_mode = custom_domain.';
COMMENT ON COLUMN public.organizations.homepage_url IS
  'Full public URL shared with customers (subdomain, custom domain, or any https link).';

UPDATE public.organizations
SET
  homepage_mode = 'custom_domain',
  custom_domain = 'www.thetasteofandhra.com',
  homepage_url = 'https://www.thetasteofandhra.com'
WHERE id = 'a0000000-0000-4000-8000-000000000001'
  AND (homepage_url IS NULL OR homepage_url = '');
