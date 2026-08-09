-- Phase 2: WhatsApp conversation sessions + inbound idempotency.
-- Welcome / menu browsing over WhatsApp (ordering cart still Phase 3).

-- ---------------------------------------------------------------------------
-- Enable conversational ordering entitlement for pilot tenant
-- ---------------------------------------------------------------------------

INSERT INTO public.organization_entitlements (
  organization_id, feature_key, enabled, source, notes
)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'whatsapp_ordering',
  TRUE,
  'manual',
  'Pilot: WhatsApp welcome + menu browsing'
)
ON CONFLICT (organization_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- conversation_sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations (id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  whatsapp_user_id TEXT,
  current_state TEXT NOT NULL DEFAULT 'WELCOME'
    CHECK (
      current_state IN (
        'WELCOME',
        'BROWSING_CATEGORIES',
        'VIEWING_CATEGORY',
        'VIEWING_ITEM',
        'SUPPORT'
      )
    ),
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE (organization_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_lookup
  ON public.conversation_sessions (organization_id, phone_e164);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_expires
  ON public.conversation_sessions (expires_at);

DROP TRIGGER IF EXISTS set_conversation_sessions_updated_at
  ON public.conversation_sessions;
CREATE TRIGGER set_conversation_sessions_updated_at
  BEFORE UPDATE ON public.conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.conversation_sessions IS
  'WhatsApp conversational state per org + customer phone. DB is source of truth.';

-- ---------------------------------------------------------------------------
-- whatsapp_inbound_events (idempotency for Meta webhooks)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID
    REFERENCES public.organizations (id) ON DELETE SET NULL,
  provider_message_id TEXT NOT NULL,
  phone_e164 TEXT,
  message_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_events_org
  ON public.whatsapp_inbound_events (organization_id, processed_at DESC);

COMMENT ON TABLE public.whatsapp_inbound_events IS
  'Processed Meta inbound message IDs for idempotent webhook handling.';

-- ---------------------------------------------------------------------------
-- RLS (service role bypasses; admins can read for observability later)
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_inbound_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read conversation sessions"
  ON public.conversation_sessions;
CREATE POLICY "Admins read conversation sessions"
  ON public.conversation_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read inbound events"
  ON public.whatsapp_inbound_events;
CREATE POLICY "Admins read inbound events"
  ON public.whatsapp_inbound_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
