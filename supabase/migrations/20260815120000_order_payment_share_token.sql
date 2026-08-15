-- Shareable customer payment page for phone/counter orders (no login).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_share_token uuid;

UPDATE public.orders
SET payment_share_token = gen_random_uuid()
WHERE payment_share_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN payment_share_token SET DEFAULT gen_random_uuid();

ALTER TABLE public.orders
  ALTER COLUMN payment_share_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_share_token
  ON public.orders (payment_share_token);

COMMENT ON COLUMN public.orders.payment_share_token IS
  'Public token for /pay/:token order-details + UPI payment page.';

CREATE OR REPLACE FUNCTION public.get_payment_share(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
  v_upi_vpa text;
  v_upi_name text;
BEGIN
  IF p_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE payment_share_token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', COALESCE(oi.dish_name_snapshot, d.name, 'Item'),
        'quantity', oi.quantity,
        'unit_price', oi.price,
        'line_total', oi.total
      )
      ORDER BY oi.id
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.order_items oi
  LEFT JOIN public.dishes d ON d.id = oi.dish_id
  WHERE oi.order_id = v_order.id;

  SELECT value INTO v_upi_vpa
  FROM public.app_settings
  WHERE key = 'upi_vpa'
  LIMIT 1;

  SELECT value INTO v_upi_name
  FROM public.app_settings
  WHERE key = 'upi_payee_name'
  LIMIT 1;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'guest_name', v_order.guest_name,
    'fulfillment_type', v_order.fulfillment_type,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'subtotal', v_order.subtotal,
    'tax', v_order.tax,
    'delivery_charge', v_order.delivery_charge,
    'discount', v_order.discount,
    'total', v_order.total,
    'items', v_items,
    'upi_vpa', NULLIF(btrim(coalesce(v_upi_vpa, '')), ''),
    'upi_payee_name', NULLIF(btrim(coalesce(v_upi_name, '')), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_payment_share(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_share(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_payment_share(uuid) IS
  'Public order summary + UPI settings for the customer payment share page.';
