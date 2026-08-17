-- Starter: Direct UPI (free) + Growth/Pro plans; payment claim for "I've paid"
-- Razorpay / WhatsApp remain paid add-ons managed by Master subscription.

-- ---------------------------------------------------------------------------
-- Feature catalog
-- ---------------------------------------------------------------------------

INSERT INTO public.features (key, name, description, is_add_on, default_enabled, display_order)
VALUES
  (
    'payments_direct_upi',
    'Direct UPI',
    'Customer pays to restaurant UPI QR; staff marks paid',
    FALSE,
    TRUE,
    74
  )
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_add_on = EXCLUDED.is_add_on,
  default_enabled = EXCLUDED.default_enabled,
  display_order = EXCLUDED.display_order;

-- Razorpay is an upgrade, not part of free starter
UPDATE public.features
SET
  is_add_on = TRUE,
  default_enabled = FALSE,
  description = 'Online food payments via Razorpay (cards, UPI, wallets) — paid plan add-on',
  display_order = 75
WHERE key = 'payments_razorpay';

-- Ensure starter plan includes Direct UPI; drop Razorpay from starter
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT 'b0000000-0000-4000-8000-000000000001'::uuid, 'payments_direct_upi'
WHERE EXISTS (SELECT 1 FROM public.plans WHERE id = 'b0000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

DELETE FROM public.plan_features
WHERE plan_id = 'b0000000-0000-4000-8000-000000000001'
  AND feature_key = 'payments_razorpay';

-- Pilot Taste of Andhra keeps Razorpay via explicit entitlement (optional)
INSERT INTO public.organization_entitlements (organization_id, feature_key, enabled, source, notes)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'payments_razorpay',
  TRUE,
  'manual',
  'Pilot: Razorpay retained while starter defaults to Direct UPI'
)
ON CONFLICT (organization_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled, notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Plans: Growth + Pro (Master assigns; Starter remains free)
-- ---------------------------------------------------------------------------

INSERT INTO public.plans (id, code, name, description, price_monthly, price_yearly, is_active)
VALUES
  (
    'b0000000-0000-4000-8000-000000000002',
    'growth',
    'Growth',
    'Starter plus WhatsApp order updates and SMS notifications',
    999,
    9990,
    TRUE
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'pro',
    'Pro',
    'Growth plus Razorpay auto-paid checkout and advanced ops add-ons',
    2499,
    24990,
    TRUE
  )
ON CONFLICT (id) DO UPDATE
SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  is_active = EXCLUDED.is_active;

-- Growth = all non-add-on features + WhatsApp notifications + SMS
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT 'b0000000-0000-4000-8000-000000000002'::uuid, f.key
FROM public.features f
WHERE f.is_add_on = FALSE
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_key)
VALUES
  ('b0000000-0000-4000-8000-000000000002', 'whatsapp_notifications'),
  ('b0000000-0000-4000-8000-000000000002', 'sms_notifications')
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Pro = Growth features + Razorpay + WhatsApp ordering + loyalty + branches
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT 'b0000000-0000-4000-8000-000000000003'::uuid, f.key
FROM public.features f
WHERE f.is_add_on = FALSE
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_key)
VALUES
  ('b0000000-0000-4000-8000-000000000003', 'whatsapp_notifications'),
  ('b0000000-0000-4000-8000-000000000003', 'whatsapp_ordering'),
  ('b0000000-0000-4000-8000-000000000003', 'sms_notifications'),
  ('b0000000-0000-4000-8000-000000000003', 'payments_razorpay'),
  ('b0000000-0000-4000-8000-000000000003', 'loyalty'),
  ('b0000000-0000-4000-8000-000000000003', 'branches')
ON CONFLICT (plan_id, feature_key) DO NOTHING;

UPDATE public.plans
SET
  description = 'Free / low-cost: menu, orders, Direct UPI (staff mark paid), COD. No Razorpay or WhatsApp.',
  name = 'Starter'
WHERE id = 'b0000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Customer "I've paid" claim (does not set paid — staff confirms)
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_claim_note text;

COMMENT ON COLUMN public.orders.payment_claimed_at IS
  'When customer tapped I have paid on the share/pay page (pending staff confirm).';
COMMENT ON COLUMN public.orders.payment_claim_note IS
  'Optional UTR / note from customer payment claim.';

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
  v_org_id uuid;
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

  v_org_id := v_order.organization_id;

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
    AND (v_org_id IS NULL OR organization_id = v_org_id)
  ORDER BY CASE WHEN organization_id = v_org_id THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT value INTO v_upi_name
  FROM public.app_settings
  WHERE key = 'upi_payee_name'
    AND (v_org_id IS NULL OR organization_id = v_org_id)
  ORDER BY CASE WHEN organization_id = v_org_id THEN 0 ELSE 1 END
  LIMIT 1;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'guest_name', v_order.guest_name,
    'fulfillment_type', v_order.fulfillment_type,
    'payment_status', v_order.payment_status,
    'order_status', v_order.order_status,
    'payment_method', v_order.payment_method,
    'subtotal', v_order.subtotal,
    'tax', v_order.tax,
    'delivery_charge', v_order.delivery_charge,
    'discount', v_order.discount,
    'total', v_order.total,
    'items', v_items,
    'upi_vpa', NULLIF(btrim(coalesce(v_upi_vpa, '')), ''),
    'upi_payee_name', NULLIF(btrim(coalesce(v_upi_name, '')), ''),
    'payment_claimed_at', v_order.payment_claimed_at,
    'payment_claim_note', v_order.payment_claim_note
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_payment_share(
  p_token uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_note text;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_note := NULLIF(btrim(coalesce(p_note, '')), '');
  IF v_note IS NOT NULL THEN
    v_note := left(v_note, 120);
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE payment_share_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_paid', true,
      'payment_claimed_at', v_order.payment_claimed_at,
      'payment_claim_note', v_order.payment_claim_note
    );
  END IF;

  IF v_order.payment_method NOT IN ('pay_later', 'cod') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  UPDATE public.orders
  SET
    payment_claimed_at = coalesce(payment_claimed_at, now()),
    payment_claim_note = coalesce(v_note, payment_claim_note)
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'payment_claimed_at', v_order.payment_claimed_at,
    'payment_claim_note', v_order.payment_claim_note
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payment_share(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_payment_share(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.claim_payment_share(uuid, text) IS
  'Customer signals I have paid; does not mark order paid — staff must confirm.';
