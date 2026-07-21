-- Party order inquiries (public enquiry form)

CREATE TYPE public.party_meal_preference AS ENUM (
  'veg',
  'non_veg',
  'mix'
);

CREATE TYPE public.party_inquiry_status AS ENUM (
  'new',
  'contacted',
  'quoted',
  'closed'
);

CREATE TABLE public.party_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count >= 1),
  meal_preference public.party_meal_preference NOT NULL,
  event_date DATE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  landmark TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  notes TEXT,
  status public.party_inquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_party_inquiries_status ON public.party_inquiries (status);
CREATE INDEX idx_party_inquiries_created_at ON public.party_inquiries (created_at DESC);

CREATE TRIGGER party_inquiries_updated_at
  BEFORE UPDATE ON public.party_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.party_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (guest or signed-in)
CREATE POLICY "Anyone can submit party inquiries"
  ON public.party_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Only admins can view / update inquiries
CREATE POLICY "Admins can view party inquiries"
  ON public.party_inquiries
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update party inquiries"
  ON public.party_inquiries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
