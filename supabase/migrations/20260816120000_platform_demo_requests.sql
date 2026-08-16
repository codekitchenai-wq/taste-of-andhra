-- Platform marketing leads from www.directapp.in demo / enroll form.
CREATE TABLE IF NOT EXISTS public.platform_demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  interest TEXT NOT NULL,
  plan_interest TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_demo_requests_created_at
  ON public.platform_demo_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_demo_requests_status
  ON public.platform_demo_requests (status);

COMMENT ON TABLE public.platform_demo_requests IS
  'Inbound demo / enrollment requests from the DirectApp marketing site.';

ALTER TABLE public.platform_demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit platform demo requests"
  ON public.platform_demo_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Platform masters can read demo requests"
  ON public.platform_demo_requests
  FOR SELECT
  TO authenticated
  USING (public.is_platform_master());

CREATE POLICY "Platform masters can update demo requests"
  ON public.platform_demo_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_master())
  WITH CHECK (public.is_platform_master());
