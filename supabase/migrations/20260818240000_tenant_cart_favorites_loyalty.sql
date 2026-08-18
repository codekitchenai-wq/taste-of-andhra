-- Isolate customer carts, favorites, and loyalty per restaurant.
-- Existing rows inherit Taste of Andhra so the pilot tenant keeps working.

-- Cart: one basket per user per restaurant
ALTER TABLE public.cart
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.cart
SET organization_id = 'a0000000-0000-4000-8000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.cart
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.cart DROP CONSTRAINT IF EXISTS cart_user_id_key;
DROP INDEX IF EXISTS cart_user_id_key;

ALTER TABLE public.cart
  DROP CONSTRAINT IF EXISTS cart_user_org_key;
ALTER TABLE public.cart
  ADD CONSTRAINT cart_user_org_key UNIQUE (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_cart_organization_id
  ON public.cart (organization_id);

-- Favorites
ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.favorites f
SET organization_id = d.organization_id
FROM public.dishes d
WHERE f.dish_id = d.id
  AND f.organization_id IS NULL;

UPDATE public.favorites
SET organization_id = 'a0000000-0000-4000-8000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.favorites
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_dish_id_key;
DROP INDEX IF EXISTS favorites_user_id_dish_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_org_dish
  ON public.favorites (user_id, organization_id, dish_id);

CREATE INDEX IF NOT EXISTS idx_favorites_organization_id
  ON public.favorites (organization_id);

-- Loyalty: one points balance per user per restaurant
ALTER TABLE public.loyalty_accounts
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.loyalty_accounts
SET organization_id = 'a0000000-0000-4000-8000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.loyalty_accounts
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.loyalty_accounts DROP CONSTRAINT IF EXISTS loyalty_accounts_user_id_key;
DROP INDEX IF EXISTS loyalty_accounts_user_id_key;

ALTER TABLE public.loyalty_accounts
  DROP CONSTRAINT IF EXISTS loyalty_accounts_user_org_key;
ALTER TABLE public.loyalty_accounts
  ADD CONSTRAINT loyalty_accounts_user_org_key UNIQUE (user_id, organization_id);

CREATE OR REPLACE FUNCTION public.award_loyalty_for_order(
  p_user_id UUID,
  p_order_id UUID,
  p_order_total NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_account_id UUID;
  v_org_id UUID;
BEGIN
  v_points := FLOOR(p_order_total)::INTEGER;
  IF v_points <= 0 THEN
    RETURN;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.orders
  WHERE id = p_order_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.loyalty_transactions lt
    INNER JOIN public.loyalty_accounts la ON la.id = lt.account_id
    WHERE lt.order_id = p_order_id
      AND lt.transaction_type = 'earn'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.loyalty_accounts (user_id, organization_id)
  VALUES (p_user_id, v_org_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  SELECT id INTO v_account_id
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id
    AND organization_id = v_org_id;

  INSERT INTO public.loyalty_transactions (
    account_id, points, transaction_type, order_id, note
  ) VALUES (
    v_account_id,
    v_points,
    'earn',
    p_order_id,
    'Earned ' || v_points || ' points for order'
  );

  UPDATE public.loyalty_accounts
  SET
    points_balance = points_balance + v_points,
    lifetime_earned = lifetime_earned + v_points
  WHERE id = v_account_id;
END;
$$;
