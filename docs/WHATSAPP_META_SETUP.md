# WhatsApp Meta account setup + go-live

**Audience:** Platform owner / restaurant admin connecting Taste of Andhra to Meta WhatsApp Cloud API.  
**Sequence:** Finish Phase 2 + mock tests first (`docs/WHATSAPP_MOCK_TEST.md`), then follow this guide for production Meta.

Related: [WHATSAPP_COMMERCE_ARCHITECTURE.md](./WHATSAPP_COMMERCE_ARCHITECTURE.md) · `.env.example` (communication secrets)

---

## What you will end up with

| Item | Where it is used |
|------|------------------|
| Meta Business Portfolio | Owns the WhatsApp Business Account (WABA) |
| Meta Developer App | Hosts the WhatsApp product + webhook |
| WABA ID | Admin → WhatsApp → WABA ID |
| Phone Number ID | Admin → WhatsApp → Phone Number ID |
| Display phone | Customer-facing number shown in chat |
| Permanent access token | Saved via `whatsapp-connect` (never in browser SELECT) |
| Webhook verify token | Shared secret you invent; Meta + our Edge Function |
| Approved message templates | Order-status utility messages |

---

## Part 1 — Create Meta Business + Developer App

### 1. Meta Business Suite / Business Manager

1. Go to [business.facebook.com](https://business.facebook.com/) and create or open a **Business Portfolio**.
2. Complete business verification when Meta asks (needed for production messaging limits; test numbers can start earlier).
3. Under **Settings → Business settings → WhatsApp accounts**, note that you will attach a WABA in the next steps (or create one from the developer console).

### 2. Meta Developer App

1. Open [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App**.
2. Choose type suited for business / other (Meta’s wizard changes over time) and attach it to your Business Portfolio.
3. In the app dashboard, add the **WhatsApp** product → **API Setup** (Cloud API).

### 3. WhatsApp Cloud API — test number (start here)

1. On **API Setup**, Meta provides a **test phone number** and a temporary token.
2. Add your personal WhatsApp number under **To** (allowed list) so you can receive test messages.
3. Copy for later:
   - **Phone number ID** (not the display number)
   - **WhatsApp Business Account ID** (WABA ID)
   - Temporary token (fine for smoke tests only — expires)

### 4. Production phone number (when ready)

1. In WhatsApp → **API Setup** / **Phone numbers**, add a real business number (new SIM or migrate an existing WhatsApp Business number — follow Meta’s current migration wizard carefully).
2. Complete OTP verification.
3. Display name must match your restaurant branding (Meta reviews display names).
4. Prefer a **System User** permanent token (Business Settings → System users → Generate token) with permissions such as `whatsapp_business_messaging` and `whatsapp_business_management`. Store it only in Admin Connect / secrets — never commit it.

---

## Part 2 — Message templates (order notifications)

Create **Utility** templates on the WABA (WhatsApp Manager → Message templates). Names must match our defaults (language `en` unless you change `template_map` in Admin):

| Template name | Typical body variables (examples) |
|---------------|-----------------------------------|
| `order_confirmed` | order number, restaurant name |
| `order_preparing` | order number |
| `order_ready` | order number |
| `order_out_for_delivery` | order number |
| `order_delivered` | order number |
| `order_cancelled` | order number |

Notes:

- Exact variable count/order must match what `whatsapp-dispatch` / notification enqueue sends — after first live send, check outbox `last_error` if Meta rejects parameter mismatch.
- Wait until status is **Approved** before relying on Send test.
- Conversational **buttons/lists** for Phase 2 menu browse do **not** need templates (session messages within the 24h customer-care window). Templates are for outbound status pushes.

---

## Part 3 — Webhook (inbound + delivery receipts)

### 1. Deploy our webhook

```bash
supabase secrets set WHATSAPP_WEBHOOK_VERIFY_TOKEN=pick-a-long-random-string
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

Webhook URL:

```text
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/whatsapp-webhook
```

`--no-verify-jwt` is required: Meta cannot send a Supabase user JWT.

### 2. Configure in Meta

1. App → WhatsApp → **Configuration** → Webhook → **Edit**.
2. Callback URL: the URL above.
3. Verify token: **exactly** the same string as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (or the per-org token saved in Admin).
4. Subscribe to fields: at least **`messages`** (covers inbound text/interactive and status updates in Cloud API payloads).

### 3. Verify

Meta sends GET with `hub.mode`, `hub.verify_token`, `hub.challenge`. Our function returns the challenge when the token matches. If verification fails, check secrets and that the function is deployed with JWT verification off.

---

## Part 4 — Connect Taste of Andhra

### 1. Entitlements

Pilot org is seeded in migrations for:

- `whatsapp_notifications` — status templates  
- `whatsapp_ordering` — Hi/Menu browse  

For other orgs, enable the same features from Master → Features / Tenants.

### 2. Edge secrets + functions

```bash
supabase secrets set \
  WHATSAPP_PROVIDER=meta_cloud \
  SMS_PROVIDER=mock \
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=<same-as-meta> \
  PUBLIC_STOREFRONT_URL=https://your-production-domain.com

supabase functions deploy whatsapp-connect
supabase functions deploy whatsapp-dispatch
supabase functions deploy communication-dispatch
supabase functions deploy whatsapp-webhook --no-verify-jwt
# optional: Embedded Signup later
# supabase functions deploy whatsapp-embedded-signup
```

Apply migrations if not already applied (see `.env.example`).

### 3. Admin → Settings → WhatsApp

1. Provider: **Meta Cloud API**
2. Paste **WABA ID**, **Phone Number ID**, **display phone**, **permanent access token**, verify token (optional if platform secret is set)
3. **Connect / save**
4. Toggle which order statuses send templates → **Save status preferences**
5. **Send test** to a number on the allowed list / your phone

### 4. End-to-end smoke test

1. Place a web order with **WhatsApp updates** opted in and a valid phone.
2. Move the order through a toggled status in Admin.
3. Confirm customer receives the template.
4. In Master observability / outbox, status should move toward delivered (webhook updates).
5. Text **Hi** to the business number → welcome buttons → **View Menu** → category → dish (requires `whatsapp_ordering`).
6. Reply **STOP** → opt-out row + confirmation text.

---

## Part 5 — Checklist (print / ticket)

- [ ] Business Portfolio created  
- [ ] Developer App + WhatsApp product  
- [ ] Test number works with temporary token  
- [ ] Permanent System User token created  
- [ ] Production number verified (when leaving test)  
- [ ] Six utility templates approved  
- [ ] Webhook verified (`whatsapp-webhook`, no JWT)  
- [ ] Migrations applied  
- [ ] Secrets set (`WHATSAPP_PROVIDER=meta_cloud`, verify token, storefront URL)  
- [ ] Functions deployed  
- [ ] Admin Connect shows `connected`  
- [ ] Test template delivered  
- [ ] Live order status message delivered  
- [ ] Conversation browse works (if ordering entitlement on)  
- [ ] STOP opt-out works  

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Webhook verification 403 | Verify token mismatch or JWT still required on function |
| Send fails “template not found” | Name/language mismatch or not approved |
| Send fails parameter error | Body variable count ≠ template |
| Conversation silent | `whatsapp_ordering` off, or wrong Phone Number ID on inbound |
| Duplicate handling | Normal — inbound events are idempotent by Meta message id |
| Token works then dies | Temporary token expired — switch to System User token |

---

## After Meta is live

1. Keep SMS on `mock` until WhatsApp notification volume is stable.  
2. Phase 3 (cart-in-chat) builds on the same webhook + sessions — do not bypass tenant isolation.  
3. Embedded Signup (`whatsapp-embedded-signup` + `WHATSAPP_META_APP_*`) is optional UX for multi-restaurant onboarding later.
