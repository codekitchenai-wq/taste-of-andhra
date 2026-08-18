-- Customer delivery addresses are per restaurant, not shared across tenants.
-- Existing rows inherit the org from the most recent order that used them;
-- leftover rows (never ordered) stay on Taste of Andhra.

ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.addresses a
SET organization_id = src.organization_id
FROM (
  SELECT DISTINCT ON (address_id)
    address_id,
    organization_id
  FROM public.orders
  WHERE address_id IS NOT NULL
    AND organization_id IS NOT NULL
  ORDER BY address_id, created_at DESC
) src
WHERE a.id = src.address_id
  AND a.organization_id IS NULL;

UPDATE public.addresses
SET organization_id = 'a0000000-0000-4000-8000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.addresses
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_addresses_org_user
  ON public.addresses (organization_id, user_id);

-- Keep a single default address per customer per restaurant.
UPDATE public.addresses a
SET is_default = FALSE
WHERE a.is_default = TRUE
  AND a.id NOT IN (
    SELECT kept.id
    FROM (
      SELECT DISTINCT ON (user_id, organization_id) id
      FROM public.addresses
      WHERE is_default = TRUE
      ORDER BY user_id, organization_id, created_at DESC
    ) kept
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default_per_org
  ON public.addresses (user_id, organization_id)
  WHERE is_default = TRUE;

COMMENT ON COLUMN public.addresses.organization_id IS
  'Restaurant this address belongs to. Same Google user can save different addresses per tenant.';
