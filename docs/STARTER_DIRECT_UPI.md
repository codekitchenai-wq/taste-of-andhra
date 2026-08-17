# Starter Direct UPI + Master subscriptions

**Status:** Implemented in app + migration `20260816140000_starter_direct_upi_and_plans.sql`  
**Related:** [PAYMENT_UPI_WHATSAPP_EXEC_REVIEW.md](./PAYMENT_UPI_WHATSAPP_EXEC_REVIEW.md)

## What ships on Starter (free / low cost)

| Capability | Notes |
|------------|--------|
| Pay by UPI at checkout | Customer pays restaurant VPA; no gateway fee |
| COD | Unchanged |
| Order success + `/pay/:token` QR | Immediate pay page |
| Customer **I’ve paid** (optional UTR) | Does **not** mark paid |
| Admin **Mark payment collected** | Payment truth |
| Kitchen badges | UPI unpaid / UPI claimed / Paid |

WhatsApp and Razorpay are **not** on Starter. Master assigns Growth / Pro (or toggles features).

## Plans

| Plan | Code | Includes (high level) |
|------|------|------------------------|
| Starter | `starter` | Core ops + Direct UPI + COD |
| Growth | `growth` | + WhatsApp notifications + SMS |
| Pro | `pro` | + Razorpay + WhatsApp ordering + loyalty + branches |

Master → Tenants → **Subscription & details** → set plan / status / period / suspend.

## Go-live checklist

1. Apply migration `20260816140000_starter_direct_upi_and_plans.sql` on Supabase (staging, then production).
2. Admin → Settings → set restaurant **UPI ID** + payee name.
3. Place a test storefront order with **Pay by UPI** → pay page QR → I’ve paid → Admin mark paid.
4. Master: open tenant → change plan to Growth/Pro and confirm checkout options change (WhatsApp checkbox / Razorpay).
5. Deploy frontend to production after tests pass.
