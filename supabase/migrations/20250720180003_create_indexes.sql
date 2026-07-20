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
