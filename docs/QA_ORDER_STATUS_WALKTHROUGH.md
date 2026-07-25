# Walkthrough — Admin status & delivery (Out for Delivery → Delivered)

Use this with **two or three browser windows** (or normal + private/incognito) so Customer, Admin, and Delivery stay logged in at the same time.

**Site:** https://www.thetasteofandhra.com  

| Persona | Login | Password |
|---------|-------|----------|
| Customer | `/login` | `Test@123` |
| Admin | `/admin/login` | `Test@123` |
| Delivery | `/delivery/login` | `Test@123` |

Use matching tester accounts only (Tester 1 with Tester 1, Tester 2 with Tester 2). See [QA_TESTER_1.md](./QA_TESTER_1.md) or [QA_TESTER_2.md](./QA_TESTER_2.md).

---

## Part A — Admin status dropdown (kitchen progress)

### Goal
Move an order through **Pending → Confirmed → Preparing → Ready** and confirm the customer Order Tracking stepper updates.

### Setup
1. **Customer** — place an order (menu → cart → checkout).
2. Note the **order number**.
3. Open the order: **My Orders** → order → `/orders/:orderId`.
4. Confirm tracking shows **Pending** with **Current status**, and **Cancel Order** is visible.

### Steps (Admin)
1. Log in as **Admin** → https://www.thetasteofandhra.com/admin/orders  
2. Find the order (search by order number if needed).
3. In the row **status dropdown**, change status one step at a time:

| Change to | Toast / admin UI | Customer tracking (`/orders/:orderId`) |
|-----------|------------------|----------------------------------------|
| Confirmed | “Order status updated”; badge = Confirmed | Step 2 current; step 1 completed (checkmark); Cancel still available |
| Preparing | Status saved | Step 3 current; **Cancel Order** hidden |
| Ready | Status saved | Step 4 current |

You can also open the order (**View**) and update status from the detail modal — same expected results.

### Pass criteria
- [ ] Each dropdown change shows success toast and updates the admin badge.
- [ ] Customer stepper “Current status” moves to the matching step after refresh (or reopen).
- [ ] Completed steps show checkmarks; future steps stay grey.
- [ ] Cancel is only available for Pending / Confirmed.

### Optional checks
- Filter admin orders by status — order appears under the new filter.
- Set status to **Cancelled** from admin — customer page shows cancelled state (not the 6-step tracker).

---

## Part B — Assign delivery → Out for Delivery

Orders appear under **Awaiting Assignment** only when status is **Confirmed**, **Preparing**, or **Ready** (not Pending, and not already assigned).

### Steps (Admin)
1. Ensure the test order is at least **Confirmed** (ideally **Ready**) via Part A.
2. Open https://www.thetasteofandhra.com/admin/delivery  
3. Under **Awaiting Assignment**, find the order → **Assign**.
4. In the modal, select your tester delivery partner (or enter name + 10-digit phone).
5. Submit.

### Expected
- Toast: **Delivery partner assigned**
- Order leaves **Awaiting Assignment** and appears under **Active Deliveries**
- Order status becomes **Out for Delivery**
- Customer tracking: step 5 (**Out for Delivery**) = current; live tracking map section may appear
- Delivery partner sees the order on https://www.thetasteofandhra.com/delivery

### Pass criteria
- [ ] Assignment succeeds with Tester delivery account selected.
- [ ] Customer order status / stepper = Out for Delivery.
- [ ] Same order is visible on Delivery dashboard.

---

## Part C — Delivery app: Out for Delivery → Delivered

### Steps (Delivery)
1. Log in as **Delivery** → https://www.thetasteofandhra.com/delivery  
2. Confirm the assigned order appears (**My Deliveries**).
3. Open **View Details** (`/delivery/orders/:deliveryId` or similar).
4. Verify customer name, phone, address, and order total.
5. Optional: click **Share Live Location** and allow GPS — toast **Sharing live location**; customer live map may update.
6. Click **Mark Delivered** (from the detail page or the dashboard card).

### Expected
- Toast: **Order marked as delivered**
- Delivery badge / status = **Delivered**; **Mark Delivered** no longer shown
- Customer order: step 6 (**Delivered**) = current; all prior steps completed
- Admin **Active Deliveries** reflects Delivered (or moves off active list depending on UI)

### Pass criteria
- [ ] Mark Delivered updates delivery + order status together.
- [ ] Customer tracking ends on Delivered.
- [ ] Cannot mark the same delivery delivered again (button gone).

---

## Suggested full path (one sitting)

```
Customer places order (Pending)
        ↓
Admin dropdown: Confirmed → Preparing → Ready
        ↓
Admin Delivery: Assign partner  →  Out for Delivery
        ↓
Delivery: Mark Delivered       →  Delivered
        ↓
Customer: confirm stepper + invoice / notifications
```

---

## Common blockers

| Issue | Likely cause |
|-------|----------------|
| Order missing from Awaiting Assignment | Still **Pending**, already assigned, or wrong status |
| Delivery dashboard empty | Admin assigned a different partner / phone, or wrong tester account |
| Customer still shows old step | Refresh order details page |
| Location share fails | Browser denied geolocation; not a status bug |
| Cancel still visible after Preparing | Bug — report with order number and current status |

---

## PDF

Printable PDF: [`QA_ORDER_STATUS_WALKTHROUGH.pdf`](./QA_ORDER_STATUS_WALKTHROUGH.pdf)

Regenerate:

```bash
npm run docs:walkthrough-pdf
```

