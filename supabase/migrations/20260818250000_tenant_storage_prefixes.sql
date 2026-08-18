-- Keep one public bucket, isolate writes by organization prefix:
-- orgs/{organization_id}/dishes|categories/...
-- DirectApp Master (is_org_admin via is_platform_master) can still write any prefix.

DROP POLICY IF EXISTS "Admin upload restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete restaurant images" ON storage.objects;

CREATE POLICY "Org admins upload restaurant images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-images'
    AND (storage.foldername(name))[1] = 'orgs'
    AND public.is_org_admin(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Org admins update restaurant images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'restaurant-images'
    AND (storage.foldername(name))[1] = 'orgs'
    AND public.is_org_admin(((storage.foldername(name))[2])::uuid)
  )
  WITH CHECK (
    bucket_id = 'restaurant-images'
    AND (storage.foldername(name))[1] = 'orgs'
    AND public.is_org_admin(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Org admins delete restaurant images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'restaurant-images'
    AND (storage.foldername(name))[1] = 'orgs'
    AND public.is_org_admin(((storage.foldername(name))[2])::uuid)
  );
