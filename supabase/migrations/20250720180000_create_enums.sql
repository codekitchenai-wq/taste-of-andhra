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
