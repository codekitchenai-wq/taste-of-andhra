-- Allow legacy restaurant admins (profiles.role = admin) to manage WhatsApp
-- config, not only organization_members with restaurant_admin/owner.
-- Also ensure demo admins are members of the pilot org.

DROP POLICY IF EXISTS "Org admins read own whatsapp config"
  ON public.organization_whatsapp_configs;
CREATE POLICY "Org admins read own whatsapp config"
  ON public.organization_whatsapp_configs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_admin()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins upsert own whatsapp config"
  ON public.organization_whatsapp_configs;
CREATE POLICY "Org admins upsert own whatsapp config"
  ON public.organization_whatsapp_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_master()
    OR public.is_admin()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins update own whatsapp config"
  ON public.organization_whatsapp_configs;
CREATE POLICY "Org admins update own whatsapp config"
  ON public.organization_whatsapp_configs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_admin()
    OR public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_platform_master()
    OR public.is_admin()
    OR public.is_org_admin(organization_id)
  );

-- Link any active profile with role=admin to the pilot Taste of Andhra org.
INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  'restaurant_admin'::public.organization_member_role,
  TRUE
FROM public.profiles p
WHERE p.role = 'admin'
  AND p.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
      AND m.user_id = p.id
  );
