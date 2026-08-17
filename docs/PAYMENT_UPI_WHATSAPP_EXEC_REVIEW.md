# Direct UPI + WhatsApp payment — executive review

**Product:** Taste of Andhra / multi-tenant restaurant SaaS  
**Audience:** Leadership / ops / product for go / no-go  
**Date:** 2026-08-16  
**Status:** Proposal for review — not yet fully productized as described  
**Related:** [WHATSAPP_META_SETUP.md](./WHATSAPP_META_SETUP.md) · [FEATURES_AND_FLOW.md](./FEATURES_AND_FLOW.md) · [ARCHITECTURE_GATES.md](./ARCHITECTURE_GATES.md)

---

## 1. Decision needed

Approve a **zero / near-zero cost payment path** for small restaurants that:

1. Lets the restaurant receive money on **their own UPI ID** (no Razorpay / gateway fee on food orders).
2. Optionally sends a **WhatsApp payment link** when the order is placed (Cloud API).
3. Relies on **restaurant confirmation** (or customer “I’ve paid” + staff verify) to mark the order paid.

**Optional later:** Razorpay (or similar) as a paid add-on for restaurants that want auto-confirmation, cards, and wallets.

---

## 2. Why this path

| Goal | How this helps |
|------|----------------|
| Onboard margin-sensitive restaurants | No 1.5–2%+ gateway fee on every order |
| Go live online quickly | Restaurant already has a UPI ID / bank QR |
| Low order volume | WhatsApp Utility cost is typically a few paise per message in India |
| Keep SaaS credible | Clear payment status in admin; kitchen/dispatch rules still enforced |

**Hard limit:** UPI alone does **not** notify our app when money arrives. Auto “paid” without a PSP is not possible. Confirmation is an **ops step**, not a bank webhook.

---

## 3. Recommended product package

### Default (recommended for small restaurants)

| Capability | Included | Cost to restaurant |
|------------|----------|--------------------|
| Save restaurant UPI ID + payee name | Yes | ₹0 |
| Checkout: **Pay by UPI** (dynamic QR / intent on order / pay page) | Yes | ₹0 |
| Optional: WhatsApp Utility message with **Pay now** (HTTPS pay page) | Yes (toggle) | ~₹0.12 / delivered Utility msg outside free window\* |
| Customer “I’ve paid” (optional UTR) | Yes | ₹0 |
| Admin / staff **Confirm payment** / Reject | Yes | ₹0 |
| COD / pay at counter | Yes | ₹0 |

