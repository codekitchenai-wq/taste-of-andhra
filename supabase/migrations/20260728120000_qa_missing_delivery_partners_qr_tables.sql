-- Idempotent catch-up for objects still missing on some remote projects.
-- Safe to re-run. Does not replace full historical migrations.

-- ---------------------------------------------------------------------------
-- delivery_partners
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phone)
);

CREATE INDEX IF NOT EXISTS idx_delivery_partners_is_active
  ON public.delivery_partners (is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_delivery_partners_updated_at'
  ) THEN
    CREATE TRIGGER set_delivery_partners_updated_at
      BEFORE UPDATE ON public.delivery_partners
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delivery partners are manageable by admin"
  ON public.delivery_partners;
CREATE POLICY "Delivery partners are manageable by admin"
  ON public.delivery_partners
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- qr_tables (requires branches)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.qr_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  table_code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_tables_branch_id ON public.qr_tables (branch_id);

ALTER TABLE public.qr_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active QR tables are publicly readable" ON public.qr_tables;
CREATE POLICY "Active QR tables are publicly readable"
  ON public.qr_tables
  FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "QR tables are manageable by admin" ON public.qr_tables;
CREATE POLICY "QR tables are manageable by admin"
  ON public.qr_tables
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
