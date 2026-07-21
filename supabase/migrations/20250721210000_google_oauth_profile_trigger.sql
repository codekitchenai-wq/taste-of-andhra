-- Improve profile creation for Google OAuth (name / avatar) and email signups

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_phone TEXT;
  profile_name TEXT;
  profile_avatar TEXT;
BEGIN
  profile_phone := COALESCE(
    NULLIF(NEW.phone, ''),
    NEW.raw_user_meta_data ->> 'phone'
  );

  profile_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    'Customer'
  );

  profile_avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
  );

  INSERT INTO public.profiles (id, full_name, email, phone, role, avatar_url)
  VALUES (
    NEW.id,
    profile_name,
    NEW.email,
    profile_phone,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'customer'
    ),
    profile_avatar
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(
      NULLIF(EXCLUDED.full_name, 'Customer'),
      public.profiles.full_name
    ),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
END;
$$;