\*India Utility template rates are set by Meta and change over time; Utility inside an open 24-hour customer-care window is often free. See [Meta WhatsApp pricing](https://developers.facebook.com/docs/whatsapp/pricing/).

### Optional add-on (later)

| Capability | When |
|------------|------|
| Razorpay / other PSP (auto paid via webhook, cards, wallets) | Restaurant accepts gateway fees |

---

## 4. End-to-end flow (for review)

```text
Customer places order
        │
        ▼
Order created · payment_status = pending
        │
        ├──► In-app / pay page: show UPI QR + amount + order note
        │
        └──► [If WhatsApp enabled + customer opted in]
                    Send Utility template:
                    “Order #… · ₹… · Pay now” → HTTPS pay page
        │
        ▼
Customer pays on their UPI app (money → restaurant VPA)
        │
        ▼
Customer taps “I’ve paid” (optional UTR)
   and/or restaurant sees credit in UPI / bank app
        │
        ▼
Staff: Confirm payment  →  payment_status = paid
   or Reject / keep pending
        │
        ▼
Kitchen / dispatch follows restaurant policy
(e.g. prep only after paid for delivery; or prep anytime, dispatch after paid)
```

### What this is **not**

- Not “customer shares order on WhatsApp and we scrape confirmation.”
- Not automatic bank verification.
- Not a replacement for Razorpay when the restaurant wants auto-settled online status.

---

## 5. Actor responsibilities

| Actor | Responsibility |
|-------|----------------|
| **Platform (us)** | Host pay page + QR; enqueue WhatsApp template; store pending/paid; admin confirm UI; opt-in checks |
| **Restaurant admin** | Connect WhatsApp Business (Meta); save UPI ID; decide prep/dispatch rules; confirm payments |
| **Customer** | Pay via UPI; optionally mark “I’ve paid”; receive WhatsApp only if opted in |
| **Kitchen / counter** | Trust `payment_status` (and printer tickets) before treating order as paid |

---

## 6. WhatsApp specifics (exec summary)

| Topic | Detail |
|-------|--------|
| Channel | WhatsApp **Business Platform (Cloud API)** — already in product for order-status templates |
| Trigger | Order created with UPI / pay-later pending (not a manual “share order” action) |
| Message type | Approved **Utility** template (transactional: order + amount + pay link) |
| Link in message | **HTTPS** pay page on our domain (shows QR). Raw `upi://` is unreliable as a template button URL |
| Opt-in | Only if customer opted into WhatsApp updates |
| Reminders | At most **one** gentle reminder if still unpaid (quality / spam risk) |
| Payment truth | Delivery of WhatsApp ≠ money received |

### Restrictions / risks to acknowledge

1. Meta must **approve** the payment template; promo-like wording can be rejected or billed as Marketing (higher cost).
2. New WhatsApp numbers have **messaging limits** until quality/usage grows.
3. Misuse (broadcast payment spam) hurts **quality rating** and can throttle the number.
4. Restaurant must complete Meta Business / WABA setup (one-time ops effort).

---

## 7. Ops policy choices (need exec preference)

Pick defaults for v1; restaurants can override later if needed.

| Policy question | Option A (safer) | Option B (faster kitchen) |
|-----------------|------------------|---------------------------|
| When to start cooking (delivery) | Only after `paid` | Immediately; block **dispatch** until `paid` |
| When to start cooking (pickup) | After `paid` or at counter | Allow unpaid; settle at pickup |
| Unpaid timeout | Auto-cancel after N minutes | Keep pending; staff cancels |
| First-time customers | Must pay before prep | Same as regulars |

**Recommendation for small delivery-first restaurants:** Option A for delivery; Option B for pickup/COD mix.

---

## 8. Cost illustration (low volume)

Assumptions: India recipients, Utility template ~₹0.115 when billed, 50 UPI orders/day, 1 payment WhatsApp per order, no reminder.

| Item | Estimate |
|------|----------|
| Gateway fee on UPI via restaurant VPA | ₹0 |
| WhatsApp Utility (50 × ₹0.115) | ~₹6 / day (~₹180 / month) |
| If many customers already in 24h chat window | Often lower / free for those sends |

Compare: 2% gateway on ₹50,000 GMV/day ≈ ₹1,000 / day. For margin-sensitive tenants, WhatsApp + manual confirm is usually far cheaper.

---

## 9. Fraud / ops risk (honest)

| Risk | Mitigation |
|------|------------|
| Fake “I’ve paid” | Staff confirm against UPI app / UTR before `paid` |
| Wrong amount / wrong note | Dynamic QR with exact amount + order # in note |
| Order cooked then no payment | Policy: prep or dispatch only after confirm |
| Staff delay confirming | WhatsApp alert to restaurant + pending queue in admin |
| Personal UPI limits / KYC | Prefer restaurant **business** UPI / bank merchant QR |

---

## 10. Implementation snapshot (current vs proposed)

| Piece | Today (approx.) | Proposed |
|-------|-----------------|----------|
| Restaurant UPI ID in setup | Exists | Keep |
| UPI QR / pay-later helpers | Exists | Use as primary online path for free tier |
| Razorpay | Exists / gated | Optional paid upgrade |
| WhatsApp order-status templates | Exists | Add `payment_pending` (or similar) Utility template |
| Auto mark paid from UPI | Not possible without PSP | Do not promise |
| Admin confirm paid | Needed / extend | Required for this model |

---

## 11. Phased rollout

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0** | UPI QR on pay page + admin Confirm paid + clear pending queue | Zero-cost live path |
| **P1** | WhatsApp Utility “Pay now” on order create (opt-in + toggle) | Better conversion when customer leaves site |
| **P2** | Optional single reminder; kitchen/dispatch gates by policy | Tighter ops |
| **P3** | Optional Razorpay add-on for tenants who want auto-paid | Upsell, not blocker |

---

## 12. Confirmation checklist (executives)

Please mark and return:

| # | Decision | Approve? (Y/N) | Notes |
|---|----------|----------------|-------|
| 1 | Offer **Direct UPI + manual confirm** as default for small restaurants | | |
| 2 | Keep **Razorpay optional** (not required to go live) | | |
| 3 | Allow **WhatsApp payment link** on order create (Utility + HTTPS pay page) | | |
| 4 | Default kitchen policy for delivery: **prep only after paid** / **dispatch only after paid** (circle one) | | |
| 5 | Cap unpaid WhatsApp nudges to **1 reminder** | | |
| 6 | Platform may bill tenants a small **comms pass-through** for Meta WhatsApp (optional commercial model) | | |
| 7 | Target first pilot restaurants: _______________________ | | |

**Signed / dated:** _______________________  

---

## 13. One-line summary for stakeholders

> Small restaurants receive payment on their own UPI; we send an optional WhatsApp pay link and keep order payment pending until staff confirms the credit—near zero cost, no gateway margin hit, with Razorpay available later if they want full automation.
