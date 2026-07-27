-- ===== 20250720180000_create_enums.sql =====
-- The Taste of Andhra: custom enum types
-- Based on DATABASE_SCHEMA.md v1.0

CREATE TYPE public.user_role AS ENUM (
  'customer',
  'admin',
  'delivery'
);

CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

CREATE TYPE public.payment_method AS ENUM (
  'cod',
  'razorpay'
);

CREATE TYPE public.spice_level AS ENUM (
  'mild',
  'medium',
  'hot',
  'extra_hot'
);


-- ===== 20250720180001_create_functions.sql =====
-- Shared trigger functions

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ===== 20250720180002_create_tables.sql =====
-- Core tables and foreign key relationships
-- Based on DATABASE_SCHEMA.md v1.0

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  role public.user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  ingredients TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  calories INTEGER CHECK (calories IS NULL OR calories >= 0),
  spice_level public.spice_level,
  preparation_time INTEGER CHECK (preparation_time IS NULL OR preparation_time > 0),
  image_url TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(2, 1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  address_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  landmark TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.cart (id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, dish_id)
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  address_id UUID NOT NULL REFERENCES public.addresses (id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  order_status public.order_status NOT NULL DEFAULT 'pending',
  special_instructions TEXT,
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0)
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders (id) ON DELETE RESTRICT,
  payment_gateway TEXT NOT NULL,
  transaction_id TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status public.payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage > 0),
  minimum_order NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (minimum_order >= 0),
  coupon_code TEXT UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dish_id, user_id)
);

CREATE TABLE public.delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders (id) ON DELETE RESTRICT,
  delivery_partner TEXT,
  partner_phone TEXT,
  partner_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'out_for_delivery',
  assigned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  current_lat NUMERIC,
  current_lng NUMERIC,
  location_updated_at TIMESTAMPTZ
);

