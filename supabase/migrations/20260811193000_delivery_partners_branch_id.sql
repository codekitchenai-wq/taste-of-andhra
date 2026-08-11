-- Scope delivery partner roster to a branch so assignment dropdowns
-- only show partners for the order's branch.

ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_partners_branch_id
  ON public.delivery_partners (branch_id);

COMMENT ON COLUMN public.delivery_partners.branch_id IS
  'Branch this partner serves. NULL means available to all branches.';

-- Backfill: attach unscoped partners to the org default branch when one exists.
UPDATE public.delivery_partners dp
SET branch_id = b.id
FROM public.branches b
WHERE dp.branch_id IS NULL
  AND b.organization_id = dp.organization_id
  AND b.is_default = TRUE
  AND b.is_active = TRUE;

NOTIFY pgrst, 'reload schema';
