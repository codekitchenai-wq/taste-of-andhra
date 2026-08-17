-- Fix WhatsApp config saves: is_admin()/is_platform_master() read profiles while
-- profiles SELECT policy calls is_admin() → RLS recursion → INSERT denied.
-- Disable row_security inside these helpers (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.is_platform_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'platform_master'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND is_active = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND role IN ('restaurant_owner', 'restaurant_admin')
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
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
        AND role IN ('restaurant_owner', 'restaurant_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_platform_master()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND is_active = TRUE
    );
$$;

-- Ensure demo / tester admins are org members of Taste of Andhra.
INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'restaurant_admin'::public.organization_member_role,
  TRUE
FROM public.profiles p
WHERE p.role = 'admin'
  AND COALESCE(p.is_active, TRUE) = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
      AND m.user_id = p.id
  );