-- updated_at triggers

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_dishes_updated_at
  BEFORE UPDATE ON public.dishes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_cart_updated_at
  BEFORE UPDATE ON public.cart
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS helper functions (require tables above)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_delivery()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'delivery'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_cart(target_cart_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cart
    WHERE id = target_cart_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_order(target_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = target_order_id
      AND user_id = auth.uid()
  );
$$;


-- ===== 20250720180003_create_indexes.sql =====
-- Performance indexes
-- Based on DATABASE_SCHEMA.md v1.0

CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_phone ON public.profiles (phone);
CREATE INDEX idx_profiles_role ON public.profiles (role);

CREATE INDEX idx_categories_slug ON public.categories (slug);
CREATE INDEX idx_categories_display_order ON public.categories (display_order);
CREATE INDEX idx_categories_created_at ON public.categories (created_at);

CREATE INDEX idx_dishes_category_id ON public.dishes (category_id);
CREATE INDEX idx_dishes_slug ON public.dishes (slug);
CREATE INDEX idx_dishes_is_available ON public.dishes (is_available);
CREATE INDEX idx_dishes_is_featured ON public.dishes (is_featured);
CREATE INDEX idx_dishes_created_at ON public.dishes (created_at);

CREATE INDEX idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX idx_addresses_created_at ON public.addresses (created_at);

CREATE INDEX idx_cart_user_id ON public.cart (user_id);
CREATE INDEX idx_cart_created_at ON public.cart (created_at);

CREATE INDEX idx_cart_items_cart_id ON public.cart_items (cart_id);
CREATE INDEX idx_cart_items_dish_id ON public.cart_items (dish_id);
CREATE INDEX idx_cart_items_created_at ON public.cart_items (created_at);

CREATE INDEX idx_orders_user_id ON public.orders (user_id);
CREATE INDEX idx_orders_order_number ON public.orders (order_number);
CREATE INDEX idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX idx_orders_order_status ON public.orders (order_status);
CREATE INDEX idx_orders_created_at ON public.orders (created_at);

CREATE INDEX idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX idx_order_items_dish_id ON public.order_items (dish_id);

CREATE INDEX idx_payments_order_id ON public.payments (order_id);
CREATE INDEX idx_payments_status ON public.payments (status);
CREATE INDEX idx_payments_created_at ON public.payments (created_at);

CREATE INDEX idx_offers_is_active ON public.offers (is_active);
CREATE INDEX idx_offers_coupon_code ON public.offers (coupon_code);
CREATE INDEX idx_offers_created_at ON public.offers (created_at);

CREATE INDEX idx_reviews_dish_id ON public.reviews (dish_id);
CREATE INDEX idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX idx_reviews_created_at ON public.reviews (created_at);

CREATE INDEX idx_delivery_order_id ON public.delivery (order_id);
CREATE INDEX idx_delivery_status ON public.delivery (status);
CREATE INDEX idx_delivery_partner_phone ON public.delivery (partner_phone);
CREATE INDEX idx_delivery_partner_user_id ON public.delivery (partner_user_id);


-- ===== 20250720180004_enable_rls_policies.sql =====
-- Row Level Security policies
-- Based on DATABASE_SCHEMA.md v1.0

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery ENABLE ROW LEVEL SECURITY;

-- profiles

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Profiles are insertable by owner"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Profiles are updatable by owner"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "Profiles are manageable by admin"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- categories

CREATE POLICY "Active categories are viewable by everyone"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Categories are manageable by admin"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- dishes

CREATE POLICY "Available dishes are viewable by everyone"
  ON public.dishes
  FOR SELECT
  TO anon, authenticated
  USING (is_available = TRUE OR public.is_admin());

CREATE POLICY "Dishes are manageable by admin"
  ON public.dishes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- addresses

CREATE POLICY "Addresses are viewable by owner"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Addresses are insertable by owner"
  ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Addresses are updatable by owner"
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Addresses are deletable by owner"
  ON public.addresses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- cart

CREATE POLICY "Cart is viewable by owner"
  ON public.cart
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Cart is insertable by owner"
  ON public.cart
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Cart is updatable by owner"
  ON public.cart
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Cart is deletable by owner"
  ON public.cart
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- cart_items

CREATE POLICY "Cart items are viewable by cart owner"
  ON public.cart_items
  FOR SELECT
  TO authenticated
  USING (public.owns_cart(cart_id) OR public.is_admin());

CREATE POLICY "Cart items are insertable by cart owner"
  ON public.cart_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_cart(cart_id) OR public.is_admin());

CREATE POLICY "Cart items are updatable by cart owner"
  ON public.cart_items
  FOR UPDATE
  TO authenticated
  USING (public.owns_cart(cart_id) OR public.is_admin())
  WITH CHECK (public.owns_cart(cart_id) OR public.is_admin());

CREATE POLICY "Cart items are deletable by cart owner"
  ON public.cart_items
  FOR DELETE
  TO authenticated
  USING (public.owns_cart(cart_id) OR public.is_admin());

-- orders

CREATE POLICY "Orders are viewable by owner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_delivery());

CREATE POLICY "Orders are insertable by owner"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Orders are updatable by owner or admin"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Orders are manageable by admin"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- order_items

CREATE POLICY "Order items are viewable by order owner"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.owns_order(order_id) OR public.is_admin() OR public.is_delivery());

CREATE POLICY "Order items are insertable by order owner"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_order(order_id) OR public.is_admin());

CREATE POLICY "Order items are manageable by admin"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- payments

CREATE POLICY "Payments are viewable by order owner"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    public.owns_order(order_id)
    OR public.is_admin()
  );

CREATE POLICY "Payments are insertable by order owner"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_order(order_id) OR public.is_admin());

CREATE POLICY "Payments are updatable by admin"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Payments are manageable by admin"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- offers

CREATE POLICY "Active offers are viewable by everyone"
  ON public.offers
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      is_active = TRUE
      AND CURRENT_DATE >= start_date
      AND CURRENT_DATE <= end_date
    )
    OR public.is_admin()
  );

CREATE POLICY "Offers are manageable by admin"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- reviews

CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Reviews are insertable by owner"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Reviews are updatable by owner"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Reviews are deletable by owner or admin"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- delivery

