# Architecture Gates — Prepare Seams, Hold Features

**Product:** Taste of Andhra → multi-tenant restaurant SaaS  
**Status:** P0 seams applied (RLS + payment confirm/webhook + gates). Host tenancy / Route / Partner / AI remain **held** (flags default off).  
**Related:** [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md), Cursor master architecture (tenancy / payments / WhatsApp)

---

## 1. Goal

Make later changes (second restaurant, Razorpay Route, Meta Embedded Signup, WhatsApp billing, AI) **configuration and small provider work**, not rewrites.

Until we are ready and configured:

- Taste of Andhra keeps working as today
- Unfinished modes stay **dark** (not selectable in restaurant admin)
- Defaults always choose the **safe current path**

**Rule:** architecture ready, product dark.

---

## 2. Three layers of “can we use this?”

Every gated capability must pass **all** applicable layers. Fail any layer → hold / fallback.

| Layer | Where | Purpose |
|-------|--------|---------|
| **A. Platform flag** | Env / Master platform settings | Kill switch for unfinished platform work |
| **B. Org entitlement** | `features` + `organization_entitlements` + `has_feature()` | Commercial: is this module sold/enabled for the org? |
| **C. Connection config** | `organization_*_configs.status` | Technical: credentials present and healthy? |

```text
platform flag ON
  AND has_feature(org, feature_key)   -- when it is a sellable module
  AND config.status = 'connected'     -- when external provider required
    → use capability
  ELSE
    → current safe path OR hide UI (never half-broken)
```

Do **not** expose Route / Partner / AI in restaurant UI while only A is designed and B/C are missing.

---

## 3. Naming map

| Master architecture doc | This repo |
|-------------------------|-----------|
| `tenant_id` | `organization_id` |
| `tenants` | `organizations` |
| `tenant_payment_config` | `organization_payment_configs` (to add) |
| `tenant_whatsapp_config` | `organization_whatsapp_configs` (exists) |
| Platform admin | `platform_master` + `/master/*` |
| Restaurant admin | `organization_members` roles + `/admin/*` |

Do **not** rename tables solely to match the Cursor doc.

---

## 4. Config status vocabulary

Reuse WhatsApp-style statuses for all provider configs:

| Status | Meaning |
|--------|---------|
| `disconnected` | No credentials / not set up (default) |
| `pending` / `pending_review` | Onboarding in progress |
| `connected` | Ready to use in production paths |
| `error` | Was connected; last health check or API failed |
| `disabled` | Explicitly turned off by Master or restaurant |

**UI rule:** restaurant admins only see connect/manage when the platform flag allows that provider family. They never see modes that are not implemented.

---

## 5. Platform flags (defaults = hold)

Store as Vercel/Supabase env and/or Master platform settings. **Default all unfinished flags to `false`.**

| Flag | Default | When `false` (hold) | When `true` |
|------|---------|---------------------|-------------|
| `ENABLE_HOST_TENANT_RESOLUTION` | `false` | Always resolve to Taste of Andhra (`DEFAULT_ORGANIZATION_ID`) | Resolve org from hostname / slug |
| `ENABLE_SCOPED_ORG_ADMIN_AUTH` | `false` until RLS+memberships proven | Legacy `profiles.role` gates still work for tenant #1 | Admin/delivery require membership on active org |
| `ENABLE_SERVER_RAZORPAY_CHECKOUT` | `false` until webhook path ships | Keep current checkout path only during cutover window | Orders pay via server PaymentService + webhook |
| `ENABLE_RAZORPAY_ROUTE` | `false` | Mode `ROUTE` not selectable; no Route provider calls | Allow ROUTE only if org config connected |
| `ENABLE_META_EMBEDDED_SIGNUP` | `false` until Meta app id/secret set | Manual WhatsApp connect only | Show Embedded Signup when Meta app configured |
| `ENABLE_WHATSAPP_BILLING` | `false` | No rate-card charging / markup | Usage ledger + tenant charges |
| `ENABLE_PER_TENANT_DELIVERY_CONFIG` | `false` | Pidge uses platform env secrets | Read `organization_delivery_configs` |
| `ENABLE_AI` | `false` | No AI entry points | AIService paths allowed |
| `ENABLE_SAAS_SUBSCRIPTION_BILLING` | `false` | Plans/subscriptions manual via Master | Charge tenants for SaaS via billing provider |

**Cutover note:** `ENABLE_SERVER_RAZORPAY_CHECKOUT` may be flipped per-environment (staging first). Food payments and SaaS subscription billing remain logically separate.

---

## 6. Feature catalog keys (entitlements)

Existing keys stay as-is (`menu`, `orders`, `whatsapp_notifications`, `delivery_pidge`, …).

