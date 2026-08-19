# Production tenant setup

**Problem this solves:** A tenant (e.g. Spice Malabar) shows its menu locally but not after deploy to production.

**Root cause:** Local dev and production use the **same app code** but may differ in (1) Vercel env vars, (2) Supabase migrations applied, and (3) tenant rows seeded. Pushing frontend code does **not** copy menu or org data into production.

**Related:** [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) (DNS + subdomains), [ARCHITECTURE_GATES.md](./ARCHITECTURE_GATES.md) (feature flags), [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md) (data model).

---

## How tenant isolation works

| Data | Isolation |
|------|-----------|
| Categories, dishes, offers | `organization_id` on every row; storefront queries filter by active org |
| Orders, payments, delivery settings | Same — per `organization_id` |
| Admin / staff access | RLS via `organization_members` |
| Customer logins (`profiles`) | Shared identity (one Google/email account) |
| Customer membership | Per tenant via `organization_customers` (enroll at each restaurant) |
| Order history | Scoped to the org the customer ordered from |

**Important:** If `VITE_ENABLE_HOST_TENANT_RESOLUTION` is not `true` in production, **every hostname** resolves to Taste of Andhra — menus effectively “share” incorrectly.

---

## Local vs production resolution

| Environment | How the app picks a tenant |
|-------------|----------------------------|
| Local | `?tenant=chopsticksspicemalabar`, `chopsticksspicemalabar.localhost`, or persisted session slug |
| Production | `{slug}.directapp.in` (e.g. `chopsticksspicemalabar.directapp.in`) or `organizations.custom_domain` |

Code paths: `src/utils/tenantHost.ts`, `src/contexts/OrganizationContext.tsx`, `src/services/dishService.ts`.

---

## Symptom → cause → fix

| What you see on `https://{slug}.directapp.in/menu` | Likely cause | Fix |
|----------------------------------------------------|--------------|-----|
| Taste of Andhra menu | `VITE_ENABLE_HOST_TENANT_RESOLUTION` missing or `false` in Vercel | Set to `true`, redeploy |
| Empty menu, tenant branding may show | Org row missing in **production** Supabase | Seed tenant (Step 4) |
| Empty menu, no error | Org exists but categories/dishes not seeded in prod | Re-run seed against prod |
| “Unable to load dishes” | SaaS migrations not applied in prod | Apply migrations (Step 3) |
| Site does not load / DNS error | Wildcard `*.directapp.in` not valid on Vercel | Fix DNS ([DOMAIN_SETUP.md](./DOMAIN_SETUP.md)) |

When the slug is known but no org row exists, the app uses `UNMATCHED_ORGANIZATION_ID` (all-zero UUID) so it **does not** fall back to Taste of Andhra catalog — you get an empty menu instead.

---

## Step-by-step checklist

### 1. Vercel environment variables (Production)

Vercel → **Project → Settings → Environment Variables**. Required for multi-tenant production:

```bash
VITE_ENABLE_HOST_TENANT_RESOLUTION=true
VITE_PLATFORM_ROOT_DOMAIN=directapp.in
VITE_AUTH_OAUTH_CALLBACK_ORIGIN=https://www.directapp.in
VITE_SUPABASE_URL=https://<prod-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<production anon key>
```

`VITE_*` variables are baked in at **build time**. After changing them, trigger a **new Production deploy** (Redeploy, or push a commit).

Optional but recommended: same Supabase URL/key in Preview if you test tenant subdomains on preview URLs.

### 1b. Supabase Google OAuth URL configuration (production)

Project: **`qixpsqlifwsztncjevgl`** → **Authentication → URL Configuration**

| Setting | Required value |
|---------|----------------|
| **Site URL** | `https://www.directapp.in` |
| **Redirect URLs** | `https://www.directapp.in/**` |
| | `https://*.directapp.in/**` |
| | `http://localhost:5173/**` |

**Do not** use `https://www.thetasteofandhra.com` as Site URL until per-tenant Google login is verified end-to-end.

If `redirectTo` (`https://www.directapp.in/login?tenant=…`) is not allowlisted, Supabase falls back to Site URL and drops `?tenant=`. The tenant cookie is scoped to `.directapp.in`, so a fallback to `thetasteofandhra.com` cannot recover the restaurant.

**Test after deploy:** From `https://chopsticksspicemalabar.directapp.in/login`, Continue with Google → after Google you should land on `www.directapp.in/login?tenant=chopsticksspicemalabar#…` (or briefly `thetasteofandhra.com/login#…` then auto-bounce to `www.directapp.in`) → then `chopsticksspicemalabar.directapp.in/login` logged in.

### 2. DNS and domains

Confirm in Vercel → **Settings → Domains**:

- `directapp.in` — Valid
- `www.directapp.in` — Valid
- `*.directapp.in` — Valid (required for `{slug}.directapp.in`)

See [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) for GoDaddy DNS records.

### 3. Apply Supabase migrations (production project)

Use the **production** Supabase project (same URL as `VITE_SUPABASE_URL` in Vercel).

Run all files in `supabase/migrations/` in filename order via Supabase SQL Editor or CLI. Minimum for multi-tenant menus:

