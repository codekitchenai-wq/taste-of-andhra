-- Align Taste of Andhra public slug with thetasteofandhra.directapp.in
UPDATE public.organizations
SET
  slug = 'thetasteofandhra',
  homepage_mode = CASE
    WHEN homepage_mode = 'set_later' THEN 'platform_subdomain'
    ELSE homepage_mode
  END,
  homepage_url = CASE
    WHEN homepage_mode IN ('platform_subdomain', 'set_later')
      OR homepage_url IS NULL
      OR btrim(homepage_url) = ''
      THEN 'https://thetasteofandhra.directapp.in'
    ELSE homepage_url
  END
WHERE id = 'a0000000-0000-4000-8000-000000000001';
