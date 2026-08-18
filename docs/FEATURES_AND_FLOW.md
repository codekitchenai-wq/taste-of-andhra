# Taste of Andhra — Features & Flow

**Product:** The Taste of Andhra  
**Type:** Online restaurant platform (storefront + ops) evolving toward multi-tenant SaaS  
**Last updated:** 2026-07-28  
**Related:** [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md) · [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md) · [TEST_CASES.md](./TEST_CASES.md) · [PIDGE_SETUP.md](./PIDGE_SETUP.md)

---

## 1. Overview

The Taste of Andhra is a web app for authentic Andhra cuisine. Customers browse the menu and place delivery orders; restaurant admins run the kitchen and catalogue; delivery partners fulfill assigned runs; DirectApp Master oversees tenancy as the product moves to multi-restaurant SaaS.

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend / data | Supabase (PostgreSQL, Auth, Storage, RLS, Edge Functions) |
| Payments | Cash on Delivery · Razorpay (UPI / cards / netbanking / wallets) |
| Maps | Google Maps JavaScript API |
| Deploy | Vercel (static SPA) |
| Tests | Vitest |

---

## 2. Personas and entry points

| Persona | Role | Login URL | After login |
|---------|------|-----------|-------------|
| Customer | `customer` | `/login` | `/` (storefront) |
| Admin | `admin` | `/admin/login` | `/admin` |
| Delivery partner | `delivery` | `/delivery/login` | `/delivery` |
| DirectApp Master | `platform_master` | `/master/login` | `/master` |

Shared test password (when helpers are enabled): see [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md).

**Auth:** Supabase email/password for all personas; Google OAuth available for customers. Routes are gated by role (`ProtectedRoute`, `AdminRoute`, `DeliveryRoute`, `MasterRoute`).

---

## 3. Public storefront (no login required)

| Route | Purpose |
|-------|---------|
| `/` | Home — hero, categories, featured dishes, testimonials |
| `/menu` | Full menu with search, category / diet / spice filters, sort |
| `/menu/light` | Text-only fast order menu |
| `/menu/:slug` | Dish detail — price, description, ingredients, reviews |
| `/about` | Story, hours, visit info |
| `/gallery` | Image gallery with category filters |
| `/contact` | Contact details and form |
| `/party-order` | Party / bulk catering enquiry form |
| `/cart` | Cart (sign-in required to add items in normal flow) |
| `/b/:slug` | Branch-specific menu |
| `/qr/:tableCode` | Scan-to-order table menu |

---

## 4. Customer features

### 4.1 Account

| Route | Feature |
|-------|---------|
| `/register` · `/login` | Create account / sign in |
| `/profile` | View and update name / phone |
| `/addresses` | Saved delivery addresses (CRUD, default address) |
| `/favorites` | Saved dishes |
| `/notifications` | In-app order alerts |

### 4.2 Ordering

| Route | Feature |
|-------|---------|
| `/cart` | Quantities, remove, clear, subtotal |
| `/checkout` | Branch, address, coupon, loyalty, payment method, special instructions |
| `/order-success` | Confirmation after successful place order |
| `/orders` | Order history |
| `/orders/:id` | Details, status tracker, cancel (when allowed) |
| `/orders/:id/invoice` | GST invoice |

### 4.3 Checkout details

At checkout the customer:

1. Selects a **fulfilment branch** (if branches exist).
2. Selects or adds a **delivery address** (optional Google Maps pin when `VITE_GOOGLE_MAPS_API_KEY` is set).
3. Optionally applies a **coupon** and/or **loyalty points**.
4. Sees a **delivery charge** from the rate card or a live quote (Pidge / Edge Function when configured).
5. Chooses **Cash on Delivery** or **Pay Online** (Razorpay; demo path if key unset).
6. Places the order → cart cleared → success page.

**Pricing rules (defaults):** tax 5%; delivery charge ₹49; free delivery above ₹399 (configurable in admin settings / constants).

---

## 5. Admin features

| Route | Feature |
|-------|---------|
| `/admin` | Dashboard — order counts, revenue, popular dish, recent orders |
| `/admin/categories` | Menu categories CRUD |
| `/admin/dishes` | Dishes CRUD (availability, price, images, spice, diet) |
| `/admin/orders` | Kitchen board / list — accept, reject, status moves, ETA, assign delivery |
| `/admin/customers` | Customer list; activate / deactivate |
| `/admin/delivery` | Active deliveries; partner GPS when sharing |
| `/admin/delivery-partners` | Partner roster CRUD (name, phone, active) |
| `/admin/offers` | Coupons / offers |
| `/admin/party-inquiries` | Party enquiry inbox and status |
| `/admin/branches` | Locations, contact, GSTIN |
| `/admin/qr-tables` | Generate table QR codes linked to a branch |
| `/admin/reports` | Operational reports |
| `/admin/settings` | Default ETA; delivery / service-area settings |

**Kitchen behaviour:** New-order alerts when pending orders arrive. Typical status path is controlled by allowed transitions (see §7).

---

## 6. Delivery partner features

| Route | Feature |
|-------|---------|
| `/delivery` | List of assigned deliveries |
| `/delivery/:deliveryId` | Customer name / phone, drop-off address, navigate, share live GPS, mark delivered |

Partners only see orders assigned to them (by linked user and/or matching phone). Marking delivered should update both the delivery row and the parent order status.

---

## 7. End-to-end order flow

```
Browse / QR / Branch menu
        ↓
   Add to cart
        ↓
    Checkout  →  createOrder()  →  status: pending
        ↓
   Payment record (COD pending / Razorpay)
        ↓
 Admin kitchen: pending → confirmed → preparing → ready
        ↓
 Assign delivery partner  →  out_for_delivery (when ready + assigned)
        ↓
 Partner: GPS + navigate → Mark delivered
        ↓
 Customer notified · loyalty earn · invoice available
```

