-- Public Website Starter request audit + stronger FSSAI uniqueness.

CREATE TABLE IF NOT EXISTS public.starter_public_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  restaurant_name text NOT NULL,
  owner_name text,
  owner_email text NOT NULL,
  owner_phone text NOT NULL,
  fssai_license text NOT NULL,
  city text,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'resumed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS starter_public_requests_created_at_idx
  ON public.starter_public_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS starter_public_requests_fssai_idx
  ON public.starter_public_requests (fssai_license);

COMMENT ON TABLE public.starter_public_requests IS
  'Audit log of public Website Starter form submissions (FSSAI-gated).';

ALTER TABLE public.starter_public_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS starter_public_requests_master_select
  ON public.starter_public_requests;
CREATE POLICY starter_public_requests_master_select
  ON public.starter_public_requests
  FOR SELECT
  TO authenticated
  USING (public.is_platform_master());

-- One org per FSSAI licence when data is clean; skip if duplicates already exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE fssai_license IS NOT NULL
      AND btrim(fssai_license) <> ''
    GROUP BY fssai_license
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Skipping organizations_fssai_license_unique_idx — duplicate licences present';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS organizations_fssai_license_unique_idx
      ON public.organizations (fssai_license)
      WHERE fssai_license IS NOT NULL AND btrim(fssai_license) <> '';
  END IF;
END $$;
