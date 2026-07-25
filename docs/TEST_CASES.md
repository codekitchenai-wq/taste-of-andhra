# The Taste of Andhra — Test Cases

Use this document to manually validate the application before releases. Each case has a unique ID for tracking pass/fail.

**Legend:** P1 = critical path · P2 = important · P3 = nice to verify

**Test environment checklist**
- [ ] Supabase migrations applied (including `20250721160000_phone_auth_profile_trigger.sql`)
- [ ] Phone OTP provider enabled (or Supabase test numbers configured)
- [ ] `.env.local` has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Optional: `seed_menu.sql` run for sample dishes
- [ ] Admin user created and promoted in Supabase

**Result codes:** Pass · Fail · Blocked · N/A

---

## 1. Public website

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| PUB-01 | P1 | Home page loads | Open `/` | Hero, featured categories, dishes, testimonials render; no console errors |
| PUB-02 | P2 | Navigation links work | Click each main nav item | Home, Menu, About, Gallery, Party Orders, Contact load correctly |
| PUB-03 | P1 | Menu listing | Open `/menu` | Dishes load from Supabase; images and prices visible |
| PUB-04 | P1 | Menu search | Search for a dish name (e.g. "biryani") | Only matching dishes shown; clear search restores list |
| PUB-05 | P2 | Category filter | Select a category filter | Dishes filtered to that category |
| PUB-06 | P2 | Diet filter | Filter Veg / Non-Veg | Correct dishes shown |
| PUB-07 | P2 | Spice filter | Select a spice level | Dishes filtered accordingly |
| PUB-08 | P2 | Sort options | Sort by price / rating | Order changes as selected |
| PUB-09 | P1 | Dish details | Click a dish card | `/menu/:slug` shows image, price, description, ingredients, reviews section |
| PUB-10 | P2 | About page | Open `/about` | Story, stats, hours, visit info display |
| PUB-11 | P2 | Gallery page | Open `/gallery` | Images load; category filters work |
| PUB-12 | P2 | Contact page | Open `/contact` | Contact info visible; form validates required fields |
| PUB-13 | P3 | Contact form submit | Fill valid form and submit | Email client opens or success message shown |
| PUB-14 | P2 | Mobile responsive | Resize to mobile width | Navbar/mobile menu usable; pages readable |
| PUB-15 | P2 | Footer links | Click footer quick links | Correct pages open |

---

## 2. Customer authentication (mobile OTP)

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| AUTH-01 | P1 | Register — send OTP | `/register` → enter name + valid 10-digit phone → Send OTP | Success toast; OTP step shown; phone displayed |
| AUTH-02 | P1 | Register — invalid phone | Enter 9-digit or letters → Send OTP | Validation error; OTP not sent |
| AUTH-03 | P1 | Register — verify OTP | Enter correct 6-digit OTP → Verify | Account created; redirected; user logged in |
| AUTH-04 | P1 | Register — wrong OTP | Enter incorrect OTP | Error message; stays on OTP step |
| AUTH-05 | P2 | Register — resend OTP | Wait for countdown → Resend OTP | New OTP sent; countdown resets |
| AUTH-06 | P2 | Register — change phone | On OTP step → Change → edit phone | Returns to phone step with new number |
| AUTH-07 | P1 | Login — existing user | `/login` → phone → OTP → verify | Signed in; redirected to home or prior page |
| AUTH-08 | P2 | Login — new number | Use unregistered phone on login | Supabase creates account or shows appropriate message |
| AUTH-09 | P1 | Protected route guard | Visit `/checkout` while logged out | Redirected to login |
| AUTH-10 | P1 | Logout | Sign out from navbar/profile | Session cleared; cart UI reflects guest state |
| AUTH-11 | P2 | Deactivated account | Admin deactivates customer → customer logs in | Login fails with deactivation message |
| AUTH-12 | P2 | Guest route guard | Visit `/login` while logged in | Redirected away from auth pages |

---

## 3. Cart

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| CART-01 | P1 | Add to cart (guest) | Logged out → Add to cart on menu | Prompt to sign in; redirect to login |
| CART-02 | P1 | Add to cart (logged in) | Add dish from menu or detail page | Success toast; cart badge count increases |
| CART-03 | P1 | View cart | Open `/cart` | Items, quantities, subtotal correct |
| CART-04 | P1 | Update quantity | Increase/decrease quantity | Subtotal updates; min quantity 1 |
| CART-05 | P1 | Remove item | Remove an item | Item removed; cart empty state if last item |
| CART-06 | P2 | Clear cart | Clear all items | Cart empty |
| CART-07 | P2 | Persist cart | Add items → refresh page | Cart restored for same user |
| CART-08 | P2 | Unavailable dish | Admin marks dish unavailable → user has it in cart | Checkout blocked with clear error |

---

