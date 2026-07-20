# Cursor Rules

## Project Overview

This project is **Taste of Andhra**, a production-ready restaurant ordering and management system.

Always refer to the following documents before generating code:

- PROJECT_REQUIREMENTS.md
- DATABASE_SCHEMA.md
- UI_GUIDELINES.md
- API_SPECIFICATION.md

These documents are the source of truth.

Never contradict them.

---

# Development Principles

Generate production-ready code.

Do NOT generate demo code.

Do NOT generate tutorial code.

Do NOT generate placeholder implementations unless explicitly requested.

Write clean, scalable, maintainable code.

Always think like a senior software engineer.

---

# Tech Stack

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

Backend

- Supabase

Database

- PostgreSQL

Authentication

- Supabase Auth

Storage

- Supabase Storage

Forms

- React Hook Form

Icons

- Lucide React

Notifications

- react-hot-toast

---

# General Rules

Always use

TypeScript

Never use

JavaScript

Always use

Functional Components

Never use

Class Components

Always use

React Hooks

Prefer composition over inheritance.

Never duplicate code.

Keep business logic separate from UI.

---

# Folder Structure

Use this structure.

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

constants/

data/

Every new file must belong to one of these folders.

---

# Components

Keep components small.

Target

Less than 200 lines.

If larger

Split into smaller components.

Components should do one thing well.

---

# Pages

Pages should only compose components.

Avoid heavy business logic.

Business logic belongs in services or hooks.

---

# Services

Never access Supabase directly inside components.

Always create service files.

Example

authService.ts

dishService.ts

orderService.ts

paymentService.ts

addressService.ts

Services handle

- Database queries
- Authentication
- Validation
- Business logic

---

# Hooks

Reusable logic belongs inside hooks.

Example

useCart()

useOrders()

useAuth()

useCategories()

---

# Types

Create proper interfaces.

Example

Dish

Category

Order

Payment

Customer

Avoid using

any

Prefer strict typing.

---

# Styling

Use

Tailwind CSS only.

Do NOT use

Inline CSS

Styled Components

CSS Modules

Emotion

Material UI

Bootstrap

Keep styling consistent.

---

# UI

Follow

UI_GUIDELINES.md

Exactly.

Use consistent spacing.

Use reusable UI components.

Avoid inconsistent layouts.

---

# Routing

Use React Router.

Lazy load pages where appropriate.

Protect authenticated routes.

Protect admin routes.

---

# Authentication

Use Supabase Authentication.

Never store passwords.

Always validate sessions.

Check user roles.

---

# Database

Follow

DATABASE_SCHEMA.md

Exactly.

Never invent tables.

Never invent columns.

Never change relationships unless instructed.

---

# API

Follow

API_SPECIFICATION.md

Business logic belongs inside services.

Never place database queries inside components.

---

# State Management

Use

React Context

Only when global state is needed.

Example

Auth

Cart

Theme

Avoid unnecessary Context.

Prefer local component state when possible.

---

# Forms

Use

React Hook Form

Validate

Required fields

Email

Phone

Price

Quantity

Display validation errors clearly.

---

# Error Handling

Every async function must

Use try/catch

Return meaningful errors

Display friendly messages

Never silently fail.

---

# Loading States

Every page that loads data must include

Loading UI

Empty State

Error State

Success State

Do not use plain text loading indicators.

Prefer skeleton loaders.

---

# Performance

Lazy load pages.

Memoize expensive calculations.

Avoid unnecessary re-renders.

Optimize images.

Use pagination where needed.

---

# Accessibility

Use semantic HTML.

Every image needs alt text.

Every button needs an accessible label.

Keyboard navigation must work.

Maintain proper contrast.

---

# Naming Conventions

Components

PascalCase

Example

DishCard.tsx

Pages

PascalCase

Example

CheckoutPage.tsx

Hooks

camelCase

Example

useCart.ts

Services

camelCase

Example

dishService.ts

Types

PascalCase

Example

Order.ts

Constants

UPPER_CASE

Example

ORDER_STATUS.ts

---

# File Creation Rules

Before creating a file

Check if similar functionality already exists.

Reuse existing code whenever possible.

Do not duplicate components.

---

# Comments

Write comments only when needed.

Avoid obvious comments.

Document complex logic.

---

# Git

Assume Git is used.

Keep commits focused.

Do not mix unrelated changes.

---

# Security

Validate all input.

Use Row Level Security.

Never expose secrets.

Never hardcode API keys.

Use environment variables.

---

# Admin Features

Protect every admin page.

Validate admin role.

Do not expose admin operations to customers.

---

# Customer Features

Customers can access only

Their profile

Their orders

Their addresses

Their cart

Never expose other users' data.

---

# Coding Standards

Prefer

const

Avoid

var

Prefer

async/await

Avoid

.then()

Keep functions focused.

Maximum

50 lines

where practical.

---

# Development Workflow

When implementing a feature

1.

Read the requirement documents.

↓

2.

Plan implementation.

↓

3.

Create Types.

↓

4.

Create Service.

↓

5.

Create Hook if needed.

↓

6.

Create UI Components.

↓

7.

Create Page.

↓

8.

Test.

↓

9.

Optimize.

Never skip steps.

---

# Response Rules

When asked to implement a feature

Always explain

- Files created
- Files modified
- Why each change was made

Do not modify unrelated files.

---

# Final Rule

Prioritize

Maintainability

Readability

Reusability

Scalability

over writing the shortest amount of code.

Think like a senior software engineer building a production application that will be maintained for years.
