# DATABASE_SCHEMA.md

# Taste of Andhra - Database Schema

Version: 1.0

Database: PostgreSQL (Supabase)

---

# Database Design Principles

- Use UUID as the primary key for all tables.
- Use `created_at` and `updated_at` timestamps.
- Use foreign keys to maintain referential integrity.
- Do not physically delete important records (soft delete when appropriate).
- Store prices in NUMERIC(10,2).
- Use TIMESTAMPTZ for all date/time values.
- Store images in Supabase Storage and only save their public URLs in the database.

---

# Entity Relationship Overview

Users
├── Addresses
├── Orders
│   ├── Order Items
│   ├── Payments
│   └── Delivery
└── Cart
    └── Cart Items

Categories
└── Dishes

Offers
└── Orders

---

# ENUMS

## User Role

- customer
- admin
- delivery

## Order Status

- pending
- confirmed
- preparing
- ready
- out_for_delivery
- delivered
- cancelled

## Payment Status

- pending
- paid
- failed
- refunded

## Payment Method

- cod
- razorpay

## Spice Level

- mild
- medium
- hot
- extra_hot

---

# TABLE: profiles

Purpose

Stores application users.

Columns

| Column | Type | Notes |
|---------|------|------|
| id | UUID | PK, references auth.users |
| full_name | TEXT | NOT NULL |
| email | TEXT | UNIQUE |
| phone | TEXT | UNIQUE |
| role | user_role | DEFAULT customer |
| avatar_url | TEXT | nullable |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

Relationship

One user

→ many orders

→ many addresses

→ one cart

---

# TABLE: categories

| Column | Type |
|---------|------|
| id | UUID |
| name | TEXT |
| slug | TEXT UNIQUE |
| description | TEXT |
| image_url | TEXT |
| display_order | INTEGER |
| is_active | BOOLEAN |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

Examples

Starters

Biryani

Veg Curry

Desserts

---

# TABLE: dishes

| Column | Type |
|---------|------|
| id | UUID |
| category_id | UUID FK |
| name | TEXT |
| slug | TEXT UNIQUE |
| description | TEXT |
| ingredients | TEXT |
| price | NUMERIC(10,2) |
| calories | INTEGER |
| spice_level | spice_level |
| preparation_time | INTEGER |
| image_url | TEXT |
| is_veg | BOOLEAN |
| is_available | BOOLEAN |
| is_featured | BOOLEAN |
| rating | NUMERIC(2,1) |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

Relationship

Category

→ many dishes

---

# TABLE: addresses

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID FK |
| address_type | TEXT |
| full_name | TEXT |
| phone | TEXT |
| address_line1 | TEXT |
| address_line2 | TEXT |
| landmark | TEXT |
| city | TEXT |
| state | TEXT |
| pincode | TEXT |
| latitude | NUMERIC |
| longitude | NUMERIC |
| is_default | BOOLEAN |
| created_at | TIMESTAMPTZ |

Relationship

User

→ many addresses

---

# TABLE: cart

One cart per customer.

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID FK UNIQUE |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

---

# TABLE: cart_items

| Column | Type |
|---------|------|
| id | UUID |
| cart_id | UUID FK |
| dish_id | UUID FK |
| quantity | INTEGER |
| created_at | TIMESTAMPTZ |

Relationship

Cart

→ many cart items

Dish

→ many cart items

---

# TABLE: orders

| Column | Type |
|---------|------|
| id | UUID |
| order_number | TEXT UNIQUE |
| user_id | UUID FK |
| address_id | UUID FK |
| subtotal | NUMERIC(10,2) |
| tax | NUMERIC(10,2) |
| delivery_charge | NUMERIC(10,2) |
| discount | NUMERIC(10,2) |
| total | NUMERIC(10,2) |
| payment_method | payment_method |
| payment_status | payment_status |
| order_status | order_status |
| special_instructions | TEXT |
| estimated_delivery | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

Relationship

User

→ many orders

---

# TABLE: order_items

| Column | Type |
|---------|------|
| id | UUID |
| order_id | UUID FK |
| dish_id | UUID FK |
| quantity | INTEGER |
| price | NUMERIC(10,2) |
| total | NUMERIC(10,2) |

Relationship

Order

→ many order items

---

# TABLE: payments

| Column | Type |
|---------|------|
| id | UUID |
| order_id | UUID FK UNIQUE |
| payment_gateway | TEXT |
| transaction_id | TEXT |
| amount | NUMERIC(10,2) |
| status | payment_status |
| paid_at | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ |

---

# TABLE: offers

| Column | Type |
|---------|------|
| id | UUID |
| title | TEXT |
| description | TEXT |
| discount_percentage | NUMERIC |
| minimum_order | NUMERIC |
| coupon_code | TEXT |
| start_date | DATE |
| end_date | DATE |
| is_active | BOOLEAN |
| created_at | TIMESTAMPTZ |

---

# TABLE: reviews

| Column | Type |
|---------|------|
| id | UUID |
| dish_id | UUID FK |
| user_id | UUID FK |
| rating | INTEGER |
| review | TEXT |
| created_at | TIMESTAMPTZ |

---

# TABLE: delivery

| Column | Type |
|---------|------|
| id | UUID |
| order_id | UUID FK UNIQUE |
| delivery_partner | TEXT |
| partner_phone | TEXT |
| status | order_status |
| assigned_at | TIMESTAMPTZ |
| delivered_at | TIMESTAMPTZ |

---

# Indexes

Create indexes on

- email
- phone
- category_id
- user_id
- order_id
- payment_status
- order_status
- created_at
- slug

---

# Row Level Security (Supabase)

Customers can

- Read available dishes
- Read categories
- Read their own profile
- Read their own orders
- Read their own addresses
- Manage their own cart

Admins can

- Full CRUD on all tables

Delivery users can

- Read assigned deliveries
- Update delivery status

---

# Soft Delete Strategy

Do NOT delete

- Orders
- Payments
- Customers

Instead

Use

is_active BOOLEAN

or

deleted_at TIMESTAMPTZ

where appropriate.

---

# Sample Order Flow

Customer

↓

Login

↓

Browse Menu

↓

Add Items to Cart

↓

Checkout

↓

Choose Address

↓

Select Payment Method

↓

Create Order

↓

Payment Success

↓

Kitchen Preparing

↓

Out For Delivery

↓

Delivered

---

# Future Tables

- inventory
- kitchen_queue
- loyalty_points
- coupons
- notifications
- branches
- staff
- expense_tracker
- gst_invoice

---

# Cursor Instructions

When generating SQL or Supabase code:

- Use UUID primary keys.
- Create foreign key constraints.
- Enable Row Level Security (RLS).
- Add indexes for frequently queried columns.
- Use cascading deletes only for dependent tables such as cart_items and order_items.
- Never delete historical order or payment records.
- Use transactions for checkout and payment operations.
- Keep the schema normalized and avoid duplicate data.
