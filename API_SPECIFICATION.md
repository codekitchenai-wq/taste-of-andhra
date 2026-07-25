# API_SPECIFICATION.md

# The Taste of Andhra
## API & Service Layer Specification

Version: 1.0

Backend: Supabase (PostgreSQL + Auth + Storage)

---

# Purpose

This document defines all backend operations required by the application.

Even though Supabase provides direct database access, every operation must be implemented through reusable service functions.

Never call Supabase directly from UI components.

Use services such as

services/

- authService.ts
- categoryService.ts
- dishService.ts
- cartService.ts
- orderService.ts
- paymentService.ts
- customerService.ts
- addressService.ts
- reportService.ts

---

# Authentication

## Register Customer

Input

- Full Name
- Email
- Password
- Phone

Output

- User Profile
- Session

Validation

- Email must be unique
- Phone must be unique
- Password minimum 8 characters

---

## Login

Input

- Email
- Password

Output

- Session
- JWT
- User Profile

---

## Logout

Output

- Session Destroyed

---

## Get Current User

Output

- Profile
- Role

---

# Categories

## Get Categories

Return

- Active Categories
- Sorted by display_order

---

## Create Category

Input

- Name
- Description
- Image
- Display Order

Validation

- Name required
- Name unique

Admin Only

---

## Update Category

Admin Only

---

## Delete Category

Admin Only

Soft delete preferred.

---

# Dishes

## Get All Dishes

Support Filters

- Category
- Veg
- Non Veg
- Available
- Featured

Sorting

- Price
- Rating
- Popularity

Pagination

Supported

---

## Get Dish

Input

Dish ID

Output

Complete Dish Details

---

## Create Dish

Admin Only

Fields

- Name
- Description
- Ingredients
- Category
- Price
- Calories
- Preparation Time
- Image
- Veg
- Available
- Featured
- Spice Level

---

## Update Dish

Admin Only

---

## Delete Dish

Admin Only

Soft delete preferred.

---

# Cart

## Get Cart

Input

Current User

Return

Cart

Items

Totals

---

## Add Item

Input

Dish ID

Quantity

Behavior

If item exists

Increase quantity

Otherwise

Insert new item

---

## Update Quantity

Input

Cart Item ID

Quantity

---

## Remove Item

Input

Cart Item ID

---

## Clear Cart

Delete all cart items.

---

# Addresses

## Get Addresses

Return

Customer Addresses

---

## Add Address

Fields

- Full Name
- Phone
- Address
- Landmark
- City
- State
- Pincode

---

## Update Address

---

## Delete Address

---

## Set Default Address

Only one default address allowed.

---

# Checkout

## Create Order

Steps

1.

Validate Cart

↓

2.

Calculate Totals

↓

3.

Create Order

↓

4.

Create Order Items

↓

5.

Create Payment Record

↓

6.

Clear Cart

↓

7.

Return Order

---

# Orders

## Get Customer Orders

Return

Current user's orders only.

Sort

Newest First

---

## Get Order Details

Return

Order

Items

Payment

Delivery

---

## Update Order Status

Admin Only

Allowed Status

Pending

Confirmed

Preparing

Ready

Out For Delivery

Delivered

Cancelled

---

## Cancel Order

Customer

Allowed only

Before Preparing

---

# Payments

## Create Payment

Input

Order

Payment Method

Return

Payment Record

---

## Update Payment

Admin

or

Webhook

---

## Verify Payment

Future Razorpay Integration

---

# Reviews

## Create Review

Customer

Requirements

Delivered Order

Rating

1-5

Review

Optional

---

## Update Review

Owner Only

---

## Delete Review

Owner

or

Admin

---

# Customers

Admin Only

## Get Customers

Search

Name

Phone

Email

Pagination

Supported

---

## Get Customer Details

Include

Orders

Addresses

Total Spend

---

# Offers

## Get Active Offers

Customer

---

## Create Offer

Admin

---

## Update Offer

Admin

---

## Delete Offer

Admin

---

# Reports

Admin Only

Generate

Today's Revenue

Weekly Revenue

Monthly Revenue

Order Count

Popular Dishes

Popular Categories

New Customers

Repeat Customers

Average Order Value

---

# Storage

Upload

Dish Images

Category Images

Offer Images

Customer Avatar

Storage Bucket

restaurant-images

---

# Error Responses

Return standard structure

{
  "success": false,
  "message": "Something went wrong",
  "error": "Detailed error"
}

---

# Success Responses

Return standard structure

{
  "success": true,
  "data": {}
}

---

# Validation Rules

Email

Valid Email

Phone

10 Digits

Price

Greater than zero

Quantity

Minimum one

Category

Must exist

Dish

Must exist

---

# Security

Use Row Level Security.

Customers

Can access only

Their own

Profile

Addresses

Orders

Cart

Reviews

Admins

Full Access

---

# Transactions

Use database transactions for

Checkout

Payment

Order Creation

Order Cancellation

Refund

Never leave partial data.

---

# Logging

Log

Authentication

Orders

Payments

Errors

Admin Actions

---

# Cursor Development Rules

When implementing backend logic:

- Never access Supabase directly from React components.
- Use service classes/functions.
- Keep business logic inside services.
- Validate all user input.
- Handle loading and error states.
- Use TypeScript types for all responses.
- Reuse interfaces from the types folder.
- Keep functions small and focused.
- Prefer async/await.
- Return consistent response objects.
- Do not duplicate database queries.
