-- WhatsApp multi-tenant: per-org config, outbox, notifications org scope,
-- feature entitlements, checkout consent, opt-outs.

-- ---------------------------------------------------------------------------
-- Feature catalog: notifications (ship) + ordering (parked entitlement)
-- ---------------------------------------------------------------------------

INSERT INTO public.features (key, name, description, is_add_on, default_enabled, display_order)
VALUES
  (
    'whatsapp_notifications',
    'WhatsApp notifications',
    'Order status updates via restaurant WhatsApp Business number',
    TRUE,
    FALSE,
    130
  ),
  (
    'whatsapp_ordering',
    'WhatsApp ordering',
    'Order from WhatsApp (Flows / conversational) — future add-on',
    TRUE,
    FALSE,
    140
  )
ON CONFLICT (key) DO NOTHING;

-- Pilot: enable notifications for Taste of Andhra (connection still required)
INSERT INTO public.organization_entitlements (
  organization_id, feature_key, enabled, source, notes
)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'whatsapp_notifications',
  TRUE,
  'manual',
  'Pilot: WhatsApp order-status notifications'
)
ON CONFLICT (organization_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Checkout consent on orders
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_updates_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.orders.whatsapp_updates_opt_in IS
  'Customer consented to WhatsApp order-status updates at checkout.';

-- ---------------------------------------------------------------------------
-- Notifications: tenant scope
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.notifications n
SET organization_id = o.organization_id
FROM public.orders o
WHERE n.order_id = o.id
  AND n.organization_id IS NULL
  AND o.organization_id IS NOT NULL;

UPDATE public.notifications
SET organization_id = 'a0000000-0000-4000-8000-000000000001'
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON public.notifications (organization_id);

-- ---------------------------------------------------------------------------
-- Per-restaurant WhatsApp Business config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_cloud'
    CHECK (provider IN ('meta_cloud', 'bsp_gupshup', 'bsp_interakt', 'bsp_other')),
  connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (
      connection_status IN (
        'disconnected',
        'pending_review',
        'connected',
        'error'
      )
    ),
  waba_id TEXT,
  phone_number_id TEXT,
  display_phone_number TEXT,
  -- Written via Edge Functions / service role; never SELECT from the browser.
  access_token TEXT,
  token_configured BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_verify_token TEXT,
  enabled_statuses JSONB NOT NULL DEFAULT '{
    "pending": false,
    "confirmed": true,
    "preparing": true,
    "ready": true,
    "out_for_delivery": true,
    "delivered": true,
    "cancelled": true
  }'::jsonb,
  template_map JSONB NOT NULL DEFAULT '{
    "confirmed": {"name": "order_confirmed", "language": "en"},
    "preparing": {"name": "order_preparing", "language": "en"},
    "ready": {"name": "order_ready", "language": "en"},
    "out_for_delivery": {"name": "order_out_for_delivery", "language": "en"},
    "delivered": {"name": "order_delivered", "language": "en"},
    "cancelled": {"name": "order_cancelled", "language": "en"}
  }'::jsonb,
  last_error TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_organization_whatsapp_configs_updated_at
  ON public.organization_whatsapp_configs;
