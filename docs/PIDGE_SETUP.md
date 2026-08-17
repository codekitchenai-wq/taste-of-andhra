# Pidge last-mile delivery — setup + go-live

**Audience:** Platform owner turning on Pidge so Taste of Andhra can quote and book third-party riders.

Pidge is a **logistics** partner (rider network). It is not Swiggy/Zomato marketplace ingest. Own-fleet delivery keeps working if Pidge is off or unreachable.

Related: `.env.example` (Pidge secrets) · Admin → Settings → **Delivery & Service Areas**

---

## What you will end up with

| Item | Where it is used |
|------|------------------|
| Pidge channel + API token | Edge Function `PIDGE_API_TOKEN` — quotes and booking |
| Webhook auth token you invent | `PIDGE_WEBHOOK_TOKEN` + the same value in Pidge dashboard |
| Webhook URL | Pidge → Channel Integration → Webhook URL |
| Admin toggle | Settings → Use a third-party delivery partner → **Pidge** |
| Branch map pin | Required for live quotes and dispatch |
| Customer map pin | Required for routing; enable “Require location pin” if you want to reject old addresses |

Checkout still works without any of this: the customer is charged your own rate card.

---

## Part 1 — Pidge account

1. Create or open a Pidge vendor account and finish KYC / wallet funding (Pidge bills you for riders).
2. Open **Settings → Channel Integration**.
3. Create or select a channel. Suggested channel name: `taste-of-andhra` (must match `PIDGE_CHANNEL_NAME`).
4. Copy the **channel token** — this is `PIDGE_API_TOKEN`. It can spend your Pidge wallet; never put it in a `VITE_` variable or commit it.
5. Set an **auth token** for webhooks (any long random string). This is `PIDGE_WEBHOOK_TOKEN`.
6. Leave the webhook URL empty until the functions are deployed (Part 2).

Pidge does not publish a stable public spec. Default paths in code:

- Quote: `/v1.0/store/channel/vendor/quote`
- Create: `/v1.0/store/channel/vendor/order`
- Cancel: `/v1.0/store/channel/vendor/order/{id}/cancel`

If your account uses different routes, override with `PIDGE_QUOTE_PATH`, `PIDGE_CREATE_ORDER_PATH`, and `PIDGE_CANCEL_ORDER_PATH`.

---

## Part 2 — Edge Function secrets + deploy

From the repo root, with the Supabase CLI logged in and this project linked:

```bash
supabase secrets set PIDGE_API_TOKEN=<channel-token> \
  PIDGE_WEBHOOK_TOKEN=<same-token-as-pidge-dashboard> \
  PIDGE_CHANNEL_NAME=taste-of-andhra

supabase functions deploy delivery-quote
supabase functions deploy pidge-dispatch
supabase functions deploy pidge-webhook
```

`supabase/config.toml` already sets `verify_jwt = false` on `pidge-webhook` so Pidge callbacks are not blocked by a Supabase JWT. The other two functions stay JWT-protected (admin / signed-in customer).

Confirm secrets (values are masked):

```bash
supabase secrets list
```

Webhook URL to paste in Pidge:

```
https://<project-ref>.supabase.co/functions/v1/pidge-webhook
```

Admin → Settings → Delivery copies this URL when Pidge is selected.

---

## Part 3 — Restaurant settings

1. **Branches** — set latitude and longitude on the fulfilment branch. Dispatch refuses the job without a pickup pin.
2. **Admin → Settings → Delivery & Service Areas**
   - Turn on **Use a third-party delivery partner**
   - Provider: **Pidge**
   - Optional markup ₹ and % on top of Pidge’s price
   - Keep your base + per-km rate card as the fallback
   - Recommended: **Require customers to pin their location**
3. Save. The Pidge card on that panel shows whether functions and secrets are live.
4. **Admin → Settings → Integrations** also shows Pidge as Connected / Secrets missing / Not deployed.

Do **not** book a rider at checkout. Kitchen cooks as usual; when the order is **Ready**, Admin → Delivery → **Book Pidge**. Own staff remains available as a fallback.

---

## Part 4 — Smoke test

```bash
node scripts/diagnose-pidge.mjs
```

Expected when configured:

- `LOGIN_OK`
- `STATUS` with `configured: true`, `webhookConfigured: true`
- `FUNCTIONS_OK`

Then in the app (admin account):

1. Place a delivery order to a pinned address inside the service area.
2. Checkout should say **Live rate from our delivery partner** (otherwise the rate card was used — check secrets, branch pin, or Pidge response).
3. Move the order to **Ready**.
4. Admin → Delivery → **Book Pidge**. The delivery row should get an external job id.
5. Confirm Pidge received the job and that a test webhook (or a real rider event) updates status / GPS on the tracking map.

If quote or dispatch fails, checkout and the kitchen still work. Failed dispatch stores `dispatch_error` on the delivery row so you can assign your own partner.

---

## Cancelling

Cancelling an order or delivery that already has a Pidge job calls `pidge-dispatch` with `action: cancel`. If Pidge rejects the cancel, the local order is still cancelled — check the Pidge dashboard and `delivery.dispatch_error`.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Integrations show **Not deployed** | Functions not deployed, or `pidge-dispatch` 404 |
| Integrations show **Secrets missing** | `PIDGE_API_TOKEN` unset |
| Live quote never appears | Token missing, branch/address not pinned, or Pidge returned no price (falls back to rate card) |
| Book Pidge returns 503 | Same token missing |
| Book Pidge returns 422 | Branch or address missing lat/lng |
| Webhook 401 | `PIDGE_WEBHOOK_TOKEN` does not match the token set in Pidge, or JWT verification still on |
| Rider GPS never moves | Webhook URL not registered, or payload field names differ — check function logs |

Function logs:

```bash
supabase functions logs pidge-dispatch
supabase functions logs delivery-quote
supabase functions logs pidge-webhook
```
