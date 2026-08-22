-- FSSAI certificate fingerprint for duplicate detection (Website Starter intake).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS fssai_certificate_hash text;

CREATE INDEX IF NOT EXISTS organizations_fssai_license_idx
  ON public.organizations (fssai_license)
  WHERE fssai_license IS NOT NULL AND btrim(fssai_license) <> '';

CREATE INDEX IF NOT EXISTS organizations_fssai_certificate_hash_idx
  ON public.organizations (fssai_certificate_hash)
  WHERE fssai_certificate_hash IS NOT NULL AND btrim(fssai_certificate_hash) <> '';

COMMENT ON COLUMN public.organizations.fssai_certificate_hash IS
  'SHA-256 hex of uploaded FSSAI certificate file for duplicate detection.';
