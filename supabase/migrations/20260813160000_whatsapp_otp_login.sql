-- WhatsApp OTP customer login.
-- Codes are hashed; only the service role (Edge Function) may read/write.

CREATE OR REPLACE FUNCTION public.normalize_indian_mobile(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(raw, '\D', '', 'g');

  IF length(digits) = 12 AND left(digits, 2) = '91' THEN
    digits := substring(digits FROM 3);
  END IF;

  IF digits ~ '^[6-9][0-9]{9}$' THEN
    RETURN digits;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.normalize_indian_mobile(TEXT) IS
  'Returns a 10-digit Indian mobile or NULL.';

CREATE TABLE IF NOT EXISTS public.auth_whatsapp_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  phone_local TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_whatsapp_otps_phone_created
  ON public.auth_whatsapp_otps (phone_e164, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_whatsapp_otps_expires
  ON public.auth_whatsapp_otps (expires_at);

ALTER TABLE public.auth_whatsapp_otps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_whatsapp_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_whatsapp_otps TO service_role;

-- Look up an existing auth user by local or E.164 phone (service role only).
CREATE OR REPLACE FUNCTION public.find_user_id_by_phone(
  p_local TEXT,
  p_e164 TEXT
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM (
    SELECT id
    FROM public.profiles
    WHERE phone = p_local
    UNION ALL
    SELECT id
    FROM auth.users
    WHERE phone = p_e164
       OR phone = p_local
       OR public.normalize_indian_mobile(phone) = p_local
       OR raw_user_meta_data ->> 'phone' = p_local
  ) matched
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_phone(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_phone(TEXT, TEXT)
  TO service_role;

-- Store 10-digit mobiles on profiles; hide synthetic OTP emails.
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
  profile_email TEXT;
BEGIN
  profile_phone := public.normalize_indian_mobile(
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
      NULLIF(NEW.phone, '')
    )
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

  profile_email := NEW.email;
  IF profile_email IS NOT NULL AND profile_email ILIKE '%@otp.invalid' THEN
    profile_email := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, role, avatar_url)
  VALUES (
    NEW.id,
    profile_name,
    profile_email,
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
