# The Taste of Andhra

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
| `VITE_PLATFORM_ROOT_DOMAIN` | Apex domain for tenant subdomains (default `directapp.in`). Example: slug `thetasteofandhra` → `https://thetasteofandhra.directapp.in` |
| `VITE_ENABLE_HOST_TENANT_RESOLUTION` | Set `true` in production so each subdomain / custom domain maps to its restaurant |

> Only variables prefixed with `VITE_` are included in the client bundle. Never commit real credentials — `.env.local` is gitignored.

Multi-tenant domains (`directapp.in` subdomains + custom domains): see [docs/DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md).  
**Production tenant setup** (menu shows locally but not after deploy): [docs/PRODUCTION_TENANT_SETUP.md](docs/PRODUCTION_TENANT_SETUP.md).  
Marketing site (`www.directapp.in`): editable copy in `src/constants/PLATFORM_SITE.ts`. Local preview: `VITE_FORCE_PLATFORM_SITE=true`.

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
10. `20250721200000_future_features.sql`
11. `20250721210000_google_oauth_profile_trigger.sql`

This creates tables, RLS policies, a profile trigger, the `restaurant-images` storage bucket, party inquiry support, and future features (branches, favorites, loyalty, notifications, GST invoices, QR tables, delivery GPS).

Optional: run `supabase/seed_menu.sql` to load sample categories and dishes with local images.

### 4. Email / password auth (testing)

Staff personas (admin, delivery, master) sign in with **email + password**. Customers can also use **WhatsApp OTP** or Google.

1. In Supabase Dashboard → **Authentication** → **Providers** → **Email**, enable Email.
2. Turn **off** “Confirm email” so new accounts can sign in immediately during testing.
3. Seed per-tenant demo users (password `Test@123` for all):

```bash
npm run seed:qa-testers
```

| Persona | Email | Password | Login URL |
| --- | --- | --- | --- |
| DirectApp Master | `master@tasteofandhra.test` | `Test@123` | `/master/login` on www.directapp.in |
| Taste of Andhra customer | `democustomer@tasteofandhra.test` | `Test@123` | `/login` |
| Taste of Andhra admin | `demoadmin@tasteofandhra.test` | `Test@123` | `/admin/login` |
| Taste of Andhra delivery | `demodelivery@tasteofandhra.test` | `Test@123` | `/delivery/login` |

Each restaurant has its own `demoadmin@`, `democustomer@`, and `demodelivery@` addresses. See `docs/LOGIN_CREDENTIALS.md` and `docs/TENANT_LOGIN_CREDENTIALS.xlsx`.

Credentials are also shown under each login form. Use **Create one** on any login screen to register an additional user for that persona.

Customers can **Continue with WhatsApp** (OTP to their +91 number) or **Continue with Google** on `/login` and `/register`. WhatsApp OTP needs the restaurant WhatsApp connection plus an approved Meta Authentication template named `login_otp` — see `docs/WHATSAPP_META_SETUP.md`. In mock WhatsApp mode the login screen shows the code.

#### Enable Google sign-in (customers)

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client type: Web).
2. Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. In Supabase → **Authentication** → **Providers** → **Google**, enable Google and paste Client ID + Client Secret.
4. Under **Authentication** → **URL Configuration**, add your app URLs to **Redirect URLs** (e.g. `http://localhost:5173/login` and your production `/login`).

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
| `npm run seed:demo-users` | Create demo customer / admin / delivery accounts |

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

- **Site URL:** `https://www.directapp.in` (not Taste of Andhra)
- **Redirect URLs** (add all that you use):
  - `https://*.directapp.in/**`
  - `https://www.directapp.in/**`
  - `https://www.thetasteofandhra.com/**`
  - `http://localhost:5173/**`
  - `https://*.vercel.app/**` (preview deployments)

Restaurant Google login stays on `{slug}.directapp.in`. If Site URL is `https://www.thetasteofandhra.com` and the restaurant origin is not in Redirect URLs, Google will fall back to Taste of Andhra.

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
- Email/password auth for customer, admin, and delivery (demo accounts for testing)
- WhatsApp OTP and Google sign-in for customers
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
