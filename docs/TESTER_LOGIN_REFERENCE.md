# Tester login reference

**Shared password (all accounts):** `Test@123`  
**Local app:** http://127.0.0.1:5173  
**Production platform:** https://www.directapp.in  
**Taste of Andhra storefront:** https://www.thetasteofandhra.com  

Seed accounts (requires service role key in `.env.local`):

```bash
npm run seed:qa-testers
```

If Superuser login works but Master dashboard rejects you, the DB enum may be missing. Run in Supabase SQL Editor, then `node scripts/seed-superuser.mjs`:

```sql
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';
UPDATE public.profiles
SET role = 'platform_master'
WHERE email = 'master@tasteofandhra.test';
```

Until that SQL runs, the app still treats `master@tasteofandhra.test` as Superuser by email so `/master` works for testing.

---

## Portal links

| Persona | Login URL (local) | After login |
|---------|-------------------|-------------|
| **Superuser (Master)** | http://127.0.0.1:5173/master/login | http://127.0.0.1:5173/master |
| Customer | http://127.0.0.1:5173/login | http://127.0.0.1:5173/ |
| Restaurant admin | http://127.0.0.1:5173/admin/login | http://127.0.0.1:5173/admin |
| Delivery | http://127.0.0.1:5173/delivery/login | http://127.0.0.1:5173/delivery |

| Persona | Login URL (production) | After login |
|---------|------------------------|-------------|
| **Superuser (Master)** | https://www.directapp.in/master/login | https://www.directapp.in/master |
| Customer | https://www.thetasteofandhra.com/login | https://www.thetasteofandhra.com/ |
| Restaurant admin | https://www.thetasteofandhra.com/admin/login | https://www.thetasteofandhra.com/admin |
| Delivery | https://www.thetasteofandhra.com/delivery/login | https://www.thetasteofandhra.com/delivery |

Each persona has a **separate login URL**. Do not use customer login for admin / delivery / Superuser.

Credentials are also shown on each login screen (test helper panel) and in the site footer when `SHOW_TEST_HELPERS` is enabled.

---

## 1. Platform Superuser (control plane)

Controls all tenants, feature catalog visibility for testing, and platform-wide access overview.

| Field | Value |
|-------|--------|
| Email / username | `master@tasteofandhra.test` |
| Password | `Test@123` |
| Role | `platform_master` |
| Login | `/master/login` |
| Landing | `/master` |
| Also useful | `/master/tenants`, `/master/features` |

---

## 2. Tenant: The Taste of Andhra

| Field | Value |
|-------|--------|
| Tenant name | The Taste of Andhra |
| Slug | `taste-of-andhra` |
| Organization id | `a0000000-0000-4000-8000-000000000001` |
| Storefront | `/` |
| Menu | `/menu` |

### 2.1 Demo accounts (quick single-user testing)

| Persona | Email / username | Password | Login |
|---------|------------------|----------|-------|
| Customer | `customer@tasteofandhra.test` | `Test@123` | `/login` |
| Admin | `admin@tasteofandhra.test` | `Test@123` | `/admin/login` |
| Delivery | `delivery@tasteofandhra.test` | `Test@123` | `/delivery/login` |

### 2.2 Tester 1 (use when two people test in parallel)

| Persona | Email / username | Password | Login |
|---------|------------------|----------|-------|
| Customer | `tester1.customer@thetasteofandhra.com` | `Test@123` | `/login` |
| Admin | `tester1.admin@thetasteofandhra.com` | `Test@123` | `/admin/login` |
| Delivery | `tester1.delivery@thetasteofandhra.com` | `Test@123` | `/delivery/login` |

### 2.3 Tester 2 (second parallel tester)

| Persona | Email / username | Password | Login |
|---------|------------------|----------|-------|
| Customer | `tester2.customer@thetasteofandhra.com` | `Test@123` | `/login` |
| Admin | `tester2.admin@thetasteofandhra.com` | `Test@123` | `/admin/login` |
| Delivery | `tester2.delivery@thetasteofandhra.com` | `Test@123` | `/delivery/login` |

---

## 3. Suggested end-to-end flow

1. **Superuser** — open `/master`, confirm tenant + feature catalog, copy any persona credentials from the table.
2. **Admin (Tester 1)** — `/admin/dishes` ensure menu items exist.
3. **Customer (Tester 1)** — place an order from `/menu` → checkout.
4. **Admin** — confirm order and assign **Tester 1 Delivery**.
5. **Delivery** — complete delivery on `/delivery`.
6. **Customer** — check `/orders`, tracking, invoice.

Always **log out** (or use a private window) before switching persona.

---

## 4. Account count summary

| Group | Accounts |
|-------|----------|
| Superuser | 1 |
| Demo (customer / admin / delivery) | 3 |
| Tester 1 | 3 |
| Tester 2 | 3 |
| **Total** | **10** |

All passwords: **`Test@123`**

### Spice Malabar admin (this tenant only)

| Email | Password | Login |
|-------|----------|-------|
| `spice-malabar@admin.test` | `Test@123` | https://chopsticksspicemalabar.directapp.in/admin/login |

---

## 5. Related docs

- [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md)
- [SAAS_DATABASE_DIAGRAM.md](./SAAS_DATABASE_DIAGRAM.md)
- [QA_TESTER_1.md](./QA_TESTER_1.md) / [QA_TESTER_2.md](./QA_TESTER_2.md) — older guides; password and Master portal in this file supersede them for credentials.
- [PRODUCTION_TENANT_SETUP.md](./PRODUCTION_TENANT_SETUP.md) — Spice Malabar production seed and admin login.
