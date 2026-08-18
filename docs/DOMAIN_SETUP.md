# Multi-tenant domains (directapp.in)

Platform apex: **`directapp.in`** / **`www.directapp.in`** — DirectApp marketing site.

Restaurant tenants: `{slug}.directapp.in` or a custom domain.

## URL patterns

| Mode | Example | What customers see |
|------|---------|-------------------|
| Platform marketing | `https://www.directapp.in` | DirectApp landing, plans, demo/enroll |
| Platform subdomain | `https://thetasteofandhra.directapp.in` | Restaurant storefront |
| Custom domain (whitelabel) | `https://www.thetasteofandhra.com` | Same restaurant, brand domain |

**Both can be active at once.** Host resolution checks:

1. `{slug}.directapp.in` → org by `slug`
2. Otherwise `custom_domain` (with/without `www`)

Prefer **not** `www.{slug}.directapp.in` (wildcard `*.directapp.in` does not cover a `www` prefix on a tenant subdomain). Example: use `https://chopsticksspicemalabar.directapp.in`, not `https://www.chopsticksspicemalabar.directapp.in`.

Editable marketing copy/plans/contact: `src/constants/PLATFORM_SITE.ts`.

## Whitelabel for any tenant (checklist)

1. **Master Console** → tenant → set URL slug (e.g. `chopsticks`) → storefront at `https://chopsticks.directapp.in`.
2. If they bring their own domain (e.g. `www.order.chopsticks.com`):
   - Add that hostname in **Vercel → taste-of-andhra → Domains**
   - At **their** DNS provider: **CNAME** `www` (or the host they use) → `cname.vercel-dns.com` (or the value Vercel shows)
   - In Master → tenant homepage: mode **Custom domain**, value `www.order.chopsticks.com`
3. Keep the platform subdomain — it continues to work as a backup / internal URL.

## Taste of Andhra dual URLs

| URL | Where to configure |
|-----|-------------------|
| `https://www.thetasteofandhra.com` | Already on Vercel; org `custom_domain` = `www.thetasteofandhra.com` |
| `https://thetasteofandhra.directapp.in` | Org `slug` = `thetasteofandhra`; needs `*.directapp.in` **Valid** on Vercel |

In Supabase (production), ensure:

```sql
UPDATE public.organizations
SET
  slug = 'thetasteofandhra',
  custom_domain = 'www.thetasteofandhra.com',
  homepage_mode = 'custom_domain',
  homepage_url = 'https://www.thetasteofandhra.com'
WHERE id = 'a0000000-0000-4000-8000-000000000001';
```

For wildcard SSL on `*.directapp.in`, prefer GoDaddy:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `*` | `cname.vercel-dns.com` |

(If `*` is an A record, switch it to CNAME as above, then Refresh in Vercel Domains.)

Editable marketing copy/plans/contact: `src/constants/PLATFORM_SITE.ts`.

## App env (Vercel + local)

```bash
VITE_PLATFORM_ROOT_DOMAIN=directapp.in
VITE_ENABLE_HOST_TENANT_RESOLUTION=true
VITE_AUTH_OAUTH_CALLBACK_ORIGIN=https://www.directapp.in
```

Master console: `https://www.directapp.in/master/login` (not Taste of Andhra).

Google OAuth: add these **Redirect URLs** in Supabase Auth (wildcard covers every restaurant):

- `https://*.directapp.in/**`
- `https://www.directapp.in/**`
- `https://www.thetasteofandhra.com/**`

Restaurant Google login stays on `{slug}.directapp.in`. Do not hop through Taste of Andhra.

## GoDaddy DNS (host on Vercel — do not use GoDaddy hosting)

Domains are already attached to the Vercel project. Point GoDaddy DNS at Vercel:

1. Sign in to [GoDaddy](https://www.godaddy.com) → **My Products** → **DNS** for `directapp.in`.
2. Remove any GoDaddy **parking / forwarding / website builder** records that conflict.
3. Add / update these records:

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| **A** | `@` | `76.76.21.21` | 600 (or default) |
| **A** | `*` | `76.76.21.21` | 600 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 600 |

4. If GoDaddy already has an A record on `@` or a CNAME on `www`, edit those instead of creating duplicates.
5. Do **not** enable GoDaddy Website Builder or “Forwarding” for the apex if you want Vercel to serve the app.
6. Wait for DNS (often 5–30 minutes; up to 48h). Check in Vercel → Project → **Settings → Domains** until `directapp.in`, `www.directapp.in`, and `*.directapp.in` show as valid.
7. Redeploy the Vercel project after DNS is green so Production picks up env vars.

Optional: change nameservers to Vercel’s (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`) instead of individual records — then manage DNS entirely in Vercel.

## How resolution works

1. `directapp.in` / `www.directapp.in` → DirectApp marketing routes (`/`, `/demo`)
2. `{slug}.directapp.in` → restaurant org by slug
3. Other hosts → `organizations.custom_domain`
4. Else → default Taste of Andhra org

Retired: `spice-malabar.directapp.in` is no longer a live tenant URL. Use `https://chopsticksspicemalabar.directapp.in`. The old host can be dropped from DNS later.

Code: `src/utils/platformHost.ts`, `src/utils/tenantHost.ts`, `src/contexts/OrganizationContext.tsx`, `src/routes/index.tsx`.

## Production tenant data (menus, org rows)

DNS and env vars alone do not create tenant menu data. After wildcard DNS is valid, seed each restaurant in **production Supabase** and confirm Vercel flags — see [PRODUCTION_TENANT_SETUP.md](./PRODUCTION_TENANT_SETUP.md).

## Demo / enroll leads

Form posts to `platform_demo_requests` (migration `20260816120000_platform_demo_requests.sql`). If the table is missing, the form opens a mailto fallback to the platform contact email.