## 4. Checkout & payments

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| CHK-01 | P1 | Empty cart redirect | Go to `/checkout` with empty cart | Redirected to `/cart` |
| CHK-02 | P1 | Select address | Choose saved address | Address highlighted; required for place order |
| CHK-03 | P1 | Add address at checkout | Add new address via modal | Address saved and selected |
| CHK-04 | P1 | No address block | No addresses → Place order | Button disabled or error shown |
| CHK-05 | P1 | COD order | Select COD → Place order | Order created; cart cleared; `/order-success` shown |
| CHK-06 | P1 | Order totals | Subtotal ₹300 | Tax 5% (₹15), delivery ₹49, total ₹364 |
| CHK-07 | P2 | Free delivery | Subtotal ≥ ₹399 | Delivery charge ₹0 |
| CHK-08 | P1 | Valid coupon | Apply active coupon code | Discount shown; total reduced |
| CHK-09 | P2 | Invalid coupon | Apply wrong/expired code | Error toast; no discount applied |
| CHK-10 | P2 | Minimum order coupon | Coupon with min order ₹500, cart ₹300 | Error: minimum not met |
| CHK-11 | P1 | Online pay (demo) | Razorpay key not set → Pay Online → complete demo | Order marked paid; success page |
| CHK-12 | P2 | Online pay (live) | With `VITE_RAZORPAY_KEY_ID` → complete Razorpay | Payment success; order confirmed |
| CHK-13 | P2 | Payment cancelled | Close Razorpay modal | Order saved pending; redirect to order details message |
| CHK-14 | P2 | Special instructions | Add note at checkout | Saved on order; visible in order details |
| CHK-15 | P2 | Remove coupon | Apply coupon → Remove | Discount cleared; total recalculated |

---

## 5. Orders & tracking

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| ORD-01 | P1 | Order history | Open `/orders` | Past orders listed with number, status, total |
| ORD-02 | P1 | Order details | Click an order | Items, address, payment method, totals shown |
| ORD-03 | P1 | Status tracker | View order with status "preparing" | Stepper shows correct progress |
| ORD-04 | P1 | Cancel order | Cancel while pending/confirmed | Status → cancelled; message shown |
| ORD-05 | P2 | Cancel blocked | Try cancel after preparing started | Error: cannot cancel |
| ORD-06 | P2 | Empty orders | New user with no orders | Empty state with link to menu |

---

## 6. Saved addresses

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| ADDR-01 | P1 | List addresses | Open `/addresses` | Saved addresses shown |
| ADDR-02 | P1 | Add address | Add valid address | Appears in list |
| ADDR-03 | P1 | Edit address | Edit existing | Changes saved |
| ADDR-04 | P1 | Delete address | Delete an address | Removed after confirm |
| ADDR-05 | P2 | Set default | Mark address as default | Default badge shown; used at checkout |
| ADDR-06 | P2 | Validation | Submit with invalid pincode (5 digits) | Validation error |

---

## 7. Profile

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| PROF-01 | P1 | View profile | Open `/profile` | Name and phone shown |
| PROF-02 | P1 | Update name | Change full name → Save | Success toast; navbar/profile updated |
| PROF-03 | P2 | Update phone | Change valid phone → Save | Saved successfully |
| PROF-04 | P2 | Invalid phone | Enter 9-digit phone | Validation error |

---

## 8. Reviews

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| REV-01 | P1 | Submit review (logged in) | Dish detail → rate 1–5 → Submit | Review appears in list |
| REV-02 | P2 | Review without login | Logged out → try submit | Redirect to login |
| REV-03 | P2 | Update review | Submit second review same dish | Existing review updated |
| REV-04 | P2 | Dish rating | After review | Dish rating reflects average |

---

## 9. Party order enquiry

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| PARTY-01 | P1 | Submit enquiry (guest) | Fill `/party-order` form → Submit | Success message; form reset option |
| PARTY-02 | P2 | Validation | Submit with missing landmark | Field error shown |
| PARTY-03 | P2 | Guest count limits | Enter 0 or >2000 guests | Validation error |
| PARTY-04 | P2 | Meal preference | Select veg / non-veg / mix | Selection stored and submitted |

---

## 10. Admin — authentication & access

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| ADM-01 | P1 | Admin login | `/admin/login` with admin credentials | Dashboard access |
| ADM-02 | P1 | Customer denied | Customer account on admin login | Access denied; logged out |
| ADM-03 | P1 | Route guard | Visit `/admin` without login | Redirect to admin login |
| ADM-04 | P2 | Non-admin URL | Customer visits `/admin/categories` | Blocked |

---

