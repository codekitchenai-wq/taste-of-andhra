# Taste of Andhra

Online restaurant platform for browsing the menu, placing orders, and managing the business through an admin dashboard. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **Deployment:** Vercel (static SPA)

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [npm](https://www.npmjs.com/) 10 or later
- A [Supabase](https://supabase.com/) project

## Local setup

### 1. Clone and install

```bash
git clone <repository-url>
cd taste-of-andhra
npm install
```

### 2. Environment variables

Copy the example file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (Dashboard → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_RAZORPAY_KEY_ID` | Optional — Razorpay key for live online payments (demo mode without it) |

> Only variables prefixed with `VITE_` are included in the client bundle. Never commit real credentials — `.env.local` is gitignored.

### 3. Supabase database

Run the SQL migrations in order from `supabase/migrations/` using the Supabase SQL Editor or the Supabase CLI:

1. `20250720180000_create_enums.sql`
2. `20250720180001_create_functions.sql`
3. `20250720180002_create_tables.sql`
4. `20250720180003_create_indexes.sql`
5. `20250720180004_enable_rls_policies.sql`
6. `20250720180005_create_profile_trigger.sql`
7. `20250720180006_storage_bucket.sql`
8. `20250721140000_party_inquiries.sql`
9. `20250721160000_phone_auth_profile_trigger.sql`

This creates tables, RLS policies, a profile trigger, the `restaurant-images` storage bucket, party inquiry support, and phone OTP profile handling.

Optional: run `supabase/seed_menu.sql` to load sample categories and dishes with local images.

### 4. Enable phone OTP auth (customers)

Customer sign-up and login use **mobile number + SMS OTP** (not email/password).

1. In Supabase Dashboard → **Authentication** → **Providers** → **Phone**, enable phone sign-in.
2. Configure an SMS provider (Twilio, MessageBird, Vonage, etc.) with your credentials.
3. For local testing, Supabase supports [test phone numbers and OTPs](https://supabase.com/docs/guides/auth/phone-login) in development.

Indian numbers are sent as `+91` followed by the 10-digit mobile entered in the app.

### 5. Create an admin user

Admins still sign in with **email + password** at `/admin/login`.

1. In Supabase Dashboard → **Authentication** → **Users** → **Add user**, create a user with email and password.
2. In the SQL Editor, promote that user to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |

## Production build

```bash
npm run build
```

The optimized static assets are output to `dist/`. Preview locally before deploying:

```bash
npm run preview
```

## Deploy to Vercel

This project includes a [`vercel.json`](vercel.json) configured for a Vite SPA with client-side routing.

### Option A: Git integration (recommended)

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the project in [Vercel](https://vercel.com/new).
3. Vercel auto-detects Vite. Confirm these settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Add environment variables under **Project Settings → Environment Variables**:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

   Apply to **Production**, **Preview**, and **Development** environments.

5. Deploy. Vercel rebuilds on every push to the connected branch.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts, then set environment variables in the Vercel dashboard or via CLI:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Deploy to production:

```bash
vercel --prod
```

### Supabase auth for production

After deploying, update Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app` (or `http://localhost:5173` while testing locally)
- **Redirect URLs** (add all that you use):
  - `http://localhost:5173/**`
  - `https://your-app.vercel.app/**`
  - `https://*.vercel.app/**` (preview deployments)

Email confirmation links use these settings. If Site URL is left as the default `http://localhost:3000`, verify links will break.

## Project structure

```
src/
├── components/   # UI, layout, feature components
├── constants/    # App config, routes, enums
├── contexts/     # React context providers (auth, cart)
├── hooks/        # Custom React hooks
├── layouts/      # Page layouts (main, admin, auth)
├── pages/        # Route-level page components
├── routes/       # React Router configuration
├── services/     # Supabase API layer
├── types/        # TypeScript types
└── utils/        # Shared helpers
docs/
└── TASTE_OF_ANDHRA_FLOW.pdf   # High-level system flow diagram (see also .html)
supabase/
└── migrations/   # Database schema and policies
```

### System flow documentation

A high-level flow diagram with detailed explanations is available in:

- **PDF:** [`docs/TASTE_OF_ANDHRA_FLOW.pdf`](docs/TASTE_OF_ANDHRA_FLOW.pdf)
- **HTML source:** [`docs/TASTE_OF_ANDHRA_FLOW.html`](docs/TASTE_OF_ANDHRA_FLOW.html)

Regenerate the PDF after editing the HTML:

```bash
npm run docs:pdf
```

### Testing

**Manual QA:** See [`docs/TEST_CASES.md`](docs/TEST_CASES.md) for full test cases (auth, checkout, admin, security).

**Excel test workbook (for testers):** [`docs/TASTE_OF_ANDHRA_TEST_CASES.xlsx`](docs/TASTE_OF_ANDHRA_TEST_CASES.xlsx) — includes result columns and a defect log. Regenerate:

```bash
npm run docs:test-excel
```

**Automated unit tests** (order totals, phone utils, validation):

```bash
npm test
```

## Features

### Customer
- Public menu with search, category/diet/spice filters, and dish detail pages
- Customer auth via mobile OTP (SMS)
- Coupon codes at checkout
- Saved addresses, order history, order tracking, and cancellation
- Dish reviews and ratings
- Profile management (name, phone)
- Party order enquiry form
- About, Gallery, and Contact pages

### Admin
- Dashboard with stats, recent orders, and quick links
- Categories and dishes CRUD with image uploads
- Orders management with status updates
- Customer search with activate/deactivate
- Delivery partner assignment and tracking
- Offers and coupon management
- Party inquiry management
- Sales reports and analytics
- Settings (restaurant info, pricing rules, integration status)

## Troubleshooting

**Blank page or Supabase errors after deploy**

- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel and redeploy.
- Environment variables are baked in at build time — changing them requires a new deployment.

**404 on direct URL access (e.g. `/menu`)**

- Ensure `vercel.json` is committed with the SPA rewrite rule to `/index.html`.

**Admin panel access denied**

- Verify the user's `profiles.role` is set to `admin` in Supabase.

**Image uploads fail**

- Confirm the `restaurant-images` storage bucket migration ran and the user has the admin role.

## License

Private — all rights reserved.
