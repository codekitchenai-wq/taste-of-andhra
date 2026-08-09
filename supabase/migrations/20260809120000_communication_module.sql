-- Communication module foundation: provider-agnostic settings, templates,
-- usage ledger, multi-provider outbox columns, generalized enqueue RPC.
-- Evolves existing WhatsApp (Meta) tables; does not break Meta path.

-- ---------------------------------------------------------------------------
-- Feature catalog: SMS notifications add-on
-- ---------------------------------------------------------------------------

INSERT INTO public.features (key, name, description, is_add_on, default_enabled, display_order)
VALUES
  (
    'sms_notifications',
    'SMS notifications',
    'Order status updates via SMS (provider-agnostic)',
    TRUE,
    FALSE,
    135
  )
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- communication_settings (one row per organization)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_provider TEXT NOT NULL DEFAULT 'meta_cloud'
    CHECK (
      whatsapp_provider IN ('mock', 'meta_cloud', 'gupshup', 'bsp_other')
    ),
  sms_provider TEXT NOT NULL DEFAULT 'mock'
    CHECK (sms_provider IN ('mock', 'gupshup', 'msg91', 'twilio', 'other')),
  fallback_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_communication_settings_updated_at
  ON public.communication_settings;
CREATE TRIGGER set_communication_settings_updated_at
  BEFORE UPDATE ON public.communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Seed from existing WhatsApp configs (connection still gated by Meta config)
INSERT INTO public.communication_settings (
  organization_id,
  whatsapp_enabled,
  whatsapp_provider,
  sms_enabled,
  sms_provider
)
SELECT
  c.organization_id,
  TRUE,
  CASE
    WHEN c.provider = 'bsp_gupshup' THEN 'gupshup'
    WHEN c.provider = 'meta_cloud' THEN 'meta_cloud'
    ELSE 'meta_cloud'
  END,
  FALSE,
  'mock'
FROM public.organization_whatsapp_configs c
ON CONFLICT (organization_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- communication_provider_accounts (non-secret public config + secret ref)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communication_provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  channel TEXT NOT NULL
    CHECK (channel IN ('whatsapp', 'sms', 'email')),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (
      status IN ('disconnected', 'pending_review', 'connected', 'error')
    ),
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Points at Edge secret name or org-scoped secret store; never raw secrets.
  secret_ref TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, channel, provider)
);

DROP TRIGGER IF EXISTS set_communication_provider_accounts_updated_at
  ON public.communication_provider_accounts;
CREATE TRIGGER set_communication_provider_accounts_updated_at
  BEFORE UPDATE ON public.communication_provider_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- communication_templates (internal event → provider template mapping)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  channel TEXT NOT NULL
    CHECK (channel IN ('whatsapp', 'sms', 'email')),
  event_type TEXT NOT NULL,
  template_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_template_id TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  variable_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'pending_approval')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_templates_org_resolve
  ON public.communication_templates (
    organization_id,
    channel,
    event_type,
    provider
  )
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_templates_platform_resolve
  ON public.communication_templates (
    channel,
    event_type,
    provider
  )
  WHERE organization_id IS NULL;

DROP TRIGGER IF EXISTS set_communication_templates_updated_at
  ON public.communication_templates;
CREATE TRIGGER set_communication_templates_updated_at
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Platform defaults (Meta / mock WhatsApp + mock SMS template names)
INSERT INTO public.communication_templates (
  organization_id, channel, event_type, template_key, provider,
  provider_template_id, language, status
)
SELECT v.organization_id, v.channel, v.event_type, v.template_key, v.provider,
       v.provider_template_id, v.language, v.status