CREATE POLICY "Delivery records are viewable by admin and delivery partners"
  ON public.delivery
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_delivery()
      AND partner_phone = (
        SELECT phone
        FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Delivery records are insertable by admin"
  ON public.delivery
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Delivery status is updatable by admin or assigned partner"
  ON public.delivery
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_delivery()
      AND partner_phone = (
        SELECT phone
        FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_delivery()
      AND partner_phone = (
        SELECT phone
        FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Delivery records are manageable by admin"
  ON public.delivery
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ===== 20250720180005_create_profile_trigger.sql =====
-- Auto-create profile when a new auth user registers

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'customer'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ===== 20250720180006_storage_bucket.sql =====
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


-- ===== 20250721210000_google_oauth_profile_trigger.sql =====
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


-- ===== 20260726020000_order_eta_settings.sql =====
-- Flexible delivery ETA: admin-configurable default + per-order deadline.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value)
VALUES ('default_eta_minutes', '45')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings are viewable by authenticated" ON public.app_settings;
CREATE POLICY "App settings are viewable by authenticated"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "App settings are manageable by admin" ON public.app_settings;
CREATE POLICY "App settings are manageable by admin"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ===== 20260726030000_dish_rating_trigger.sql =====
-- Keep dishes.rating in sync with the reviews table. dishes is admin-write-only
-- under RLS, so SECURITY DEFINER lets the trigger write as the table owner.

CREATE OR REPLACE FUNCTION public.recalculate_dish_rating(target_dish_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.dishes
  SET rating = (
    SELECT ROUND(AVG(rating), 1)
    FROM public.reviews
    WHERE dish_id = target_dish_id
  )
  WHERE id = target_dish_id;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_dish_rating(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_dish_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.recalculate_dish_rating(OLD.dish_id);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    PERFORM public.recalculate_dish_rating(NEW.dish_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_dish_rating_on_review ON public.reviews;
CREATE TRIGGER sync_dish_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_dish_rating();

UPDATE public.dishes d
SET rating = agg.average
FROM (
  SELECT dish_id, ROUND(AVG(rating), 1) AS average
  FROM public.reviews
  GROUP BY dish_id
) agg
WHERE d.id = agg.dish_id;


-- Third-party delivery provider support (Pidge) with per-branch service areas
-- and checkout-time shipping quotes.
--
-- Quotes are written by the pidge-quote Edge Function using the service role so
-- the price a customer is charged cannot be set from the browser. Order
-- creation reads the stored quote back instead of trusting a client value.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Per-branch delivery configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID UNIQUE REFERENCES public.branches (id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'own' CHECK (provider IN ('own', 'pidge')),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  service_pincodes TEXT[] NOT NULL DEFAULT '{}',
  max_distance_km NUMERIC CHECK (max_distance_km IS NULL OR max_distance_km > 0),
  markup_flat NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (markup_flat >= 0),
  markup_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (markup_percent >= 0),
  fallback_charge NUMERIC(10, 2) NOT NULL DEFAULT 49 CHECK (fallback_charge >= 0),
  free_delivery_threshold NUMERIC(10, 2)
    CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold >= 0),
  quote_ttl_seconds INTEGER NOT NULL DEFAULT 900 CHECK (quote_ttl_seconds > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.delivery_settings.branch_id IS
  'NULL row is the global default used when a branch has no own settings.';
COMMENT ON COLUMN public.delivery_settings.fallback_charge IS
  'Charged when the provider is off, unreachable, or returns no quote.';

-- A single global row so checkout has settings before any branch is configured.
INSERT INTO public.delivery_settings (branch_id, provider, is_enabled)
SELECT NULL, 'own', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_settings WHERE branch_id IS NULL
);

-- UNIQUE treats every NULL as distinct, so the branch_id constraint alone would
-- allow many global rows. Within this partial index the expression is always
-- TRUE, which caps the branch-less rows at one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_settings_global
  ON public.delivery_settings ((branch_id IS NULL))
  WHERE branch_id IS NULL;

DROP TRIGGER IF EXISTS set_delivery_settings_updated_at ON public.delivery_settings;
CREATE TRIGGER set_delivery_settings_updated_at
  BEFORE UPDATE ON public.delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Checkout quotes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delivery_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  address_id UUID NOT NULL REFERENCES public.addresses (id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches (id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'own',
  is_serviceable BOOLEAN NOT NULL DEFAULT TRUE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  provider_amount NUMERIC(10, 2),
  eta_minutes INTEGER,
  distance_km NUMERIC(10, 2),
  provider_quote_id TEXT,
  unserviceable_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_by_order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.delivery_quotes.amount IS
  'Customer-facing charge including markup. Authoritative at order creation.';
COMMENT ON COLUMN public.delivery_quotes.provider_amount IS
  'Raw provider cost before markup, kept for margin reporting.';

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_user_id
  ON public.delivery_quotes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_quotes_address_id
  ON public.delivery_quotes (address_id);

-- ---------------------------------------------------------------------------
-- Provider tracking on orders and deliveries
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_provider TEXT NOT NULL DEFAULT 'own';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_quote_id UUID
    REFERENCES public.delivery_quotes (id) ON DELETE SET NULL;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'own';

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS external_job_id TEXT;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS external_status TEXT;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS quoted_amount NUMERIC(10, 2);

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS actual_amount NUMERIC(10, 2);

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE public.delivery
  ADD COLUMN IF NOT EXISTS dispatch_error TEXT;

CREATE INDEX IF NOT EXISTS idx_delivery_external_job_id
  ON public.delivery (external_job_id)
  WHERE external_job_id IS NOT NULL;

-- Provider riders are not app users, so the one-partner-per-order uniqueness on
-- delivery still holds; only the source of the rider changes.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;

-- Serviceable pincodes drive the checkout gate, so they must be readable by
-- anyone browsing the menu. They contain no sensitive data.
DROP POLICY IF EXISTS "Delivery settings are viewable by everyone" ON public.delivery_settings;
CREATE POLICY "Delivery settings are viewable by everyone"
  ON public.delivery_settings
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Delivery settings are manageable by admin" ON public.delivery_settings;
CREATE POLICY "Delivery settings are manageable by admin"
  ON public.delivery_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Delivery quotes are viewable by owner or admin" ON public.delivery_quotes;
CREATE POLICY "Delivery quotes are viewable by owner or admin"
  ON public.delivery_quotes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- No INSERT/UPDATE policy on purpose: only the Edge Function service role may
-- write quotes, which is what keeps the shipping price tamper-proof.

NOTIFY pgrst, 'reload schema';


-- ===== 20260726040000_delivery_service_area.sql =====
-- Admin-controlled service area: one rule set that decides whether an address
-- can be ordered to, applied identically to own-fleet and third-party delivery.
--
-- The rules live in delivery_settings so the restaurant can change coverage
-- without a deploy. check_delivery_service_area() is the single source of truth
-- and is called from three places: the quote Edge Function, checkout, and a
-- BEFORE INSERT guard on orders that stops an out-of-area order even if the
-- browser skips the checkout gate.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Additional service-area settings
-- ---------------------------------------------------------------------------

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS require_location_pin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS service_area_note TEXT;

COMMENT ON COLUMN public.delivery_settings.require_location_pin IS
  'Blocks addresses without map coordinates, so the distance rule cannot be dodged.';
COMMENT ON COLUMN public.delivery_settings.service_area_note IS
  'Customer-facing sentence describing where the restaurant delivers.';

-- ---------------------------------------------------------------------------
-- Straight-line distance helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.haversine_km(
  p_from_lat NUMERIC,
  p_from_lng NUMERIC,
  p_to_lat NUMERIC,
  p_to_lng NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ROUND(
    (
      6371 * 2 * asin(
        sqrt(
          sin(radians(p_to_lat - p_from_lat) / 2) ^ 2 +
          cos(radians(p_from_lat)) *
          cos(radians(p_to_lat)) *
          sin(radians(p_to_lng - p_from_lng) / 2) ^ 2
        )
      )
    )::NUMERIC,
    2
  );
$$;

COMMENT ON FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS
  'Straight-line km between two points. Used for the max delivery distance rule.';

-- ---------------------------------------------------------------------------
-- Service area check
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_delivery_service_area(
  p_address_id UUID,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_serviceable BOOLEAN,
  reason TEXT,
  distance_km NUMERIC,
  max_distance_km NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address public.addresses%ROWTYPE;
  v_branch public.branches%ROWTYPE;
  v_settings public.delivery_settings%ROWTYPE;
  v_distance NUMERIC;
BEGIN
  SELECT * INTO v_address FROM public.addresses WHERE id = p_address_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'We could not find that delivery address.'::TEXT,
      NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- The service role (Edge Functions) has no auth.uid(); every other caller may
  -- only ask about their own addresses.
  IF auth.uid() IS NOT NULL
    AND v_address.user_id <> auth.uid()
    AND NOT public.is_admin()
  THEN
    RETURN QUERY SELECT FALSE, 'We could not find that delivery address.'::TEXT,
      NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT * INTO v_branch FROM public.branches WHERE id = p_branch_id;
  ELSE
    SELECT * INTO v_branch
      FROM public.branches
     WHERE is_default AND is_active
     LIMIT 1;
  END IF;

  -- Branch settings win; the branch-less row is the default for everyone else.
  SELECT * INTO v_settings
    FROM public.delivery_settings
   WHERE branch_id = v_branch.id
   LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_settings
      FROM public.delivery_settings
     WHERE branch_id IS NULL
     LIMIT 1;
  END IF;

  -- No configuration yet means no restriction, so ordering keeps working.
  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  IF COALESCE(array_length(v_settings.service_pincodes, 1), 0) > 0
    AND NOT (btrim(v_address.pincode) = ANY (v_settings.service_pincodes))
  THEN
    RETURN QUERY SELECT FALSE,
      format('We do not deliver to pincode %s yet.', v_address.pincode)::TEXT,
      NULL::NUMERIC, v_settings.max_distance_km;
    RETURN;
  END IF;

  IF v_settings.require_location_pin
    AND (v_address.latitude IS NULL OR v_address.longitude IS NULL)
  THEN
    RETURN QUERY SELECT FALSE,
      'Pin this address on the map so we can check whether we deliver there.'::TEXT,
      NULL::NUMERIC, v_settings.max_distance_km;
    RETURN;
  END IF;

  IF v_branch.latitude IS NOT NULL
    AND v_branch.longitude IS NOT NULL
    AND v_address.latitude IS NOT NULL
    AND v_address.longitude IS NOT NULL
  THEN
    v_distance := public.haversine_km(
      v_branch.latitude,
      v_branch.longitude,
      v_address.latitude,
      v_address.longitude
    );

    IF v_settings.max_distance_km IS NOT NULL
      AND v_distance > v_settings.max_distance_km
    THEN
      RETURN QUERY SELECT FALSE,
        format(
          'This address is %s km from our %s kitchen, beyond the %s km we deliver to.',
          trim_scale(ROUND(v_distance, 1)),
          v_branch.name,
          trim_scale(ROUND(v_settings.max_distance_km, 1))
        )::TEXT,
        v_distance, v_settings.max_distance_km;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_distance, v_settings.max_distance_km;
END;
$$;

COMMENT ON FUNCTION public.check_delivery_service_area(UUID, UUID) IS
  'Single source of truth for whether an address is inside the delivery area.';

REVOKE ALL ON FUNCTION public.check_delivery_service_area(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_delivery_service_area(UUID, UUID)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Order guard
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_service_area()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check RECORD;
BEGIN
  IF NEW.address_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Staff still take phone and counter orders for addresses the website will
  -- not accept, and a service-role caller has already made its own decision, so
  -- the guard only applies to customer checkouts.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_check
    FROM public.check_delivery_service_area(NEW.address_id, NEW.branch_id);

  IF v_check.is_serviceable IS FALSE THEN
    RAISE EXCEPTION 'OUTSIDE_SERVICE_AREA: %',
      COALESCE(v_check.reason, 'We do not deliver to this address yet.')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_service_area ON public.orders;
CREATE TRIGGER enforce_order_service_area
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_service_area();

NOTIFY pgrst, 'reload schema';
