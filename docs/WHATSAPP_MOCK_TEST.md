# WhatsApp mock test (Phase B/C before Meta)

Use this **before** creating a production Meta account. Conversation and outbound sends short-circuit Graph API when:

- Edge secret `WHATSAPP_PROVIDER=mock`, **or**
- Org access token is exactly `mock` / starts with `mock:`

## 1. Apply DB migrations

```bash
supabase db push
# or apply in order:
# 20260808120000_whatsapp_multi_tenant.sql
# 20260809120000_communication_module.sql
# 20260809130000_menu_modifiers.sql
# 20260809140000_whatsapp_conversation_sessions.sql
```

Confirm pilot org has `whatsapp_notifications` + `whatsapp_ordering` entitlements.

## 2. Secrets + deploy (mock)

```bash
supabase secrets set WHATSAPP_PROVIDER=mock SMS_PROVIDER=mock PUBLIC_STOREFRONT_URL=http://localhost:5173

supabase functions deploy whatsapp-connect
supabase functions deploy whatsapp-dispatch
supabase functions deploy communication-dispatch
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy whatsapp-conversation-sim
supabase functions deploy whatsapp-otp --no-verify-jwt
```

## 3. Connect mock credentials in Admin

**Admin → Settings → WhatsApp**

| Field | Value |
|-------|--------|
| Provider | Meta Cloud API (storage shape; sends stay mock via token/env) |
| Display phone | `+91 9000000000` |
| WABA ID | `mock_waba` |
| Phone Number ID | `mock_phone` |
| Access token | `mock` |
| Verify token | optional |

Click **Connect / save**. Connection should show connected / token saved. Graph is never called.

## 4. Simulate conversation (Hi → menu → dish)

Call `whatsapp-conversation-sim` with a logged-in admin JWT (`Authorization: Bearer <access_token>`).

Organization id for Taste of Andhra pilot: `a0000000-0000-4000-8000-000000000001`

```bash
# 1) Welcome
curl -s "$SUPABASE_URL/functions/v1/whatsapp-conversation-sim" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"organizationId\":\"a0000000-0000-4000-8000-000000000001\",\"from\":\"+919876543210\",\"text\":\"hi\"}"

# 2) View menu (use interactiveId from welcome buttons, or:)
curl -s "$SUPABASE_URL/functions/v1/whatsapp-conversation-sim" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"organizationId\":\"a0000000-0000-4000-8000-000000000001\",\"from\":\"+919876543210\",\"interactiveId\":\"act:view_menu\"}"

# 3) Pick a category — copy a cat:<uuid> id from send.raw.request in step 2
# 4) Pick a dish — copy dish:<uuid> from step 3
```

Expect in each response:

- `ok: true`
- `send.raw.mock: true` and the interactive payload Meta would have received
- `session.current_state` progressing: `WELCOME` → `BROWSING_CATEGORIES` → `VIEWING_CATEGORY` → `VIEWING_ITEM`

Also check Supabase logs for `[whatsapp:mock] outbound`.

## 5. Mock outbound status notification

1. Place a checkout order with WhatsApp updates opted in (any phone ≥10 digits).
2. Change order status in Admin to a toggled status (e.g. confirmed).
3. Outbox row should appear; dispatch with mock provider marks sent with `mock_wa_*` id (no Meta).

## 6. Unit tests (always available)

```bash
npm test -- src/utils/whatsappConversation.test.ts
```

## Pass criteria before Meta (Part A)

- [ ] Migrations applied; entitlements on  
- [ ] Mock connect works  
- [ ] Sim: hi → categories → dishes → dish detail  
- [ ] Session rows update in `conversation_sessions`  
- [ ] Status enqueue + mock dispatch does not call Graph  
- [ ] Ready to follow [WHATSAPP_META_SETUP.md](./WHATSAPP_META_SETUP.md)