### 7.1 Status pipeline

| Status | Who typically moves it | Notes |
|--------|------------------------|-------|
| `pending` | System on place order | Admin may cancel / confirm |
| `confirmed` | Admin | |
| `preparing` | Admin | Cancel rules tighten once kitchen is active |
| `ready` | Admin | Eligible for dispatch |
| `out_for_delivery` | Admin assign / system | Partner sees assignment |
| `delivered` | Delivery partner (or admin) | Completes the run |
| `cancelled` | Customer (early) or admin | Side exit from earlier states |

Allowed transitions (from `orderStatusTransitions.ts`):

| From | Allowed next |
|------|----------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `preparing`, `cancelled` |
| `preparing` | `ready`, `cancelled` |
| `ready` | `out_for_delivery`, `cancelled` |
| `out_for_delivery` | `delivered` |
| `delivered` / `cancelled` | (terminal) |

### 7.2 Step-by-step narrative

1. **Browse & cart** — Customer adds dishes from menu, light menu, branch menu, or QR table menu.
2. **Checkout** — Address verified; optional service-area check; totals computed; order + order items + payment row created.
3. **Kitchen** — Admin sees the order, confirms, prepares, marks ready; can bump ETA.
4. **Assign** — Admin picks a delivery partner; phone can prefill from roster; order moves to out for delivery when appropriate.
5. **On the road** — Partner opens the assignment, shares location (for admin live track), navigates to the pin/address.
6. **Complete** — Partner marks delivered; customer sees final status and can open the invoice; loyalty may credit points.

---

## 8. Supporting systems

| System | Behaviour |
|--------|-----------|
| **Cart** | Persisted in Supabase for the signed-in user; cleared after successful checkout |
| **Coupons** | Validated at checkout (min order, expiry, active); admin manages offers |
| **Loyalty** | Redeem at checkout; earn on successful delivery |
| **Favorites** | Per-user dish favorites; heart on menu cards; `/favorites` list |
| **Notifications** | In-app channel on status changes; other channels stubbed |
| **Addresses** | CRUD with landmark and pincode validation; Maps pin when API key set |
| **Party orders** | Public form → `party_inquiries` → admin inbox |
| **Branches** | Multi-location under one restaurant; checkout picker; `/b/:slug` menus |
| **QR tables** | Admin creates codes; diners open `/qr/:tableCode` |
| **Delivery quotes** | Rate card locally or Pidge via Edge Function |
| **GST invoices** | Generated view at `/orders/:id/invoice` |
| **Settings** | Admin default ETA minutes; delivery radius / provider flags |

---

## 9. DirectApp Master (SaaS Phase 1)

| Route | Purpose |
|-------|---------|
| `/master` | Platform dashboard / overview |
| `/master/tenants` | Tenant #1 (Taste of Andhra) metadata and test logins |
| `/master/features` | Feature catalog (base vs add-ons); entitlements largely read-only until fully wired |

**Today:** App still defaults to a single organization id (`DEFAULT_ORGANIZATION_ID`). Schema and types for orgs / entitlements exist; full org RLS and billing are planned.

**Target:** Shared app + DB; Master manages tenants, plans, entitlements, and SaaS billing; each restaurant scoped by `organization_id`. Branches remain locations *within* one org, not separate tenants.

Details: [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md).

---

## 10. Route map (quick reference)

Defined in `src/constants/ROUTES.ts`.

### Customer / public

`/` · `/about` · `/menu` · `/menu/light` · `/menu/:slug` · `/gallery` · `/contact` · `/party-order` · `/login` · `/register` · `/profile` · `/orders` · `/orders/:id` · `/orders/:id/invoice` · `/cart` · `/checkout` · `/order-success` · `/addresses` · `/favorites` · `/notifications` · `/qr/:tableCode` · `/b/:slug`

### Admin

`/admin/login` · `/admin` · `/admin/categories` · `/admin/dishes` · `/admin/orders` · `/admin/customers` · `/admin/delivery` · `/admin/delivery-partners` · `/admin/offers` · `/admin/reports` · `/admin/party-inquiries` · `/admin/branches` · `/admin/qr-tables` · `/admin/settings`

### Delivery

`/delivery/login` · `/delivery` · `/delivery/:deliveryId`

### DirectApp Master

`/master/login` · `/master` · `/master/tenants` · `/master/features`

---

## 11. Environment checklist (ops)

| Variable / setup | Needed for |
|------------------|------------|
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` | All data and auth |
| Supabase migrations applied | Schema tables/columns (orders, partners, QR, RLS, etc.) |
| `VITE_GOOGLE_MAPS_API_KEY` | Address map pin and map-heavy UX |
| `VITE_RAZORPAY_KEY_ID` | Live online payments (otherwise demo path) |
| Edge Functions + Pidge secrets (`docs/PIDGE_SETUP.md`) | Live third-party delivery quotes / dispatch |
| `DATABASE_URL` + `npm run db:apply-qa-tables` | Catch-up for missing `delivery_partners` / `qr_tables` on older remotes |

---

## 12. Source pointers

| Area | Location |
|------|----------|
| Routes | `src/constants/ROUTES.ts`, `src/routes/index.tsx` |
| Order create / status | `src/services/orderService.ts`, `src/utils/orderStatusTransitions.ts` |
| Delivery | `src/services/deliveryService.ts`, delivery pages under `src/pages/delivery/` |
| Admin kitchen | `src/pages/admin/` (orders / dashboard) |
| Branding constants | `src/constants/APP.ts` (restaurant), `src/constants/PLATFORM.ts` (DirectApp) |
| Org default | `src/constants/ORGANIZATION.ts` |
