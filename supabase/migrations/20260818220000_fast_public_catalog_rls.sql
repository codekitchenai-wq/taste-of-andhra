-- Homepage catalog reads were slow because SELECT policies mixed
-- "public can see active rows" with is_org_admin() in one OR expression.
-- Postgres evaluates that helper per row (profiles + organization_members).
-- After Google login the visitor is authenticated, so the helper is even heavier.
-- Split policies so active/available rows short-circuit without admin checks.
-- Also skip helper work when there is no signed-in user.

CREATE OR REPLACE FUNCTION public.is_platform_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'platform_master'
        AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.is_platform_master()
      OR EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND is_active = TRUE
          AND role IN ('restaurant_owner', 'restaurant_admin')
      )
    );
$$;

DROP POLICY IF EXISTS "Active categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Org admins can view all categories" ON public.categories;

CREATE POLICY "Public can view active categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "Org admins can view all categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Available dishes are viewable by everyone" ON public.dishes;
DROP POLICY IF EXISTS "Public can view available dishes" ON public.dishes;
DROP POLICY IF EXISTS "Org admins can view all dishes" ON public.dishes;

CREATE POLICY "Public can view available dishes"
  ON public.dishes
  FOR SELECT
  TO anon, authenticated
  USING (is_available = TRUE);

CREATE POLICY "Org admins can view all dishes"
  ON public.dishes
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE INDEX IF NOT EXISTS idx_dishes_org_available
  ON public.dishes (organization_id)
  WHERE is_available = TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_org_active
  ON public.categories (organization_id, display_order)
  WHERE is_active = TRUE;
