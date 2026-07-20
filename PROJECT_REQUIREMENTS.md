# PROJECT_REQUIREMENTS.md

# Taste of Andhra - Restaurant Ordering & Management System

Version: 1.0

---

# 1. Project Overview

Taste of Andhra is a modern restaurant website and online food ordering platform.

The application should allow customers to:

- Browse the restaurant menu
- Search dishes
- Filter dishes
- Add items to cart
- Place online orders
- Track order status
- View previous orders
- Manage delivery addresses
- Make online payments (future)
- Choose Cash on Delivery

The application should also provide an Admin Dashboard where restaurant staff can manage:

- Categories
- Dishes
- Orders
- Customers
- Delivery
- Offers
- Reports

The application must be mobile-first, responsive, fast, and scalable.

---

# 2. Technology Stack

## Frontend

- React (Vite)
- TypeScript
- React Router
- Tailwind CSS
- React Hook Form
- Lucide React

## Backend

- Supabase

Use:

- PostgreSQL Database
- Authentication
- Storage
- Row Level Security

Do NOT build a custom Express backend unless required later.

---

# 3. User Roles

There are three user roles.

## Customer

Permissions

- Register
- Login
- Browse menu
- Search dishes
- Filter dishes
- Add to cart
- Remove from cart
- Place order
- View order history
- Track order
- Manage addresses
- Update profile

---

## Admin

Permissions

- Login
- Dashboard
- Manage Categories
- Manage Dishes
- Manage Orders
- Update Order Status
- Manage Customers
- Manage Offers
- View Reports
- Manage Delivery

---

## Delivery Partner (Future)

Permissions

- Login
- View assigned deliveries
- Update delivery status

---

# 4. Website Pages

## Public Pages

- Home
- About
- Menu
- Dish Details
- Gallery
- Contact

---

## Customer Pages

- Login
- Register
- Profile
- My Orders
- Cart
- Checkout
- Order Success
- Saved Addresses

---

## Admin Pages

- Login
- Dashboard
- Categories
- Dishes
- Orders
- Customers
- Delivery
- Offers
- Reports
- Settings

---

# 5. Home Page

Sections

- Navigation Bar
- Hero Banner
- Featured Dishes
- Categories
- Why Choose Us
- Customer Reviews
- Special Offers
- Footer

---

# 6. Menu Page

Features

- Search dishes
- Filter by category
- Filter Veg
- Filter Non Veg
- Filter by spice level
- Sort by

  - Price
  - Popularity
  - Rating

Dish Card should display

- Image
- Name
- Description
- Price
- Veg / Non Veg Badge
- Rating
- Preparation Time
- Add to Cart button

---

# 7. Dish Details

Show

- Large image
- Name
- Description
- Ingredients
- Calories
- Spice level
- Preparation time
- Price
- Quantity selector
- Add to Cart

---

# 8. Shopping Cart

Features

- Increase quantity
- Decrease quantity
- Remove item
- Apply coupon (future)
- Show subtotal
- Show taxes
- Show delivery charge
- Show grand total

---

# 9. Checkout

Customer should

- Select address
- Add new address
- Choose payment method
- Review order
- Confirm order

Payment Methods

- Cash on Delivery
- Online Payment (Future)

---

# 10. Orders

Order Status

- Pending
- Confirmed
- Preparing
- Ready
- Out For Delivery
- Delivered
- Cancelled

Customer should be able to

- View order details
- Track status
- View payment status

---

# 11. Admin Dashboard

Dashboard Cards

- Total Orders
- Today's Orders
- Revenue
- Customers
- Popular Dish

Dashboard Charts

- Daily Orders
- Weekly Revenue
- Category Sales

---

# 12. Category Management

Admin can

- Add category
- Edit category
- Delete category
- Upload category image

Examples

- Starters
- Biryani
- Veg Curry
- Non Veg Curry
- Rice
- Tiffins
- Chinese
- Desserts
- Beverages

---

# 13. Dish Management

Admin can

- Add dish
- Edit dish
- Delete dish
- Upload image
- Mark available
- Mark featured
- Update price

Dish fields

- Name
- Description
- Price
- Category
- Veg
- Available
- Featured
- Rating
- Spice Level
- Ingredients
- Calories
- Preparation Time

---

# 14. Customer Management

Admin can

- View customers
- Search customers
- View customer orders
- Disable account (future)

---

# 15. Delivery Management

Admin can

- View deliveries
- Update delivery status
- Assign delivery partner (future)

---

# 16. Offers

Admin can

- Add offer
- Edit offer
- Delete offer
- Activate
- Deactivate

---

# 17. Reports

Generate

- Daily Sales
- Weekly Sales
- Monthly Sales
- Top Selling Dishes
- Category Revenue
- Customer Orders

---

# 18. Notifications (Future)

Support

- Email
- SMS
- WhatsApp

Notifications

- Order placed
- Order confirmed
- Out for delivery
- Delivered

---

# 19. Authentication

Customer

- Email
- Password

Admin

- Email
- Password

Use Supabase Authentication.

---

# 20. Image Storage

Use Supabase Storage.

Store

- Dish Images
- Category Images
- Offer Images

---

# 21. UI Theme

Primary Color

Deep Red

Secondary

Orange

Accent

Golden Yellow

Background

Light Cream

Font

- Poppins
- Playfair Display

Design Style

- Clean
- Modern
- Minimal
- Mobile First

---

# 22. Responsive Design

Support

- Mobile
- Tablet
- Laptop
- Desktop

---

# 23. Performance Requirements

The application should

- Lazy load images
- Optimize assets
- Use reusable components
- Avoid unnecessary re-renders
- Keep Lighthouse score above 90

---

# 24. Coding Standards

Use

- TypeScript
- Functional Components
- React Hooks
- Async/Await
- Reusable Components

Avoid

- Duplicate code
- Inline styles
- Large components
- Deep prop drilling

---

# 25. Folder Structure

src/

components/

pages/

layouts/

hooks/

services/

contexts/

types/

utils/

assets/

data/

---

# 26. Future Features

- Razorpay Integration
- Live Order Tracking
- Loyalty Points
- Coupons
- GST Invoice
- QR Menu
- Kitchen Dashboard
- Inventory Management
- Multi Branch Support

---

# 27. Development Rules for Cursor

While generating code:

- Always use TypeScript.
- Keep components under 200 lines where possible.
- Create reusable components.
- Use Tailwind CSS only.
- Use Supabase for backend functionality.
- Handle loading and error states.
- Use environment variables for API keys.
- Write clean, production-ready code.
- Do not generate placeholder code unless explicitly requested.
- Follow a modular architecture and separate UI, business logic, and data access.

---

# 28. Initial Development Milestones

Milestone 1
- Project setup
- Routing
- Tailwind
- Layout
- Navbar
- Footer

Milestone 2
- Home Page
- About Page
- Contact Page

Milestone 3
- Menu Page
- Dish Details
- Search & Filters

Milestone 4
- Supabase Integration
- Authentication
- Database Schema

Milestone 5
- Cart
- Checkout
- Orders

Milestone 6
- Admin Dashboard
- Category CRUD
- Dish CRUD

Milestone 7
- Reports
- Offers
- Deployment
