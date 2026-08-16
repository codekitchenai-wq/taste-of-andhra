# Multi-tenant domains (directapp.in)

Platform apex: **`directapp.in`** / **`www.directapp.in`** — DirectApp marketing site.

Restaurant tenants: `{slug}.directapp.in` or a custom domain.

## URL patterns

| Mode | Example | What customers see |
|------|---------|-------------------|
| Platform marketing | `https://www.directapp.in` | DirectApp landing, plans, demo/enroll |
| Platform subdomain | `https://thetasteofandhra.directapp.in` | Restaurant storefront |
| Custom domain | `https://www.thetasteofandhra.com` | Restaurant brand (not the subdomain) |

Editable marketing copy/plans/contact: `src/constants/PLATFORM_SITE.ts`.

Live product demo link on the landing page points at the Taste of Andhra storefront (`https://www.thetasteofandhra.com`).

## App env (Vercel + local)

```bash
VITE_PLATFORM_ROOT_DOMAIN=directapp.in
VITE_ENABLE_HOST_TENANT_RESOLUTION=true
# Optional — preview marketing site on localhost:
# VITE_FORCE_PLATFORM_SITE=true
```

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

Code: `src/utils/platformHost.ts`, `src/utils/tenantHost.ts`, `src/contexts/OrganizationContext.tsx`, `src/routes/index.tsx`.

## Demo / enroll leads

Form posts to `platform_demo_requests` (migration `20260816120000_platform_demo_requests.sql`). If the table is missing, the form opens a mailto fallback to the platform contact email.
