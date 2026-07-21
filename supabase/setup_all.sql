-- ===== 20250720180000_create_enums.sql =====
-- Taste of Andhra: custom enum types
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
  status public.order_status NOT NULL DEFAULT 'out_for_delivery',
  assigned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
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


