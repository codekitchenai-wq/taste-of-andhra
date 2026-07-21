-- Improve profile creation for phone (OTP) auth users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_phone TEXT;
BEGIN
  profile_phone := COALESCE(
    NULLIF(NEW.phone, ''),
    NEW.raw_user_meta_data ->> 'phone'
  );

  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'Customer'),
    NEW.email,
    profile_phone,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'customer'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(
      NULLIF(EXCLUDED.full_name, 'Customer'),
      public.profiles.full_name
    ),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  RETURN NEW;
END;
$$;
