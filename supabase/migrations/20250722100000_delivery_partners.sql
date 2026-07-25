-- Delivery partner roster: a reusable list of delivery people that admins can
-- maintain once and select during order assignment (auto-fills phone).

CREATE TABLE public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phone)
);

CREATE INDEX idx_delivery_partners_is_active
  ON public.delivery_partners (is_active);

CREATE TRIGGER set_delivery_partners_updated_at
  BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

-- Only admins manage and read the roster (assignment happens in the admin panel).
CREATE POLICY "Delivery partners are manageable by admin"
  ON public.delivery_partners
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
