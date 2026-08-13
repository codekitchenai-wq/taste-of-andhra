-- Allow skipping homepage at onboard; Master can add or change it later.

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_homepage_mode_check;

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