FROM (
  VALUES
    (NULL::uuid, 'whatsapp', 'ORDER_CONFIRMED', 'order_confirmed', 'meta_cloud', 'order_confirmed', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_PREPARING', 'order_preparing', 'meta_cloud', 'order_preparing', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_READY', 'order_ready', 'meta_cloud', 'order_ready', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_OUT_FOR_DELIVERY', 'order_out_for_delivery', 'meta_cloud', 'order_out_for_delivery', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_DELIVERED', 'order_delivered', 'meta_cloud', 'order_delivered', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_CANCELLED', 'order_cancelled', 'meta_cloud', 'order_cancelled', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_CREATED', 'order_created', 'meta_cloud', 'order_placed', 'en', 'inactive'),
    (NULL::uuid, 'whatsapp', 'ORDER_CONFIRMED', 'order_confirmed', 'mock', 'order_confirmed', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_PREPARING', 'order_preparing', 'mock', 'order_preparing', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_READY', 'order_ready', 'mock', 'order_ready', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_OUT_FOR_DELIVERY', 'order_out_for_delivery', 'mock', 'order_out_for_delivery', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_DELIVERED', 'order_delivered', 'mock', 'order_delivered', 'en', 'active'),
    (NULL::uuid, 'whatsapp', 'ORDER_CANCELLED', 'order_cancelled', 'mock', 'order_cancelled', 'en', 'active'),
    (NULL::uuid, 'sms', 'ORDER_CONFIRMED', 'order_confirmed', 'mock', 'order_confirmed_sms', 'en', 'active'),
    (NULL::uuid, 'sms', 'ORDER_READY', 'order_ready', 'mock', 'order_ready_sms', 'en', 'active'),
    (NULL::uuid, 'sms', 'ORDER_CANCELLED', 'order_cancelled', 'mock', 'order_cancelled_sms', 'en', 'active')
) AS v(
  organization_id, channel, event_type, template_key, provider,
  provider_template_id, language, status
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.communication_templates t
  WHERE t.organization_id IS NULL
    AND t.channel = v.channel
    AND t.event_type = v.event_type
    AND t.provider = v.provider
);

-- ---------------------------------------------------------------------------
-- communication_usage (billing-ready normalized ledger)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communication_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  channel TEXT NOT NULL
    CHECK (channel IN ('whatsapp', 'sms', 'email')),
  provider TEXT NOT NULL,
  outbox_id UUID REFERENCES public.whatsapp_message_outbox (id) ON DELETE SET NULL,
  units NUMERIC(12, 4) NOT NULL DEFAULT 1,
  provider_cost_units NUMERIC(12, 4),
  billing_period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_usage_org_period
  ON public.communication_usage (organization_id, billing_period, channel);

CREATE INDEX IF NOT EXISTS idx_communication_usage_outbox
  ON public.communication_usage (outbox_id)
  WHERE outbox_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Widen outbox for multi-provider / multi-channel communication
-- ---------------------------------------------------------------------------

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'meta_cloud';

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS event_type TEXT;

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

