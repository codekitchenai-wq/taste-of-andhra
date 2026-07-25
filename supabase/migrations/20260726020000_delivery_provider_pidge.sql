-- Third-party delivery provider support (Pidge) with per-branch service areas
-- and checkout-time shipping quotes.
--
-- Quotes are written by the pidge-quote Edge Function using the service role so
-- the price a customer is charged cannot be set from the browser. Order
-- creation reads the stored quote back instead of trusting a client value.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Per-branch delivery configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID UNIQUE REFERENCES public.branches (id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'own' CHECK (provider IN ('own', 'pidge')),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  service_pincodes TEXT[] NOT NULL DEFAULT '{}',
  max_distance_km NUMERIC CHECK (max_distance_km IS NULL OR max_distance_km > 0),
  markup_flat NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (markup_flat >= 0),
  markup_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (markup_percent >= 0),
  fallback_charge NUMERIC(10, 2) NOT NULL DEFAULT 49 CHECK (fallback_charge >= 0),
  free_delivery_threshold NUMERIC(10, 2)
    CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold >= 0),
  quote_ttl_seconds INTEGER NOT NULL DEFAULT 900 CHECK (quote_ttl_seconds > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.delivery_settings.branch_id IS
  'NULL row is the global default used when a branch has no own settings.';
COMMENT ON COLUMN public.delivery_settings.fallback_charge IS
  'Charged when the provider is off, unreachable, or returns no quote.';

-- A single global row so checkout has settings before any branch is configured.
INSERT INTO public.delivery_settings (branch_id, provider, is_enabled)
SELECT NULL, 'own', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_settings WHERE branch_id IS NULL
);

-- UNIQUE treats every NULL as distinct, so the branch_id constraint alone would
-- allow many global rows. Within this partial index the expression is always
-- TRUE, which caps the branch-less rows at one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_settings_global
  ON public.delivery_settings ((branch_id IS NULL))
  WHERE branch_id IS NULL;

DROP TRIGGER IF EXISTS set_delivery_settings_updated_at ON public.delivery_settings;
CREATE TRIGGER set_delivery_settings_updated_at
  BEFORE UPDATE ON public.delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Checkout quotes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delivery_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  address_id UUID NOT NULL REFERENCES public.addresses (id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches (id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'own',
  is_serviceable BOOLEAN NOT NULL DEFAULT TRUE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  provider_amount NUMERIC(10, 2),
  eta_minutes INTEGER,
  distance_km NUMERIC(10, 2),
  provider_quote_id TEXT,
  unserviceable_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_by_order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.delivery_quotes.amount IS
  'Customer-facing charge including markup. Authoritative at order creation.';
COMMENT ON COLUMN public.delivery_quotes.provider_amount IS
  'Raw provider cost before markup, kept for margin reporting.';

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_user_id
  ON public.delivery_quotes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_address_id
  ON public.delivery_quotes (address_id);

-- ---------------------------------------------------------------------------
-- Provider tracking on orders and deliveries
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_provider TEXT NOT NULL DEFAULT 'own';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_quote_id UUID
    REFERENCES public.delivery_quotes (id) ON DELETE SET NULL;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'own';

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS external_job_id TEXT;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS external_status TEXT;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS quoted_amount NUMERIC(10, 2);

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS actual_amount NUMERIC(10, 2);

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS dispatch_error TEXT;

CREATE INDEX IF NOT EXISTS idx_delivery_external_job_id
  ON public.delivery (external_job_id)
  WHERE external_job_id IS NOT NULL;

-- Provider riders are not app users, so the one-partner-per-order uniqueness on
-- delivery still holds; only the source of the rider changes.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;

-- Serviceable pincodes drive the checkout gate, so they must be readable by
-- anyone browsing the menu. They contain no sensitive data.
DROP POLICY IF EXISTS "Delivery settings are viewable by everyone" ON public.delivery_settings;
CREATE POLICY "Delivery settings are viewable by everyone"
  ON public.delivery_settings
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Delivery settings are manageable by admin" ON public.delivery_settings;
CREATE POLICY "Delivery settings are manageable by admin"
  ON public.delivery_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Delivery quotes are viewable by owner or admin" ON public.delivery_quotes;
CREATE POLICY "Delivery quotes are viewable by owner or admin"
  ON public.delivery_quotes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- No INSERT/UPDATE policy on purpose: only the Edge Function service role may
-- write quotes, which is what keeps the shipping price tamper-proof.

NOTIFY pgrst, 'reload schema';
