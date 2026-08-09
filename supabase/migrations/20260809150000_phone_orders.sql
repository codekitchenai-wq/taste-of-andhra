-- Phone / call-in orders: pickup vs delivery, guest callers, pay-later UPI QR.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'fulfillment_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.fulfillment_type AS ENUM ('delivery', 'pickup');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_source' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_source AS ENUM ('app', 'phone');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'payment_method'
      AND e.enumlabel = 'pay_later'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'pay_later';
  END IF;
END $$;

ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN address_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_type public.fulfillment_type NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS order_source public.order_source NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS guest_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS guest_landmark TEXT,
  ADD COLUMN IF NOT EXISTS guest_city TEXT,
  ADD COLUMN IF NOT EXISTS guest_state TEXT,
  ADD COLUMN IF NOT EXISTS guest_pincode TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_identity_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_identity_check CHECK (
    user_id IS NOT NULL
    OR (guest_name IS NOT NULL AND btrim(guest_name) <> ''
        AND guest_phone IS NOT NULL AND btrim(guest_phone) <> '')
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_address_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_fulfillment_address_check CHECK (
    fulfillment_type = 'pickup'
    OR address_id IS NOT NULL
    OR (
      guest_address_line1 IS NOT NULL AND btrim(guest_address_line1) <> ''
      AND guest_city IS NOT NULL AND btrim(guest_city) <> ''
      AND guest_pincode IS NOT NULL AND btrim(guest_pincode) <> ''
    )
  );

CREATE INDEX IF NOT EXISTS idx_orders_guest_phone
  ON public.orders (guest_phone)
  WHERE guest_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_source
  ON public.orders (order_source);

-- Seed UPI settings for both legacy (key PK) and multi-tenant (org+key PK) schemas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_settings'
      AND column_name = 'organization_id'
  ) THEN
    INSERT INTO public.app_settings (organization_id, key, value, updated_at)
    VALUES
      (
        'a0000000-0000-4000-8000-000000000001',
        'upi_vpa',
        'tasteofandhra@okaxis',
        NOW()
      ),
      (
        'a0000000-0000-4000-8000-000000000001',
        'upi_payee_name',
        'The Taste of Andhra',
        NOW()
      )
    ON CONFLICT (organization_id, key) DO NOTHING;
  ELSE
    INSERT INTO public.app_settings (key, value, updated_at)
    VALUES
      ('upi_vpa', 'tasteofandhra@okaxis', NOW()),
      ('upi_payee_name', 'The Taste of Andhra', NOW())
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
