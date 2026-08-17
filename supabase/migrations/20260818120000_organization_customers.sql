-- Per-restaurant customer accounts (same Google login can enroll at many tenants).

CREATE TABLE IF NOT EXISTS public.organization_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_customers_org
  ON public.organization_customers (organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_customers_user
  ON public.organization_customers (user_id);

ALTER TABLE public.organization_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can enroll themselves" ON public.organization_customers;
CREATE POLICY "Customers can enroll themselves"
  ON public.organization_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can read own enrollment" ON public.organization_customers;
CREATE POLICY "Customers can read own enrollment"
  ON public.organization_customers
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_admin(organization_id)
    OR public.is_platform_master()
  );

DROP POLICY IF EXISTS "Customers can update own enrollment" ON public.organization_customers;
CREATE POLICY "Customers can update own enrollment"
  ON public.organization_customers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.organization_customers IS
  'A customer must enroll at each restaurant; Google identity is shared, membership is per tenant.';
