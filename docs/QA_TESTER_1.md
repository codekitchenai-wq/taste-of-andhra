# The Taste of Andhra — Tester 1 Guide

**Site:** https://www.thetasteofandhra.com  
**Shared password (all accounts):** `Test@123`  
**Your tester ID:** Tester 1  

Use **only** the Tester 1 accounts below so you do not clash with Tester 2.

---

## Quick start links

| Portal | Login page | After login (landing) |
|--------|------------|------------------------|
| Customer | https://www.thetasteofandhra.com/login | https://www.thetasteofandhra.com/ |
| Admin | https://www.thetasteofandhra.com/admin/login | https://www.thetasteofandhra.com/admin |
| Delivery | https://www.thetasteofandhra.com/delivery/login | https://www.thetasteofandhra.com/delivery |
| Guest (no login) | — | https://www.thetasteofandhra.com/ |

Each persona has a **separate login URL**. Do not use the customer login for admin/delivery.

---

## 1. Customer persona

**Who you are:** End customer browsing the restaurant, ordering food, tracking delivery.

| Field | Value |
|-------|--------|
| Email / User ID | `tester1.customer@thetasteofandhra.com` |
| Password | `Test@123` |
| Login | https://www.thetasteofandhra.com/login |
| Landing | https://www.thetasteofandhra.com/ |

### What to test (broad)
- Browse home, menu, dish details, gallery, contact, party order
- Search / filter dishes; add items to cart; update quantities; checkout
- Add/select delivery address; place order (COD or online demo payment if shown)
- View **My Orders**, open order details, live tracking (if delivery assigned)
- Favorites, notifications, profile, saved addresses, invoice (after order)
- Confirm logout and that protected pages redirect to login

---

## 2. Admin persona

**Who you are:** Restaurant staff managing menu, orders, branches, offers, and delivery assignment.

| Field | Value |
|-------|--------|
| Email / User ID | `tester1.admin@thetasteofandhra.com` |
| Password | `Test@123` |
| Login | https://www.thetasteofandhra.com/admin/login |
| Landing | https://www.thetasteofandhra.com/admin |

### Key admin links
| Area | Link |
|------|------|
| Dashboard | https://www.thetasteofandhra.com/admin |
| Categories | https://www.thetasteofandhra.com/admin/categories |
| **Dishes (add/edit menu)** | https://www.thetasteofandhra.com/admin/dishes |
| Orders | https://www.thetasteofandhra.com/admin/orders |
| Customers | https://www.thetasteofandhra.com/admin/customers |
| Delivery partners | https://www.thetasteofandhra.com/admin/delivery |
| Offers | https://www.thetasteofandhra.com/admin/offers |
| Party inquiries | https://www.thetasteofandhra.com/admin/party-inquiries |
| Branches | https://www.thetasteofandhra.com/admin/branches |
| QR tables | https://www.thetasteofandhra.com/admin/qr-tables |
| Reports | https://www.thetasteofandhra.com/admin/reports |
| Settings | https://www.thetasteofandhra.com/admin/settings |

### What to test (broad)
- Dashboard loads with metrics/charts
- **Add or edit a dish** and a category; confirm it appears on public menu
- Move an order through statuses; assign a delivery partner
- Create/edit offer; check branches and QR table generation
- Open reports; review party inquiries
- Confirm a customer account **cannot** open `/admin` after login

**Detailed walkthrough:** [Admin status dropdown & delivery (Out for Delivery → Delivered)](./QA_ORDER_STATUS_WALKTHROUGH.md)

---

## 3. Delivery persona

**Who you are:** Delivery partner fulfilling assigned orders and sharing live location.

| Field | Value |
|-------|--------|
| Email / User ID | `tester1.delivery@thetasteofandhra.com` |
| Password | `Test@123` |
| Login | https://www.thetasteofandhra.com/delivery/login |
| Landing | https://www.thetasteofandhra.com/delivery |

### What to test (broad)
- See assigned deliveries on the dashboard (coordinate with Admin to assign an order to this account)
- Open delivery detail; verify customer name, phone, address
- Allow location / share GPS if prompted
- Mark order as delivered; confirm customer order status updates
- Confirm non-delivery users cannot open `/delivery`

**Detailed walkthrough:** [Out for Delivery → Delivered](./QA_ORDER_STATUS_WALKTHROUGH.md#part-c--delivery-app-out-for-delivery--delivered)

---

## Suggested flow (end-to-end)

1. **Admin** — ensure menu has dishes (`/admin/dishes`)
2. **Customer** — place an order
3. **Admin** — confirm order and assign **Tester 1 Delivery**
4. **Delivery** — complete delivery
5. **Customer** — check order status, tracking, invoice/notifications

---

## Notes

- Password for all Tester 1 accounts: **`Test@123`**
- Always log out before switching persona (or use a private/incognito window per persona)
- Public pages to spot-check without login:  
  https://www.thetasteofandhra.com/menu · https://www.thetasteofandhra.com/party-order · https://www.thetasteofandhra.com/contact
