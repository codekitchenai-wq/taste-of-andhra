-- Phase 1: Menu modifiers + cart/order price snapshots for historical integrity.
-- Soft deactivation continues via categories.is_active / dishes.is_available / modifiers.is_available.

-- ---------------------------------------------------------------------------
-- modifier_groups
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selection INTEGER NOT NULL DEFAULT 0
    CHECK (min_selection >= 0),
  max_selection INTEGER
    CHECK (max_selection IS NULL OR max_selection >= 1),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT modifier_groups_selection_bounds CHECK (
    max_selection IS NULL OR max_selection >= min_selection
  )
);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_organization_id
  ON public.modifier_groups (organization_id);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_org_active
  ON public.modifier_groups (organization_id, is_active);

DROP TRIGGER IF EXISTS set_modifier_groups_updated_at ON public.modifier_groups;
CREATE TRIGGER set_modifier_groups_updated_at
  BEFORE UPDATE ON public.modifier_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- modifiers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL
    REFERENCES public.modifier_groups (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modifiers_group_id
  ON public.modifiers (modifier_group_id);

CREATE INDEX IF NOT EXISTS idx_modifiers_organization_id
  ON public.modifiers (organization_id);

DROP TRIGGER IF EXISTS set_modifiers_updated_at ON public.modifiers;
CREATE TRIGGER set_modifiers_updated_at
  BEFORE UPDATE ON public.modifiers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- dish_modifier_groups (attach reusable groups to dishes)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dish_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  dish_id UUID NOT NULL
    REFERENCES public.dishes (id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL
    REFERENCES public.modifier_groups (id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dish_id, modifier_group_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_dish_id
  ON public.dish_modifier_groups (dish_id);

CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_organization_id
  ON public.dish_modifier_groups (organization_id);

-- ---------------------------------------------------------------------------
-- cart_items: allow same dish with different modifier sets; snapshot unit price
-- ---------------------------------------------------------------------------

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_cart_id_dish_id_key;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS modifiers_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2);

COMMENT ON COLUMN public.cart_items.modifiers_snapshot IS
  'Selected modifiers snapshot: [{group_id, group_name, modifier_id, modifier_name, price_delta}]';

COMMENT ON COLUMN public.cart_items.unit_price IS
  'Unit price at add time (dish base + modifier deltas). Prefer over live dish.price.';

-- Backfill unit_price from current dish price where missing
UPDATE public.cart_items ci
SET unit_price = d.price
FROM public.dishes d
WHERE ci.dish_id = d.id
  AND ci.unit_price IS NULL;

ALTER TABLE public.cart_items
  ALTER COLUMN unit_price SET DEFAULT 0;

UPDATE public.cart_items SET unit_price = 0 WHERE unit_price IS NULL;

ALTER TABLE public.cart_items
  ALTER COLUMN unit_price SET NOT NULL;

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_unit_price_check;

ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_unit_price_check CHECK (unit_price >= 0);

-- ---------------------------------------------------------------------------
-- order_items: historical snapshots
-- ---------------------------------------------------------------------------

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS modifiers_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS dish_name_snapshot TEXT;

COMMENT ON COLUMN public.order_items.modifiers_snapshot IS
  'Modifiers chosen at order time (immutable snapshot).';

COMMENT ON COLUMN public.order_items.dish_name_snapshot IS
  'Dish name at order time so renames do not rewrite history.';

UPDATE public.order_items oi
SET dish_name_snapshot = d.name
FROM public.dishes d
WHERE oi.dish_id = d.id
  AND oi.dish_name_snapshot IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_modifier_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active modifier groups are viewable by everyone"
  ON public.modifier_groups;
CREATE POLICY "Active modifier groups are viewable by everyone"
  ON public.modifier_groups
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Modifier groups are manageable by admin"
  ON public.modifier_groups;
CREATE POLICY "Modifier groups are manageable by admin"
  ON public.modifier_groups
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Available modifiers are viewable by everyone"
  ON public.modifiers;
CREATE POLICY "Available modifiers are viewable by everyone"
  ON public.modifiers
  FOR SELECT
  TO anon, authenticated
  USING (is_available = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Modifiers are manageable by admin"
  ON public.modifiers;
CREATE POLICY "Modifiers are manageable by admin"
  ON public.modifiers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Dish modifier groups are viewable by everyone"
  ON public.dish_modifier_groups;
CREATE POLICY "Dish modifier groups are viewable by everyone"
  ON public.dish_modifier_groups
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Dish modifier groups are manageable by admin"
  ON public.dish_modifier_groups;
CREATE POLICY "Dish modifier groups are manageable by admin"
  ON public.dish_modifier_groups
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