## 11. Admin — menu management

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| ADM-10 | P1 | List categories | `/admin/categories` | Categories table loads |
| ADM-11 | P1 | Create category | Add category with name | Appears in list and public menu |
| ADM-12 | P1 | Edit category | Update name/description | Changes reflected on menu |
| ADM-13 | P2 | Category image upload | Upload image | Image visible on category |
| ADM-14 | P1 | Create dish | Add dish with price, category | Appears in admin and menu |
| ADM-15 | P1 | Edit dish | Change price/availability | Updates on customer menu |
| ADM-16 | P2 | Soft delete dish | Delete dish | Removed from menu (`is_available=false`) |
| ADM-17 | P2 | Search dishes | Search in admin dishes | Filter works |

---

## 12. Admin — orders & delivery

Step-by-step tester walkthrough: [QA_ORDER_STATUS_WALKTHROUGH.md](./QA_ORDER_STATUS_WALKTHROUGH.md)

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| ADM-20 | P1 | List orders | `/admin/orders` | Orders with customer info |
| ADM-21 | P1 | Update order status | Change pending → confirmed → preparing | Status saved; customer tracker updates |
| ADM-22 | P2 | Filter by status | Filter orders | Correct subset shown |
| ADM-23 | P2 | View order detail | Open order modal | Full line items and address |
| ADM-24 | P1 | Assign delivery | `/admin/delivery` → Assign partner to order | Delivery record created; status out_for_delivery |
| ADM-25 | P1 | Mark delivered | Update delivery to delivered | Order status synced to delivered |
| ADM-26 | P2 | Awaiting queue | Order ready but unassigned | Appears in "Awaiting Assignment" |

---

## 13. Admin — customers, offers, party inquiries, reports

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| ADM-30 | P1 | List customers | `/admin/customers` | Customer list with status |
| ADM-31 | P1 | Deactivate customer | Deactivate account | Status inactive; customer cannot login |
| ADM-32 | P1 | Reactivate customer | Activate account | Customer can login again |
| ADM-33 | P1 | Create offer | Add offer with coupon code & dates | Offer listed |
| ADM-34 | P1 | Coupon at checkout | Use coupon from ADM-33 | Discount applied (see CHK-08) |
| ADM-35 | P1 | Party inquiries | `/admin/party-inquiries` | Submitted enquiries visible |
| ADM-36 | P2 | Update inquiry status | Change new → contacted | Status saved |
| ADM-37 | P2 | Reports dashboard | `/admin/reports` | Revenue and sales charts load |
| ADM-38 | P2 | Settings page | `/admin/settings` | Restaurant info and integration status shown |

---

## 14. Security & data isolation (RLS)

| ID | Priority | Test case | Steps | Expected result |
|----|----------|-----------|-------|-----------------|
| SEC-01 | P1 | Own orders only | Customer A cannot open Customer B order URL | Not found or access denied |
| SEC-02 | P1 | Own addresses only | Customer cannot edit another user's address | Update fails |
| SEC-03 | P2 | Admin read all | Admin views any order | Access granted |
| SEC-04 | P2 | Guest no admin API | Unauthenticated request to admin-only data | Blocked by RLS |

---

## 15. Automated unit tests

Pure business logic is covered by Vitest. Run:

```bash
npm test
```

| Area | Test file | What is validated |
|------|-----------|-------------------|
| Order pricing | `src/utils/orderTotals.test.ts` | Tax, delivery, free delivery threshold, discounts |
| Phone numbers | `src/utils/phone.test.ts` | Normalization, E.164, display format |
| Validation | `src/utils/validation.test.ts` | Email, phone, password rules |

---

## 16. Regression smoke test (pre-release)

Run this 15-minute checklist before every release:

1. [ ] AUTH-03 — Register new customer via OTP  
2. [ ] CART-02 — Add item to cart  
3. [ ] CHK-05 — Place COD order  
4. [ ] ORD-02 — View order details  
5. [ ] PUB-09 — Open dish details and submit review  
6. [ ] PARTY-01 — Submit party enquiry  
7. [ ] ADM-01 — Admin login  
8. [ ] ADM-21 — Update order status  
9. [ ] ADM-24 — Assign delivery  
10. [ ] PUB-03 — Public menu still loads  

---

## Test data suggestions

| Item | Sample value |
|------|----------------|
| Test phone | Use Supabase test number from dashboard |
| Test OTP | Fixed OTP from Supabase test config |
| Coupon | Seeded codes: `TEST10`, `WELCOME15`, `SAVE20`, `FESTIVE25` (see `npm run seed:test-coupons`) |
| Test address | Home, 123 Test St, Hyderabad, Telangana, 500001 |
| Admin email | Created in Supabase Dashboard |

---

*Document version: 1.0 · Matches app state as of July 2026*

**Excel workbook:** [`TASTE_OF_ANDHRA_TEST_CASES.xlsx`](TASTE_OF_ANDHRA_TEST_CASES.xlsx) — use for recording results and logging defects. Regenerate with `npm run docs:test-excel`.
