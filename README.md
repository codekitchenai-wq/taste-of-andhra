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

This creates tables, RLS policies, a profile trigger, and the `restaurant-images` storage bucket.

### 4. Create an admin user

1. Register a customer account through the app (`/register`).
2. In the Supabase SQL Editor, promote the user to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 5. Start the dev server

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

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/**` and your preview URLs (e.g. `https://*.vercel.app/**`)

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
supabase/
└── migrations/   # Database schema and policies
```

## Features

- Public menu with search and category filters
- Customer auth, cart, checkout (COD), and order tracking
- Admin dashboard: categories, dishes, orders, customers, offers, reports
- Image uploads to Supabase Storage
- Responsive layout with mobile navigation

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
