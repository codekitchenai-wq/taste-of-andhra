# WhatsApp Restaurant Commerce — Architecture Delta

**Status:** Approved 2026-08-09 · Phase 1 done · **Phase 2 conversation complete (mock-testable)** · Meta go-live: [WHATSAPP_META_SETUP.md](./WHATSAPP_META_SETUP.md) · Mock path: [WHATSAPP_MOCK_TEST.md](./WHATSAPP_MOCK_TEST.md)  
**Base:** [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md)  
**Spec:** WhatsApp Restaurant Commerce SaaS Cursor Spec v0.1

---

## 1. Positioning

Taste of Andhra is already a **web-first multi-tenant restaurant commerce SaaS** (Vite + React + Supabase). WhatsApp work to date is **outbound order-status notifications**. This document describes the **delta** to become a WhatsApp commerce platform without rewriting the core.

**Approved decisions**

| Decision | Choice |
|----------|--------|
| Customer UX | Dual: web storefront + WhatsApp (WhatsApp is additive) |
| Stack | Stay Vite + Supabase modular monolith (no Next.js migration) |
| Tenant key | Keep `organization_id` (do not rename to `tenant_id`) |
| Ordering UX (later) | Interactive lists/buttons first; Flows/Catalog later |
| AI | Deferred until after conversational ordering |
| Soft delete | Keep `is_active` / `is_available` deactivation (already used) |
| Distance | Verify routing vs Haversine in delivery phase |

---

## 2. Target shape

```text
Customer WhatsApp → webhook → Message Router
                              ├─ Deterministic Flow Engine (sessions)
                              └─ AI Gateway (optional, metered)  [Phase 7+]
                                    ↓
                         Existing core services
                    (menu, cart, orders, payment, delivery)
                                    ↓
                    NotificationService → WhatsApp outbox (exists)
```

Web and WhatsApp must share the same server-side cart/order/payment/delivery logic. Never trust client or LLM totals.

---

## 3. Phase map (repo-relative)

| Phase | Focus | Notes |
|-------|--------|-------|
| 0 | Foundation | Multi-tenant schema largely done; harden FE defaults over time |
| **1** | Menu completeness | Modifiers + cart/order snapshots — **done** |
| **2** | WhatsApp conversation | Sessions, inbound router, welcome/menu — **done** (mock via token/`WHATSAPP_PROVIDER=mock` + `whatsapp-conversation-sim`) |
| 3 | WhatsApp ordering | Cart-in-chat → existing cart/order services |
| 4 | Payments in-chat | Reuse Razorpay/COD paths |
| 5 | Delivery pricing | Spec engines + driving-distance verification |
| 6 | Notifications | Already strong via outbox |
| 7 | AI | Hybrid intent router + `ai_usage` |
| 8 | Admin WhatsApp | Verified phones + confirmations |
| 9 | SaaS billing | Activate subscription collection |
| 10 | Hardening | Isolation / webhook / idempotency tests |

---

## 4b. Phase 2 schema (conversation)

```text
conversation_sessions
  organization_id + phone_e164 (unique)
  current_state: WELCOME | BROWSING_CATEGORIES | VIEWING_CATEGORY | VIEWING_ITEM | SUPPORT
  context_json, expires_at (24h sliding)

whatsapp_inbound_events
  provider_message_id UNIQUE  -- webhook idempotency
```

**Flow (deterministic):** Hi/Menu → welcome buttons → category list → dish list → dish detail.  
Cart/checkout in WhatsApp is Phase 3 (`Order Food` button currently explains that).

**Gate:** `has_feature(org, 'whatsapp_ordering')`. Pilot org entitlement seeded in migration.

**Runtime:** `supabase/functions/whatsapp-webhook` + `_shared/whatsapp_conversation.ts`  
Interactive sends: `sendWhatsAppButtons` / `sendWhatsAppList` / `sendWhatsAppText`.

---

## 4. Phase 1 schema (modifiers)

```text
modifier_groups (org-scoped)
modifiers (belong to a group)
dish_modifier_groups (attach groups to dishes)

cart_items.modifiers_snapshot JSONB
cart_items.unit_price NUMERIC  -- dish + selected deltas at add time

order_items.modifiers_snapshot JSONB
order_items.dish_name_snapshot TEXT
```

Cart uniqueness is no longer `(cart_id, dish_id)` alone — the same dish with different modifier sets is a separate line.

---

## 5. Cursor rules (from Spec §46)

Do not bypass tenant isolation. Use adapters for WhatsApp/AI/payments/maps/delivery. Migrations for schema changes. Feature-flag incomplete WhatsApp ordering (`whatsapp_ordering` already in catalog).

---

## 6. Open for later phases

- Provider adapters beyond Meta Cloud (Gupshup, etc.)
- Delivery slab / base+per-km engine
- AI usage metering
- Phase 3 cart-in-chat on top of existing sessions