ALTER TABLE public.whatsapp_message_outbox
  ADD COLUMN IF NOT EXISTS error_code TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_provider
  ON public.whatsapp_message_outbox (organization_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_retry
  ON public.whatsapp_message_outbox (next_attempt_at)
  WHERE status IN ('queued', 'failed') AND next_attempt_at IS NOT NULL;

-- Backfill event_type from order_status where missing
UPDATE public.whatsapp_message_outbox
SET event_type = CASE order_status
  WHEN 'pending' THEN 'ORDER_CREATED'
  WHEN 'confirmed' THEN 'ORDER_CONFIRMED'
  WHEN 'preparing' THEN 'ORDER_PREPARING'
  WHEN 'ready' THEN 'ORDER_READY'
  WHEN 'out_for_delivery' THEN 'ORDER_OUT_FOR_DELIVERY'
  WHEN 'delivered' THEN 'ORDER_DELIVERED'
  WHEN 'cancelled' THEN 'ORDER_CANCELLED'
  ELSE upper(order_status)
END
WHERE event_type IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins read communication settings"
  ON public.communication_settings;
CREATE POLICY "Org admins read communication settings"
  ON public.communication_settings
  FOR SELECT TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins upsert communication settings"
  ON public.communication_settings;
CREATE POLICY "Org admins upsert communication settings"
  ON public.communication_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins update communication settings"
  ON public.communication_settings;
CREATE POLICY "Org admins update communication settings"
  ON public.communication_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins read provider accounts"
  ON public.communication_provider_accounts;
CREATE POLICY "Org admins read provider accounts"
  ON public.communication_provider_accounts
  FOR SELECT TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins upsert provider accounts"
  ON public.communication_provider_accounts;
CREATE POLICY "Org admins upsert provider accounts"
  ON public.communication_provider_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins update provider accounts"
  ON public.communication_provider_accounts;
CREATE POLICY "Org admins update provider accounts"
  ON public.communication_provider_accounts
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  )
  WITH CHECK (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Authenticated read communication templates"
  ON public.communication_templates;
CREATE POLICY "Authenticated read communication templates"
  ON public.communication_templates
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

DROP POLICY IF EXISTS "Org admins manage own templates"
  ON public.communication_templates;
CREATE POLICY "Org admins manage own templates"
  ON public.communication_templates
  FOR ALL TO authenticated
  USING (
    organization_id IS NOT NULL
    AND (
      public.is_platform_master()
      OR public.is_org_admin(organization_id)
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND (
      public.is_platform_master()
      OR public.is_org_admin(organization_id)
    )
  );

DROP POLICY IF EXISTS "Org admins read communication usage"
  ON public.communication_usage;
CREATE POLICY "Org admins read communication usage"
  ON public.communication_usage
  FOR SELECT TO authenticated
  USING (
    public.is_platform_master()
    OR public.is_org_admin(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Helpers: event mapping + template resolution + enqueue
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.order_status_to_communication_event(
  p_order_status TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_order_status))
    WHEN 'pending' THEN 'ORDER_CREATED'
    WHEN 'confirmed' THEN 'ORDER_CONFIRMED'
    WHEN 'preparing' THEN 'ORDER_PREPARING'
    WHEN 'ready' THEN 'ORDER_READY'
    WHEN 'out_for_delivery' THEN 'ORDER_OUT_FOR_DELIVERY'
    WHEN 'delivered' THEN 'ORDER_DELIVERED'
    WHEN 'cancelled' THEN 'ORDER_CANCELLED'
    ELSE upper(replace(trim(p_order_status), ' ', '_'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_communication_message(
  p_organization_id UUID,
  p_notification_id UUID,
  p_order_id UUID,
  p_user_id UUID,
  p_channel TEXT,
  p_provider TEXT,
  p_order_status TEXT,
  p_event_type TEXT,
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
  v_key :=
    p_order_id::text || ':' ||
    COALESCE(NULLIF(p_event_type, ''), p_order_status) || ':' ||
    p_channel;

  INSERT INTO public.whatsapp_message_outbox (
    organization_id,
    notification_id,
    order_id,
    user_id,
    channel,
    provider,
    order_status,
    event_type,
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
    p_channel::public.notification_channel,
    p_provider,
    p_order_status,
    p_event_type,
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

REVOKE ALL ON FUNCTION public.enqueue_communication_message FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_communication_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_communication_message TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_and_enqueue_communication(
  p_organization_id UUID,
  p_notification_id UUID,
  p_order_id UUID,
  p_user_id UUID,
  p_order_status TEXT,
  p_channel TEXT,
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
  v_settings public.communication_settings%ROWTYPE;
  v_wa_config public.organization_whatsapp_configs%ROWTYPE;
  v_has_settings BOOLEAN := FALSE;
  v_has_wa_config BOOLEAN := FALSE;
  v_has_template BOOLEAN := FALSE;
  v_provider TEXT;
  v_event_type TEXT;
  v_template_name TEXT;
  v_template_language TEXT;
  v_provider_template_id TEXT;
  v_template_key TEXT;
  v_outbox_id UUID;
BEGIN
  IF p_channel NOT IN ('whatsapp', 'sms') THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'unsupported_channel');
  END IF;

  v_event_type := public.order_status_to_communication_event(p_order_status);

  SELECT * INTO v_settings
  FROM public.communication_settings
  WHERE organization_id = p_organization_id;
  v_has_settings := FOUND;

  IF p_channel = 'whatsapp' THEN
    IF NOT public.has_feature(p_organization_id, 'whatsapp_notifications') THEN
      RETURN jsonb_build_object('result', 'stub', 'reason', 'not_entitled');
    END IF;

    IF v_has_settings THEN
      IF NOT v_settings.whatsapp_enabled THEN
        RETURN jsonb_build_object('result', 'skipped', 'reason', 'channel_disabled');
      END IF;
      v_provider := v_settings.whatsapp_provider;
    ELSE
      v_provider := 'meta_cloud';
    END IF;

    -- Meta path still requires org WhatsApp config when provider is meta_cloud
    IF v_provider = 'meta_cloud' THEN
      SELECT * INTO v_wa_config
      FROM public.organization_whatsapp_configs
      WHERE organization_id = p_organization_id;
      v_has_wa_config := FOUND;

      IF NOT v_has_wa_config THEN
        RETURN jsonb_build_object('result', 'stub', 'reason', 'no_config');
      END IF;

      IF v_wa_config.connection_status IS DISTINCT FROM 'connected'
         OR COALESCE(v_wa_config.token_configured, FALSE) = FALSE THEN
        RETURN jsonb_build_object('result', 'stub', 'reason', 'not_connected');
      END IF;

      IF NOT COALESCE(
        (v_wa_config.enabled_statuses ->> p_order_status)::boolean,
        FALSE
      ) THEN
        RETURN jsonb_build_object('result', 'skipped', 'reason', 'status_disabled');
      END IF;

      v_template_name := v_wa_config.template_map -> p_order_status ->> 'name';
      v_template_language := COALESCE(
        v_wa_config.template_map -> p_order_status ->> 'language',
        'en'
      );
    ELSIF v_provider = 'mock' THEN
      NULL; -- templates resolved below
    ELSE
      -- gupshup / others: require connected provider account
      IF NOT EXISTS (
        SELECT 1
        FROM public.communication_provider_accounts a
        WHERE a.organization_id = p_organization_id
          AND a.channel = 'whatsapp'
          AND a.provider = v_provider
          AND a.status = 'connected'
      ) THEN
        RETURN jsonb_build_object('result', 'stub', 'reason', 'not_connected');
      END IF;
    END IF;

  ELSE
    -- SMS
    IF NOT public.has_feature(p_organization_id, 'sms_notifications') THEN
      -- Allow mock SMS in local/dev when settings explicitly enable it
      IF NOT v_has_settings
         OR NOT v_settings.sms_enabled
         OR v_settings.sms_provider IS DISTINCT FROM 'mock' THEN
        RETURN jsonb_build_object('result', 'stub', 'reason', 'not_entitled');
      END IF;
    END IF;

    IF NOT v_has_settings OR NOT v_settings.sms_enabled THEN
      RETURN jsonb_build_object('result', 'skipped', 'reason', 'channel_disabled');
    END IF;

    v_provider := v_settings.sms_provider;
  END IF;

  IF NOT COALESCE(p_opted_in, FALSE) THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_consent');
  END IF;

  IF p_recipient_phone IS NULL OR length(trim(p_recipient_phone)) = 0 THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_phone');
  END IF;

  IF p_channel = 'whatsapp' AND EXISTS (
    SELECT 1
    FROM public.whatsapp_opt_outs o
    WHERE o.organization_id = p_organization_id
      AND o.phone_e164 = p_recipient_phone
  ) THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'opted_out');
  END IF;

  -- Resolve template: org-specific first, then platform default
  IF v_template_name IS NULL OR length(trim(v_template_name)) = 0 THEN
    SELECT t.provider_template_id, t.language, t.template_key
    INTO v_provider_template_id, v_template_language, v_template_key
    FROM public.communication_templates t
    WHERE t.channel = p_channel
      AND t.event_type = v_event_type
      AND t.provider = v_provider
      AND t.status = 'active'
      AND t.organization_id = p_organization_id
    LIMIT 1;
    v_has_template := FOUND;

    IF NOT v_has_template THEN
      SELECT t.provider_template_id, t.language, t.template_key
      INTO v_provider_template_id, v_template_language, v_template_key
      FROM public.communication_templates t
      WHERE t.channel = p_channel
        AND t.event_type = v_event_type
        AND t.provider = v_provider
        AND t.status = 'active'
        AND t.organization_id IS NULL
      LIMIT 1;
      v_has_template := FOUND;
    END IF;

    IF v_has_template THEN
      v_template_name := COALESCE(v_provider_template_id, v_template_key);
      v_template_language := COALESCE(v_template_language, 'en');
    END IF;
  END IF;

  IF v_template_name IS NULL OR length(trim(v_template_name)) = 0 THEN
    RETURN jsonb_build_object('result', 'skipped', 'reason', 'no_template');
  END IF;

  v_outbox_id := public.enqueue_communication_message(
    p_organization_id,
    p_notification_id,
    p_order_id,
    p_user_id,
    p_channel,
    v_provider,
    p_order_status,
    v_event_type,
    p_recipient_phone,
    v_template_name,
    COALESCE(v_template_language, 'en'),
    COALESCE(p_template_params, '[]'::jsonb)
  );

  RETURN jsonb_build_object(
    'result', 'queued',
    'outbox_id', v_outbox_id,
    'provider', v_provider,
    'channel', p_channel,
    'event_type', v_event_type,
    'template_name', v_template_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_and_enqueue_communication FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_and_enqueue_communication TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_and_enqueue_communication TO service_role;

-- Keep legacy WhatsApp RPC as a thin wrapper for existing callers
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
BEGIN
  RETURN public.prepare_and_enqueue_communication(
    p_organization_id,
    p_notification_id,
    p_order_id,
    p_user_id,
    p_order_status,
    'whatsapp',
    p_recipient_phone,
    p_template_params,
    p_opted_in
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_and_enqueue_whatsapp_order_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_and_enqueue_whatsapp_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_and_enqueue_whatsapp_order_status TO service_role;

-- Also update legacy enqueue to set provider/event_type when used directly
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
BEGIN
  RETURN public.enqueue_communication_message(
    p_organization_id,
    p_notification_id,
    p_order_id,
    p_user_id,
    'whatsapp',
    'meta_cloud',
    p_order_status,
    public.order_status_to_communication_event(p_order_status),
    p_recipient_phone,
    p_template_name,
    p_template_language,
    p_template_params
  );
END;
$$;