Add only when implementing the seam (Master catalog, `default_enabled = false` for add-ons):

| Proposed `feature_key` | Type | Default enabled | Notes |
|------------------------|------|-----------------|-------|
| `payments_razorpay` | base or add-on (decide at implement) | true for live food checkout orgs | Gates online pay module |
| `payments_razorpay_route` | add-on | **false** | Requires platform `ENABLE_RAZORPAY_ROUTE` + connected ROUTE config |
| `whatsapp_notifications` | exists | per plan | Already used |
| `whatsapp_embedded_signup` | add-on | **false** | Optional; manual connect remains |
| `whatsapp_usage_billing` | add-on | **false** | Requires `ENABLE_WHATSAPP_BILLING` |
| `delivery_pidge` | exists | false as add-on | Keep; later pair with per-tenant delivery config |
| `ai_assistant` | add-on | **false** | Requires `ENABLE_AI` |

Core modules (`menu`, `orders`, `customers`, `settings`) stay non-disableable per `CORE_FEATURE_KEYS`.

---

## 7. Runtime resolution defaults (safe path)

### 7.1 Organization

```text
IF ENABLE_HOST_TENANT_RESOLUTION
  AND hostname/slug maps to an active organization
    → organization_id = resolved org
ELSE
  → organization_id = TASTE_OF_ANDHRA_ORG_ID
```

Writes must always set `organization_id` explicitly (no silent cross-tenant inserts).

### 7.2 Payments

```text
IF ENABLE_SERVER_RAZORPAY_CHECKOUT
  AND organization_payment_configs.status = connected
  AND mode = DIRECT (or ROUTE only if flag + connected)
    → PaymentService → selected provider
ELSE IF legacy single-key path still enabled for tenant #1 cutover
  → existing path (temporary)
ELSE
  → block online pay / COD-only / clear error (never fake "paid")
```

**Immutable on each payment row:** `provider`, `payment_mode` (DIRECT|ROUTE), provider ids. Never infer history from current config.

### 7.3 WhatsApp

Already aligned: `organization_whatsapp_configs` + outbox + webhook tenant resolve by `phone_number_id`.

```text
IF status != connected → do not send; record skip/failure
IF ENABLE_META_EMBEDDED_SIGNUP AND Meta app configured → allow Embedded Signup UI
ELSE → manual connect only
```

### 7.4 Delivery

```text
IF ENABLE_PER_TENANT_DELIVERY_CONFIG AND org delivery config connected
  → tenant credentials
ELSE
  → platform Pidge env (current behavior)
```

---

## 8. Provider seams (implement once, fill later)

| Seam | Interface (conceptual) | Ship now / next | Hold implementation |
|------|------------------------|-----------------|---------------------|
| Payment | `createPayment`, `verifyPayment`, `handleWebhook`, `refundPayment`, `getPaymentStatus` | `DirectRazorpayProvider` (server) | `RazorpayRouteProvider` |
| WhatsApp | existing factory + outbox | `meta_cloud`, `mock` | BSP providers; Partner mode as config evolution |
| Delivery | `quote`, `dispatch`, `cancel`, `handleWebhook` | Pidge adapter (wrap current) | Other logistics providers |
| AI | `complete` / tool calls | none | Any model provider |

**Order / checkout / menu code must not import Razorpay or Meta SDKs directly** once Payment/WhatsApp seams are live.

---

## 9. Schema checklist

### P0 — security & payment truth (do before second live tenant)

| Item | Status in repo | Action |
|------|----------------|--------|
| RLS on legacy tables uses `is_org_admin(organization_id)` (not global `is_admin()`) | Gap | Migration + isolation tests (org A vs org B) |
| Two-org automated isolation test | Missing | CI or script: cross-read/write must fail |
| Stop trusting client `markOrderPaid` as sole truth | Gap | Server verify + Razorpay webhook idempotency |
| `payments.organization_id` + backfill from `orders` | Gap | Migration |
| `payments.provider`, `payment_mode`, `provider_order_id`, `provider_payment_id`, failure/metadata | Gap | Migration; unique on provider payment id where applicable |
| Webhook idempotency store for Razorpay events | Missing | Table or unique constraint on event/payment id |

### P1 — seams & holdable multi-tenant runtime

