-- Link delivery partner roster rows to Auth/login profiles so restaurant
-- admins can create, reset, disable, and delete partner accounts.

ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_partners_user_id
  ON public.delivery_partners (user_id);

COMMENT ON COLUMN public.delivery_partners.user_id IS
  'Auth profile used for /delivery login. NULL until admin creates or links a login.';

-- Backfill: delivery org members whose phone matches a roster row.
UPDATE public.delivery_partners dp
SET user_id = p.id
FROM public.profiles p
INNER JOIN public.organization_members om
  ON om.user_id = p.id
 AND om.is_active = TRUE
 AND om.role = 'delivery'
WHERE dp.user_id IS NULL
  AND om.organization_id = dp.organization_id
  AND p.role = 'delivery'
  AND public.normalized_phone(p.phone) <> ''
  AND public.normalized_phone(p.phone) = public.normalized_phone(dp.phone);

NOTIFY pgrst, 'reload schema';
