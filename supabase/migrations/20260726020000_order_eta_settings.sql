-- Flexible delivery/pickup ETA: admin-configurable default + per-order deadline.
-- Uses existing orders.estimated_delivery; adds app_settings for defaults.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value)
VALUES ('default_eta_minutes', '45')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings are viewable by authenticated" ON public.app_settings;
CREATE POLICY "App settings are viewable by authenticated"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "App settings are manageable by admin" ON public.app_settings;
CREATE POLICY "App settings are manageable by admin"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Backfill open orders that never received an ETA (default 45 minutes from placed).
UPDATE public.orders
SET estimated_delivery = created_at + INTERVAL '45 minutes'
WHERE estimated_delivery IS NULL
  AND order_status NOT IN ('delivered', 'cancelled');

-- Sample data: mark a few active orders as delayed / nearly due so admin UI can be demoed.
-- Safe no-op when those rows do not exist yet.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_status
      ORDER BY created_at ASC
    ) AS rn
  FROM public.orders
  WHERE order_status IN ('preparing', 'ready', 'out_for_delivery')
)
UPDATE public.orders o
SET estimated_delivery = CASE
  WHEN r.rn = 1 THEN NOW() - INTERVAL '20 minutes'
  WHEN r.rn = 2 THEN NOW() + INTERVAL '8 minutes'
  ELSE o.estimated_delivery
END
FROM ranked r
WHERE o.id = r.id
  AND r.rn <= 2;
