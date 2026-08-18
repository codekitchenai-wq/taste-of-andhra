# Tester login reference

**Shared password (all accounts):** `Test@123`  
**Local app:** http://127.0.0.1:5173  
**Production platform:** https://www.directapp.in  
**Taste of Andhra storefront:** https://www.thetasteofandhra.com  

Seed accounts (requires service role key in `.env.local`):

```bash
npm run seed:qa-testers
```

If DirectApp Master login works but the dashboard rejects you, the DB enum may be missing. Run in Supabase SQL Editor, then `node scripts/seed-superuser.mjs`:

```sql
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';
UPDATE public.profiles
SET role = 'platform_master'
WHERE email = 'master@tasteofandhra.test';
```

Until that SQL runs, the app still treats `master@tasteofandhra.test` as DirectApp Master by email so `/master` works for testing.

---

## Portal links

| Persona | Login URL (local) | After login |
|---------|-------------------|-------------|
| **DirectApp Master** | http://127.0.0.1:5173/master/login | http://127.0.0.1:5173/master |
| Customer | http://127.0.0.1:5173/login | http://127.0.0.1:5173/ |
| Restaurant admin | http://127.0.0.1:5173/admin/login | http://127.0.0.1:5173/admin |
| Delivery | http://127.0.0.1:5173/delivery/login | http://127.0.0.1:5173/delivery |

| Persona | Login URL (production) | After login |
|---------|------------------------|-------------|
| **DirectApp Master** | https://www.directapp.in/master/login | https://www.directapp.in/master |
| Customer | https://www.thetasteofandhra.com/login | https://www.thetasteofandhra.com/ |
| Restaurant admin | https://www.thetasteofandhra.com/admin/login | https://www.thetasteofandhra.com/admin |
| Delivery | https://www.thetasteofandhra.com/delivery/login | https://www.thetasteofandhra.com/delivery |

Each persona has a **separate login URL**. Do not use customer login for admin / delivery / DirectApp Master.

Credentials are also shown on each login screen (test helper panel) and in the site footer when `SHOW_TEST_HELPERS` is enabled.

---

## 1. DirectApp Master (control plane)

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

## 2. Tenant logins (one set per restaurant)

Canonical list: [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md) and [TENANT_LOGIN_CREDENTIALS.xlsx](./TENANT_LOGIN_CREDENTIALS.xlsx).

| Tenant | Admin | Customer | Delivery |
|--------|-------|----------|----------|
| The Taste of Andhra | `demoadmin@tasteofandhra.test` | `democustomer@tasteofandhra.test` | `demodelivery@tasteofandhra.test` |
| Chopstick Spice Malabar | `demoadmin@chopsticksspicemalabar.test` | `democustomer@chopsticksspicemalabar.test` | `demodelivery@chopsticksspicemalabar.test` |
| Devi Home Foods | `demoadmin@devihomefoods.test` | `democustomer@devihomefoods.test` | `demodelivery@devihomefoods.test` |

Password for all: **`Test@123`**. These users cannot sign in on another restaurant.

---

## 3. Suggested end-to-end flow

1. **DirectApp Master** — open `/master` on www.directapp.in.
2. **Admin** — that restaurant’s `/admin/dishes`.
3. **Customer** — place an order from that restaurant’s `/menu`.
4. **Admin** — confirm and assign that restaurant’s demo delivery user.
5. **Delivery** — complete delivery on `/delivery`.

Always **log out** (or use a private window) before switching persona or restaurant.

---

## 4. Account count

| Group | Accounts |
|-------|----------|
| DirectApp Master | 1 |
| Per restaurant (admin + customer + delivery) | 3 |
| Taste of Andhra + Spice Malabar + Devi Home Foods | 9 tenant + 1 master = **10** |

Old Tester 1 / Tester 2 / shared `customer@tasteofandhra.test` accounts are retired.

---

## 5. Related docs

- [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md)
- [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md)
- [PRODUCTION_TENANT_SETUP.md](./PRODUCTION_TENANT_SETUP.md)
