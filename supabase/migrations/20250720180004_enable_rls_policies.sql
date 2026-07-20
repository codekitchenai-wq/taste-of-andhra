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
