-- Allow one org-wide delivery_settings row per tenant (branch_id IS NULL).
-- The original unique index allowed only a single global row in the whole database.

DROP INDEX IF EXISTS public.idx_delivery_settings_global;

CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_settings_one_global_per_org
  ON public.delivery_settings (organization_id)
  WHERE branch_id IS NULL;