- `20260727120000_saas_multi_tenant_model.sql` — `organizations`, `organization_id` on tenant tables
- `20260815160000_architecture_gates_p0.sql` — org-scoped RLS on dishes/categories/orders
- `20260813150000_organization_homepage.sql` — homepage / custom domain columns
- `20260818120000_organization_customers.sql` — per-tenant customer enrollment

Verify columns exist:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dishes'
  AND column_name = 'organization_id';
```

Should return one row.

### 4. Seed tenant data into production Supabase

Seed scripts use the service role key and **target whichever Supabase URL you pass**. Local `.env.local` often points at dev — explicitly override for production.

**Recommended (Supabase CLI logged in):**

```bash
npm run seed:spice-malabar:production
```

This targets production project `qixpsqlifwsztncjevgl` via `scripts/seed-production.mjs` without writing keys to disk.

**PowerShell (manual env override):**

```powershell
$env:VITE_SUPABASE_URL = "https://qixpsqlifwsztncjevgl.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<production service role key>"

npm run seed:spice-malabar
```

**bash:**

```bash
VITE_SUPABASE_URL="https://<prod-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<production service role key>" \
npm run seed:spice-malabar
```

Optional follow-ups:

```bash
npm run seed:spice-malabar-onam
node scripts/backfill-spice-malabar-images.mjs
```

The seed creates:

- `organizations` row with `slug = 'chopsticksspicemalabar'`
- Categories and dishes from `scripts/data/spice-malabar-menu.json`
- Subscription, entitlements, delivery settings, admin user

**Spice Malabar admin (after seed):** `spice-malabar@admin.test` / `Test@123`  
Storefront: `https://chopsticksspicemalabar.directapp.in`

### 5. Verify in Supabase SQL Editor (production)

Replace `chopsticksspicemalabar` with your tenant slug:

```sql
-- Organization exists and is active
SELECT id, slug, name, status
FROM public.organizations
WHERE slug IN ('chopsticksspicemalabar', 'spice-malabar');

-- Menu counts for that org
SELECT
  (SELECT COUNT(*) FROM public.categories
   WHERE organization_id = o.id) AS categories,
  (SELECT COUNT(*) FROM public.dishes
   WHERE organization_id = o.id AND is_available = TRUE) AS available_dishes
FROM public.organizations o
WHERE o.slug IN ('chopsticksspicemalabar', 'spice-malabar');
```

Expected for Spice Malabar after seed: **1 org**, **many categories**, **hundreds of dishes**.

If org exists but counts are zero, re-run the seed against production (Step 4).

### 6. Verify in the browser

1. Open `https://chopsticksspicemalabar.directapp.in/menu` (hard refresh / incognito).
2. DevTools → Network: dish/category requests should succeed (200), not empty arrays from wrong org.
3. Confirm dishes are Spice Malabar items, not Taste of Andhra.

---

## Adding a new tenant (general)

1. Choose a URL slug (e.g. `my-restaurant` → `https://my-restaurant.directapp.in`).
2. Create org + menu in production Supabase:
   - **Master Console** (platform master login), or
   - A dedicated seed script (copy pattern from `scripts/seed-spice-malabar.mjs`).
3. Ensure migrations and Vercel env vars from Steps 1–3 above are already in place.
4. Run verification SQL (Step 5) for the new slug.
5. Test storefront and admin login for that tenant only.

Each tenant must have its own `organizations` row and its own rows in `categories`, `dishes`, `orders`, etc. — all keyed by `organization_id`.

---

## Onboarding a tenant that already works locally

If setup was done only against local/dev Supabase:

1. Confirm production Vercel uses the **production** Supabase URL (not dev).
2. Run the same seed (or Master onboarding) against **production** Supabase.
3. Redeploy after setting `VITE_ENABLE_HOST_TENANT_RESOLUTION=true`.

Local `?tenant=` and `npm run seed:*` do not affect production until you point the seed at the prod project.

---

## Quick reference — Spice Malabar

| Item | Value |
|------|--------|
| Slug | `chopsticksspicemalabar` |
| Storefront | `https://chopsticksspicemalabar.directapp.in` |
| Seed command | `npm run seed:spice-malabar` |
| Menu source | `scripts/data/spice-malabar-menu.json` |
| Admin email | `spice-malabar@admin.test` |
| Admin password | `Test@123` |

---

## Troubleshooting

**Still seeing Taste of Andhra menu on tenant subdomain**

- Check Production deploy logs / build env: `VITE_ENABLE_HOST_TENANT_RESOLUTION` must be the string `true`.
- Redeploy after env change.

**Menu empty but homepage shows Spice Malabar copy**

- Org resolved; dishes missing or filtered out. Run verification SQL. Re-seed if counts are 0.

**Admin can log in but sees wrong restaurant data**

- Ensure admin is in `organization_members` for that org only. Seed script adds this for Spice Malabar admin.

**RLS / permission errors in console**

- Confirm `20260815160000_architecture_gates_p0.sql` is applied. Public read on dishes uses `is_available = TRUE OR is_org_admin(organization_id)`.

**Google login lands on `thetasteofandhra.com/login#` and stays there**

- Update Supabase Site URL + Redirect URLs (Step 1b). Redeploy after code fix on branch `cursor/per-tenant-google-oauth`.
- Expected: auto-redirect to `www.directapp.in`, then back to the restaurant subdomain.
