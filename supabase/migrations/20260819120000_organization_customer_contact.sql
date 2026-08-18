-- Capture name, phone, and email per restaurant.
-- Google login identity can be shared; CRM contact must not leak across tenants.

ALTER TABLE public.organization_customers
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.organization_customers oc
SET
  full_name = COALESCE(oc.full_name, p.full_name),
  phone = COALESCE(oc.phone, p.phone),
  email = COALESCE(oc.email, p.email),
  updated_at = NOW()
FROM public.profiles p
WHERE p.id = oc.user_id
  AND (
    oc.full_name IS NULL
    OR oc.phone IS NULL
    OR oc.email IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_organization_customers_org_phone
  ON public.organization_customers (organization_id, phone);

DROP POLICY IF EXISTS "Org admins update customer capture"
  ON public.organization_customers;
CREATE POLICY "Org admins update customer capture"
  ON public.organization_customers
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR public.is_platform_master()
  )
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.is_platform_master()
  );

COMMENT ON TABLE public.organization_customers IS
  'Per-restaurant customer capture. Google identity may be shared; name, phone, email, and addresses stay on this organization.';
