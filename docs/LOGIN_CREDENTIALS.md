# Login credentials & links

**Password for every account below:** `Test@123`

Each restaurant login works **only on that restaurant**. DirectApp Master is the only platform-level account.

Excel copy: [TENANT_LOGIN_CREDENTIALS.xlsx](./TENANT_LOGIN_CREDENTIALS.xlsx)

| Environment | Base URL |
|-------------|----------|
| Local | http://127.0.0.1:5173 |
| Platform (Master) | https://www.directapp.in |
| Taste of Andhra | https://www.thetasteofandhra.com |
| Chopstick Spice Malabar | https://chopsticksspicemalabar.directapp.in |
| Devi Home Foods | https://devihomefoods.directapp.in |

Seed / refresh (needs service role in `.env.local`):

```bash
npm run seed:qa-testers
npm run docs:login-excel
```

Production:

```bash
npm run seed:qa-testers:production
```

Emails use a `.test` domain because the login form requires a valid address (`demoadmin@tasteofandhra` → `demoadmin@tasteofandhra.test`).

---

## Master (platform)

| Persona | Username | Password | Local | Production |
|---------|----------|----------|-------|------------|
| DirectApp Master | `master@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/master/login | https://www.directapp.in/master/login |

---

## The Taste of Andhra (tenant)

| Persona | Username | Password | Local | Production |
|---------|----------|----------|-------|------------|
| Admin | `demoadmin@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/admin/login | https://www.thetasteofandhra.com/admin/login |
| Customer | `democustomer@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/login | https://www.thetasteofandhra.com/login |
| Delivery | `demodelivery@tasteofandhra.test` | `Test@123` | http://127.0.0.1:5173/delivery/login | https://www.thetasteofandhra.com/delivery/login |

---

## Chopstick Spice Malabar (tenant)

| Persona | Username | Password | Local | Production |
|---------|----------|----------|-------|------------|
| Admin | `demoadmin@chopsticksspicemalabar.test` | `Test@123` | http://127.0.0.1:5173/admin/login?tenant=chopsticksspicemalabar | https://chopsticksspicemalabar.directapp.in/admin/login |
| Customer | `democustomer@chopsticksspicemalabar.test` | `Test@123` | http://127.0.0.1:5173/login?tenant=chopsticksspicemalabar | https://chopsticksspicemalabar.directapp.in/login |
| Delivery | `demodelivery@chopsticksspicemalabar.test` | `Test@123` | http://127.0.0.1:5173/delivery/login?tenant=chopsticksspicemalabar | https://chopsticksspicemalabar.directapp.in/delivery/login |

---

## Devi Home Foods (tenant)

Only if this restaurant is seeded in that environment.

| Persona | Username | Password | Local | Production |
|---------|----------|----------|-------|------------|
| Admin | `demoadmin@devihomefoods.test` | `Test@123` | http://127.0.0.1:5173/admin/login?tenant=devihomefoods | https://devihomefoods.directapp.in/admin/login |
| Customer | `democustomer@devihomefoods.test` | `Test@123` | http://127.0.0.1:5173/login?tenant=devihomefoods | https://devihomefoods.directapp.in/login |
| Delivery | `demodelivery@devihomefoods.test` | `Test@123` | http://127.0.0.1:5173/delivery/login?tenant=devihomefoods | https://devihomefoods.directapp.in/delivery/login |

---

## Notes

- Use the matching login URL for each persona (do not sign in as admin on `/login`).
- A Taste of Andhra demo user cannot sign in on Spice Malabar, and vice versa.
- Old shared testers (`customer@tasteofandhra.test`, Tester 1/2, `spice-malabar@admin.test`, etc.) are deleted by `seed:qa-testers`.
- Always log out (or use a private window) before switching persona.