CREATE TRIGGER set_organization_whatsapp_configs_updated_at
  BEFORE UPDATE ON public.organization_whatsapp_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_org_whatsapp_configs_phone_number_id
  ON public.organization_whatsapp_configs (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Idempotent outbound message queue
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  notification_id UUID REFERENCES public.notifications (id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders (id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  channel public.notification_channel NOT NULL DEFAULT 'whatsapp',
  order_status TEXT NOT NULL,
  recipient_phone TEXT,
  template_name TEXT,
  template_language TEXT NOT NULL DEFAULT 'en',
  template_params JSONB NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (
      status IN (
        'queued',
        'sending',
        'sent',
        'delivered',
        'read',
        'failed',
        'skipped'
      )
    ),
  provider_message_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

DROP TRIGGER IF EXISTS set_whatsapp_message_outbox_updated_at
  ON public.whatsapp_message_outbox;
CREATE TRIGGER set_whatsapp_message_outbox_updated_at
  BEFORE UPDATE ON public.whatsapp_message_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_org_status
  ON public.whatsapp_message_outbox (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_provider_message_id
  ON public.whatsapp_message_outbox (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_queued
  ON public.whatsapp_message_outbox (created_at)
  WHERE status = 'queued';

-- ---------------------------------------------------------------------------
-- Opt-out list (STOP replies)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'user_stop',
  UNIQUE (organization_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_outs_phone
  ON public.whatsapp_opt_outs (phone_e164);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins read own whatsapp config"
  ON public.organization_whatsapp_configs;
CREATE POLICY "Org admins read own whatsapp config"
  ON public.organization_whatsapp_configs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins upsert own whatsapp config"
  ON public.organization_whatsapp_configs;
CREATE POLICY "Org admins upsert own whatsapp config"
  ON public.organization_whatsapp_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins update own whatsapp config"
  ON public.organization_whatsapp_configs;
CREATE POLICY "Org admins update own whatsapp config"
  ON public.organization_whatsapp_configs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins read own whatsapp outbox"
  ON public.whatsapp_message_outbox;
CREATE POLICY "Org admins read own whatsapp outbox"
  ON public.whatsapp_message_outbox
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins read own whatsapp opt outs"
  ON public.whatsapp_opt_outs;
CREATE POLICY "Org admins read own whatsapp opt outs"
  ON public.whatsapp_opt_outs
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Helper: enqueue WhatsApp outbox (idempotent; callable after notify)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_whatsapp_order_status(
  p_organization_id UUID,
  p_notification_id UUID,
  p_order_id UUID,
  p_user_id UUID,
  p_order_status TEXT,
  p_recipient_phone TEXT,
  p_template_name TEXT,
  p_template_language TEXT,
  p_template_params JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_id UUID;
BEGIN
  v_key := p_order_id::text || ':' || p_order_status || ':whatsapp';

  INSERT INTO public.whatsapp_message_outbox (
    organization_id,
    notification_id,
    order_id,
    user_id,
    order_status,
    recipient_phone,
    template_name,
    template_language,
    template_params,
    idempotency_key,
    status
  )
  VALUES (
    p_organization_id,
    p_notification_id,
    p_order_id,
    p_user_id,
    p_order_status,
    p_recipient_phone,
    p_template_name,
    COALESCE(p_template_language, 'en'),
    COALESCE(p_template_params, '[]'::jsonb),
    v_key,
    'queued'
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET notification_id = COALESCE(
          EXCLUDED.notification_id,
          public.whatsapp_message_outbox.notification_id
        ),
        updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_whatsapp_order_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_whatsapp_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_whatsapp_order_status TO service_role;

-- ---------------------------------------------------------------------------
-- Full gate + enqueue (callable by customers after order status notify)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prepare_and_enqueue_whatsapp_order_status(
  p_organization_id UUID,
  p_notification_id UUID,
  p_order_id UUID,
  p_user_id UUID,
  p_order_status TEXT,
  p_recipient_phone TEXT,
  p_template_params JSONB DEFAULT '[]'::jsonb,
  p_opted_in BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.organization_whatsapp_configs%ROWTYPE;
  v_enabled BOOLEAN;
  v_template JSONB;
  v_template_name TEXT;
  v_template_language TEXT;
  v_outbox_id UUID;
BEGIN
  IF NOT public.has_feature(p_organization_id, 'whatsapp_notifications') THEN
    RETURN jsonb_build_object('result', 'stub', 'reason', 'not_entitled');
  END IF;

  SELECT * INTO v_config
  FROM public.organization_whatsapp_configs
  WHERE organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'stub', 'reason', 'no_config');
  END IF;

  IF v_config.connection_status IS DISTINCT FROM 'connected'
     OR COALESCE(v_config.token_configured, FALSE) = FALSE THEN
    RETURN jsonb_build_object('result', 'stub', 'reason', 'not_connected');
  END IF;

  v_enabled := COALESCE((v_config.enabled_statuses ->> p_order_status)::boolean, FALSE);
  IF NOT v_enabled THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'status_disabled');
  END IF;

  IF NOT COALESCE(p_opted_in, FALSE) THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_consent');
  END IF;

  IF p_recipient_phone IS NULL OR length(trim(p_recipient_phone)) = 0 THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_phone');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_opt_outs o
    WHERE o.organization_id = p_organization_id
      AND o.phone_e164 = p_recipient_phone
  ) THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'opted_out');
  END IF;

  v_template := v_config.template_map -> p_order_status;
  v_template_name := v_template ->> 'name';
  v_template_language := COALESCE(v_template ->> 'language', 'en');

  IF v_template_name IS NULL OR length(trim(v_template_name)) = 0 THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_template');
  END IF;

  v_outbox_id := public.enqueue_whatsapp_order_status(
    p_organization_id,
    p_notification_id,
    p_order_id,
    p_user_id,
    p_order_status,
    p_recipient_phone,
    v_template_name,
    v_template_language,
    COALESCE(p_template_params, '[]'::jsonb)
  );

  RETURN jsonb_build_object(
    'result', 'queued',
    'outbox_id', v_outbox_id,
    'template_name', v_template_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_and_enqueue_whatsapp_order_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_and_enqueue_whatsapp_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_and_enqueue_whatsapp_order_status TO service_role;
