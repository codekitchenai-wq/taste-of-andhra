# Login credentials & links

**Password for every account below:** `Test@123`

| Environment | Base URL |
|-------------|----------|
| Local | http://127.0.0.1:5173 |
| Production | https://www.thetasteofandhra.com |

Seed / refresh accounts (needs service role in `.env.local`):

```bash
npm run seed:all-test-users
```

---

## All accounts (copy-paste)

| # | Persona | Email | Password | Login link (local) | Login link (production) |
|---|---------|-------|----------|--------------------|-------------------------|
| 1 | Superuser (Master) | `master@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/master/login | https://www.thetasteofandhra.com/master/login |
| 2 | Demo Customer | `customer@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/login | https://www.thetasteofandhra.com/login |
| 3 | Demo Admin | `admin@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/admin/login | https://www.thetasteofandhra.com/admin/login |
| 4 | Demo Delivery | `delivery@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/delivery/login | https://www.thetasteofandhra.com/delivery/login |
| 5 | Tester 1 Customer | `tester1.customer@thetasteofandhra.com` | `Test@123` | http://127.0.0.1:5173/login | https://www.thetasteofandhra.com/login |
| 6 | Tester 1 Admin | `tester1.admin@thetasteofandhra.com` | `Test@123` | http://127.0.0.1:5173/admin/login | https://www.thetasteofandhra.com/admin/login |
| 7 | Tester 1 Delivery | `tester1.delivery@thetasteofandhra.com` | `Test@123` | http://127.0.0.1:5173/delivery/login | https://www.thetasteofandhra.com/delivery/login |
| 8 | Tester 2 Customer | `tester2.customer@thetasteofandhra.com` | `Test@123` | http://127.0.0.1:5173/login | https://www.thetasteofandhra.com/login |
| 9 | Tester 2 Admin | `tester2.admin@thetasteofandhra.com` | `Test@123` | http://127.0.0.1:5173/admin/login | https://www.thetasteofandhra.com/admin/login |
| 10 | Tester 2 Delivery | `tester2.delivery@thetasteofandhra.com` | `Test@123` | http://127.0.0.1:5173/delivery/login | https://www.thetasteofandhra.com/delivery/login |

**Total: 10 accounts · one shared password: `Test@123`**

Use the **matching login URL** for each persona (do not sign in as admin on `/login`).

---

## After login (landing pages)

| Persona | Local | Production |
|---------|-------|------------|
| Superuser | http://127.0.0.1:5173/master | https://www.thetasteofandhra.com/master |
| Superuser · Tenants | http://127.0.0.1:5173/master/tenants | https://www.thetasteofandhra.com/master/tenants |
| Superuser · Features | http://127.0.0.1:5173/master/features | https://www.thetasteofandhra.com/master/features |
| Customer | http://127.0.0.1:5173/ | https://www.thetasteofandhra.com/ |
| Customer · Menu | http://127.0.0.1:5173/menu | https://www.thetasteofandhra.com/menu |
| Admin | http://127.0.0.1:5173/admin | https://www.thetasteofandhra.com/admin |
| Delivery | http://127.0.0.1:5173/delivery | https://www.thetasteofandhra.com/delivery |

---

## Quick cards

### Superuser
- **Email:** `master@tasteofandhra.test`
- **Password:** `Test@123`
- **Login:** [local](http://127.0.0.1:5173/master/login) · [production](https://www.thetasteofandhra.com/master/login)

### Demo Customer
- **Email:** `customer@tasteofandhra.test`
- **Password:** `Test@123`
- **Login:** [local](http://127.0.0.1:5173/login) · [production](https://www.thetasteofandhra.com/login)

### Demo Admin
- **Email:** `admin@tasteofandhra.test`
- **Password:** `Test@123`
- **Login:** [local](http://127.0.0.1:5173/admin/login) · [production](https://www.thetasteofandhra.com/admin/login)

### Demo Delivery
- **Email:** `delivery@tasteofandhra.test`
- **Password:** `Test@123`
- **Login:** [local](http://127.0.0.1:5173/delivery/login) · [production](https://www.thetasteofandhra.com/delivery/login)

### Tester 1
| Role | Email | Password | Login |
|------|-------|----------|-------|
| Customer | `tester1.customer@thetasteofandhra.com` | `Test@123` | [/login](http://127.0.0.1:5173/login) |
| Admin | `tester1.admin@thetasteofandhra.com` | `Test@123` | [/admin/login](http://127.0.0.1:5173/admin/login) |
| Delivery | `tester1.delivery@thetasteofandhra.com` | `Test@123` | [/delivery/login](http://127.0.0.1:5173/delivery/login) |

### Tester 2
| Role | Email | Password | Login |
|------|-------|----------|-------|
| Customer | `tester2.customer@thetasteofandhra.com` | `Test@123` | [/login](http://127.0.0.1:5173/login) |
| Admin | `tester2.admin@thetasteofandhra.com` | `Test@123` | [/admin/login](http://127.0.0.1:5173/admin/login) |
| Delivery | `tester2.delivery@thetasteofandhra.com` | `Test@123` | [/delivery/login](http://127.0.0.1:5173/delivery/login) |

---

## Notes

- Credentials also appear on each login screen and in the site footer when test helpers are enabled.
- Always log out (or use a private window) before switching persona.
- More detail: [TESTER_LOGIN_REFERENCE.md](./TESTER_LOGIN_REFERENCE.md)
