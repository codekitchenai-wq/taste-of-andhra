# UI_GUIDELINES.md

# Taste of Andhra - UI & Design Guidelines

Version: 1.0

---

# Design Philosophy

The website should reflect the warmth, richness, and authenticity of Andhra cuisine.

Design principles:

- Modern
- Elegant
- Minimal
- Mobile First
- Fast
- Accessible
- Clean
- Easy to navigate

The UI should feel premium but welcoming.

---

# Design Inspiration

Use inspiration from:

- Swiggy
- Zomato
- Starbucks
- Behance modern restaurant websites

Do NOT copy their designs.

Create an original UI inspired by modern food ordering platforms.

---

# Theme

Primary Theme

Traditional Andhra with modern minimalism.

Avoid clutter.

Use generous whitespace.

---

# Color Palette

## Primary

Deep Red

HEX

#C62828

Used for

- Primary Buttons
- Active Navigation
- Prices
- Highlights

---

## Secondary

Orange

HEX

#EF6C00

Used for

- Hover Effects
- Icons
- Offers

---

## Accent

Golden Yellow

HEX

#FFC107

Used for

- Ratings
- Badges
- Featured Items

---

## Background

Cream White

HEX

#FFF8F0

Main application background.

---

## Surface

White

HEX

#FFFFFF

Cards

Forms

Modals

---

## Text Primary

HEX

#212121

---

## Text Secondary

HEX

#616161

---

## Success

HEX

#2E7D32

---

## Warning

HEX

#F9A825

---

## Error

HEX

#D32F2F

---

# Typography

Headings

Font

Playfair Display

Weights

600

700

---

Body

Font

Poppins

Weights

400

500

600

---

Never mix multiple body fonts.

---

# Layout

Maximum Width

1280px

Centered Layout

Container Padding

Desktop

32px

Tablet

24px

Mobile

16px

---

# Border Radius

Cards

16px

Buttons

12px

Input Fields

10px

Images

16px

---

# Shadows

Use soft shadows only.

Avoid heavy shadows.

Cards

shadow-md

Hover

shadow-lg

---

# Buttons

Primary Button

Background

Deep Red

White Text

Rounded

Hover

Slightly darker

Transition

200ms

---

Secondary Button

White Background

Red Border

Red Text

---

Danger Button

Red Background

White Text

---

Success Button

Green Background

White Text

---

# Icons

Use

Lucide React

Icon Size

18

20

24

Do not mix icon libraries.

---

# Navigation Bar

Height

72px

Desktop

Sticky

Transparent on Hero

Solid after scroll

Mobile

Hamburger Menu

Include

Logo

Menu

Cart

Profile

---

# Footer

Include

Restaurant Info

Quick Links

Opening Hours

Contact

Social Media

Copyright

---

# Hero Section

Large background image

Restaurant headline

Short description

Buttons

View Menu

Order Now

Overlay

Dark gradient

---

# Section Spacing

Desktop

80px

Tablet

64px

Mobile

48px

---

# Cards

Card Padding

20px

Rounded Corners

16px

Shadow

Soft

Hover

Lift animation

---

# Dish Card

Show

Image

Dish Name

Price

Veg/Non-Veg Badge

Rating

Preparation Time

Short Description

Add to Cart Button

Favorite Icon (future)

---

# Images

Use

Rounded corners

Object Cover

Consistent aspect ratio

Prefer

16:9

or

4:3

---

# Forms

Labels above fields.

Spacing

16px

Input Height

48px

Buttons Full Width on Mobile.

---

# Inputs

Rounded

Border Gray

Focus

Primary Red

Show validation errors below input.

---

# Tables

Admin only.

Features

Search

Pagination

Sorting

Responsive

---

# Badges

Veg

Green

Non Veg

Red

Featured

Golden

Unavailable

Gray

---

# Ratings

Use

Star Icon

Golden Yellow

Rating

One decimal

Example

4.8

---

# Chips

Used for

Categories

Filters

Offers

Rounded

Small

Hover Effect

---

# Search Bar

Rounded

Large

Search Icon

Clear Button

Sticky on mobile menu page

---

# Filters

Category

Veg / Non Veg

Price

Popularity

Rating

Spice Level

Filters should collapse on mobile.

---

# Modals

Rounded

Centered

Dark overlay

ESC to close

Click outside closes

---

# Toast Notifications

Top Right

Auto Close

Use

react-hot-toast

Examples

Added to Cart

Order Placed

Saved Successfully

---

# Loading States

Skeleton Loaders

Not spinners

For

Cards

Tables

Forms

Images

---

# Empty States

Illustration

Message

Primary Action Button

Example

"No orders yet"

---

# Error States

Friendly messages.

Retry button.

---

# Animations

Use

Framer Motion

Animation Duration

200ms–300ms

Use only

Fade

Slide

Scale

Avoid excessive animations.

---

# Responsive Breakpoints

Mobile

0–640px

Tablet

641–1024px

Desktop

1025px+

---

# Accessibility

Use semantic HTML.

Every image needs alt text.

Keyboard navigation must work.

Buttons must have visible focus states.

Maintain color contrast.

---

# Performance

Lazy load images.

Use responsive images.

Memoize expensive components.

Avoid unnecessary re-renders.

---

# Dashboard Layout

Sidebar

Desktop only

Collapsible

Top Navbar

Search

Notifications

Profile

Dashboard Cards

Grid

Responsive

Charts

Responsive

---

# Customer Experience

Customer should be able to:

Browse Menu

↓

View Dish

↓

Add to Cart

↓

Checkout

↓

Track Order

↓

View History

Everything should require as few clicks as possible.

---

# Admin Experience

Dashboard

↓

Orders

↓

Categories

↓

Dishes

↓

Customers

↓

Reports

↓

Settings

Navigation should remain consistent.

---

# Naming Conventions

Components

PascalCase

Examples

DishCard.tsx

Navbar.tsx

CheckoutForm.tsx

Hooks

camelCase

Example

useCart.ts

Types

Example

Dish.ts

Order.ts

Services

Example

dishService.ts

authService.ts

---

# Tailwind Guidelines

Use utility classes.

Avoid inline CSS.

Create reusable components.

Do not repeat class names excessively.

Extract reusable UI patterns.

---

# Cursor Instructions

When generating UI:

- Follow this document strictly.
- Maintain visual consistency across all pages.
- Use reusable components instead of duplicating UI.
- Keep components under 200 lines where practical.
- Prefer composition over deeply nested components.
- Design mobile-first and enhance for larger screens.
- Use TypeScript throughout.
- Use Tailwind CSS only.
- Use Lucide React for icons.
- Use React Hook Form for forms.
- Use React Router for navigation.
- Implement loading, empty, and error states for every data-driven page.
- Ensure all pages are responsive and accessible.
- Avoid placeholder styles or inconsistent spacing.