| Item | Status in repo | Action |
|------|----------------|--------|
| `OrganizationContext` + flag-gated host/slug resolution | Missing (hardcoded default) | Fallback to Taste of Andhra when flag off |
| Auth memberships for active org | Gap | Load `organization_members`; gate `/admin` when scoped auth flag on |
| `organization_payment_configs` | Missing | Create; default `mode=DIRECT`, `status=disconnected` |
| Seed tenant #1 payment config when keys exist | — | `connected` + DIRECT for Taste of Andhra |
| `audit_logs` for config / role / org status changes | Missing | No secrets in old/new values |
| Platform flags documented in `.env.example` | Partial | Add gate names with defaults false |
| Feature keys for Route / Embedded Signup / WA billing / AI | Mostly missing | Insert as add-ons, `default_enabled=false` |

### P2 — when commercially ready (still gated)

| Item | Action |
|------|--------|
| Razorpay Route provider + onboarding | Only if `ENABLE_RAZORPAY_ROUTE` |
| Meta Embedded Signup polish | Only if app secrets + `ENABLE_META_EMBEDDED_SIGNUP` |
| `organization_delivery_configs` | Only if leaving shared Pidge |
| `whatsapp_rate_cards` + usage ledger | Only if `ENABLE_WHATSAPP_BILLING` |
| SaaS subscription charging | Only if `ENABLE_SAAS_SUBSCRIPTION_BILLING` |
| `AIService` | Only if `ENABLE_AI` |

### Explicit non-goals for “architecture ready”

- Renaming `organizations` → `tenants`
- Implementing Gupshup/Interakt/WATI
- Second food payment gateway
- Big-bang cutover of all tenants to Route
- Exposing unfinished toggles to restaurant users

---

## 10. `organization_payment_configs` (target shape)

Conceptual only until P1 migration:

```text
id
organization_id          UNIQUE per provider row policy as needed
provider                 -- razorpay
mode                     -- DIRECT | ROUTE (default DIRECT)
status                   -- disconnected | pending | connected | error | disabled
onboarding_status
provider_account_reference
credential_reference     -- pointer / secret store ref; not plaintext secret in app DB if avoidable
created_at
updated_at
```

ROUTE must not be writable/selectable unless `ENABLE_RAZORPAY_ROUTE` is on and Route onboarding completed.

---

## 11. `audit_logs` (target shape)

```text
id
organization_id          -- null for pure platform actions
user_id
action
entity_type
entity_id
old_value                -- jsonb, redacted
new_value                -- jsonb, redacted
created_at
```

Log at least: payment mode/provider changes, WhatsApp config connect/disconnect, org activate/suspend, role/membership changes, feature entitlement overrides.

---

## 12. Go-live gates (when to flip flags)

| Milestone | Required before |
|-----------|-----------------|
| Second **internal** test org | P0 RLS + isolation tests green |
| `ENABLE_HOST_TENANT_RESOLUTION` | Org context + storefront/admin queries scoped; wildcard DNS/SSL ready |
| `ENABLE_SCOPED_ORG_ADMIN_AUTH` | All real admins have `organization_members` rows |
| `ENABLE_SERVER_RAZORPAY_CHECKOUT` | Webhook verified in staging; no paid order without provider confirmation |
| `ENABLE_RAZORPAY_ROUTE` | Route commercial + technical readiness; at least one pilot org |
| Second **paying** restaurant | P0 + P1 payments + host resolution + scoped auth + 2-week soak on test org |
| WhatsApp billing / AI / SaaS auto-billing | Explicit product decision + flags |

---

## 13. Implementation sequence (approved direction)

1. **P0 RLS + isolation tests** — invisible to customers; foundation  
2. **P0/P1 server PaymentService + webhook** — replace client payment truth  
3. **P1 org context with host flag default off** — multi-tenant ready, single-brand behavior  
4. **P1 payment config table + DIRECT only** — Route column exists, UI hidden  
5. **P1 audit_logs + `.env.example` flags**  
6. **Hold:** Route, Partner-only flows, WA billing, AI, per-tenant Pidge until intentionally enabled  

WhatsApp multi-tenant path is already ahead — extend with flags; do not rebuild.

---

## 14. Success criteria for “architecture ready”

- [ ] Unfinished capabilities are unreachable without flags + connected config  
- [ ] Flipping a flag off restores previous safe behavior without deploy of new business logic  
- [ ] Adding Route later = new provider + config rows, not Order module rewrite  
- [ ] Historical payments keep original `payment_mode`  
- [ ] Org A cannot read/write Org B (tested)  
- [ ] Taste of Andhra keeps working with all new flags at default `false`

---

## 15. Next engineering action

When implementation is approved, start with **P0 only**:

1. RLS rewrite migration sketch  
2. Two-org isolation test script  
3. Razorpay webhook Edge Function design (idempotent)  

Do not implement Route, AI, or host resolution go-live in the same change set.

---

*This document is the hold/ready contract. Prefer updating flags and checklists here when seams land, rather than forking a third architecture narrative.*
