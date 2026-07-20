-- Supabase Storage bucket for restaurant images

INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read restaurant images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'restaurant-images');

CREATE POLICY "Admin upload restaurant images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-images'
    AND public.is_admin()
  );

CREATE POLICY "Admin update restaurant images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'restaurant-images'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'restaurant-images'
    AND public.is_admin()
  );

CREATE POLICY "Admin delete restaurant images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'restaurant-images'
    AND public.is_admin()
  );
