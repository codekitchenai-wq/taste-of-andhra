# DRAFT — Environments, code access, and feature promotion

**Status:** DRAFT — discuss and finalise. Do not implement from this document until Status is `Agreed`.  
**Product:** Taste of Andhra / DirectApp multi-tenant restaurant SaaS  
**Opened:** 2026-08-18  
**Target discussion:** 2026-08-20 (two-day checkpoint), then daily until closed  
**Related:** [ARCHITECTURE_GATES.md](./ARCHITECTURE_GATES.md), [SAAS_MULTI_TENANT_ARCHITECTURE.md](./SAAS_MULTI_TENANT_ARCHITECTURE.md), [PRODUCTION_TENANT_SETUP.md](./PRODUCTION_TENANT_SETUP.md)

---

## Why this exists

We need contractors and extra developers to add features **without** giving everyone production access or unconstrained write access to the core app. The intended flow:

1. A developer works in a **development** environment that looks like production (cloned *shape*, not live PII).
2. They build and test against **their own tenant**.
3. Only **selected features** move into **Testing**, which is a copy of production used for QA.
4. After Testing sign-off, those features go to **Production**.
5. **Sandbox** is a periodic copy of production for demos / play — not a coding environment.

This draft is the proposed control model. Open questions are in [§9](#9-open-questions-for-discussion).

---

## 1. Principle (do not skip)

You cannot hide the entire Vite SPA from people who compile and ship UI in that SPA. The maintainable control is:

- Lock **core** (tenancy, auth, payments, RLS, secrets).
- Give contributors a **narrow place to work** (feature modules + their own tenant).
- Promote **capabilities** with **feature flags / entitlements**, not by copying source files between environment clones.

Cherry-picking “only the new files” into a testing clone will not stay maintainable.

---

## 2. Separate three layers people mix up

| Layer | What it is | What it is not |
|---|---|---|
| **Code** | Git branches + Vercel deploys | Not a restaurant tenant |
| **Data** | Supabase project / cloned database | Not “the feature” |
| **Tenant** | One `organization` on `{slug}.…` for a developer to build against | Not a copy of the repo |

Today we already have two Supabase projects:

| Role today | Project | Typical access |
|---|---|---|
| Local / staging | `zsfjpapatepmnbtxvvaw` (`taste-of-andhra-staging`) | `.env.local` |
| Production | `qixpsqlifwsztncjevgl` (`taste-of-andhra`) | Vercel `VITE_SUPABASE_*` |

This draft proposes treating those as **roles**, then adding Testing and Sandbox as explicit roles (new projects or scheduled refreshes — see §9).

---

## 3. Proposed environment topology

Keep **one codebase**, **three runtimes**, **one sandbox data refresh**.

```text
Production  ── periodic anonymized clone ──►  Sandbox
     │                                         (same *stable* code as production)
     │
     └── on-demand anonymized clone ──►  Testing (UAT)
                                           selected flags ON

Developer feature branch ──► Development
     own tenant + preview URL
     flags ON only for that work
```

| Environment | Code | Database | Purpose |
|---|---|---|---|
| **Development** | Feature branches / Vercel Preview | Staging or a dedicated `dev` Supabase project | Contractor builds against **their own tenant** (prod *shape*, not live PII) |
| **Testing (UAT)** | `release/*` or `main` candidates only | Anonymized copy of production | QA proves **the selected flags** against prod-like data |
| **Production** | `main` only | Live | Real restaurants |
| **Sandbox** | Same build as production (or last known-good) | Periodic anonymized production clone | Demos, partner trials, “play restaurant” — **not** where developers write features |

**Rule:** Sandbox is a data product (“looks like production, refreshed on a schedule”). If people develop there, demo data, WIP code, and a prod clone will mix and you will not know what is real.

---

## 4. How “only selected features” move

Do not ship a second copy of the app per contractor. Ship **one app**, dark by default, then turn capabilities on per environment and per org.

We already have three gate layers ([ARCHITECTURE_GATES.md](./ARCHITECTURE_GATES.md)):

1. **Platform flag** — env / Master kill switch (`VITE_ENABLE_*`)
2. **Org entitlement** — `features` + `organization_entitlements`
3. **Connection config** — credentials healthy (`connected`)

Proposed promotion path:

```text
1. Implement behind a new feature_key (default OFF everywhere)
2. Enable it only on the developer’s tenant
3. Merge PR to the testing branch → enable the flag in Testing only
4. QA signs off
5. Merge to main → deploy to Production with the flag still OFF
6. Master enables it for one restaurant, then more
```

Testing and production should run the **same commit** when a release is ready. What differs is **which flags are on** and **which data** they see.

---

## 5. Code access model

GitHub cannot hide half a SPA from someone who can build it. Restrict **what can hurt production**, not every `.tsx` file.

### Core team (write + merge to `main`)

- Tenant isolation, RLS, auth, payments, webhooks, env, migrations
- Protected paths (proposed `CODEOWNERS`):
  - `src/contexts/OrganizationContext.tsx`, `src/utils/tenantHost.ts`, `src/utils/tenantFeatures.ts`
  - `src/services/paymentService.ts`, `supabase/functions/**`, `supabase/migrations/**`
  - Vercel Production env, Supabase service role

### Contributors (restricted)

- No production Supabase, no service role, no Vercel Production
- No push to `main` / `release/*`
- Feature branches only; PRs require core review on protected paths
- Later (only if needed): `src/features/<name>` or `packages/features/*` so they extend modules instead of editing checkout/payment

### Vendors who must not see core (later, optional)

True split: private `packages/core` npm package + public SDK types. Do **not** start here for in-house developers. CODEOWNERS + no production secrets is enough first.

---

## 6. Developer workspace = a tenant, not a production dump

Each developer (or each feature) gets an **organization** in Development, e.g. `dev-priya-loyalty`, on a host such as `dev-priya-loyalty.dev.directapp.in` (or `?tenant=` locally).

They:

- Get catalog **shape** (categories / dishes / settings templates), not live customer phones and UPI
- Pay with **test Razorpay / mock WhatsApp**
- Never point `.env` at production `qixpsqlifwsztncjevgl`
- Never use Taste of Andhra or Spice Malabar **production** orgs, URLs, or UPI as defaults

This reuses existing isolation: menus, orders, and settings are already per `organization_id`.

---

## 7. Data cloning rules (safety)

A raw `pg_dump` of production into Development is a leak, not an environment.

Every clone **must**:

- Strip or hash phones, emails, addresses, payment ids, UPI VPAs
- Rotate all secrets (Razorpay, WhatsApp tokens, Google OAuth)
- Disable real outbound WhatsApp / Pidge / live charge capture
- Re-map `organization_id`s so sandbox tenants cannot be confused with live ones
- Not copy customer documents from Storage unless redacted

| Target | Refresh cadence (proposed) |
|---|---|
| **Sandbox** | Weekly (or on demand) anonymized production → sandbox, then re-apply sandbox-only users |
| **Testing** | Before a release, not continuously — QA needs a stable snapshot |
| **Development** | Synthetic seed (`seed-*.mjs`) plus a small anonymized “golden” subset. Full prod clones per developer do not scale |

---

## 8. Controls to implement (proposed order)

### 8.1 Identity and secrets

- GitHub teams: `core`, `contributors`, `qa`
- Vercel: Production deploy from `main` only; Preview uses staging keys
- Supabase: contributors get **anon** on staging only; service role stays in CI / core
- No production URLs in contributor `.env.example`

### 8.2 Branch protection

- `main` and `release/*`: required reviews + `CODEOWNERS` on payments, RLS, tenant host, migrations
- Status checks: unit tests, lint, tenant-isolation tests (`tenantFeatures`, `TENANTS`) blocking

### 8.3 Vercel environments (proposed)

| Vercel env | Git | `VITE_SUPABASE_*` | Host tenancy |
|---|---|---|---|
| Production | `main` | prod project | `VITE_ENABLE_HOST_TENANT_RESOLUTION=true` |
| Preview (dev) | feature branches | staging / dev project | true, `*.dev.directapp.in` or preview URLs |
| Testing | `release/*` | testing project (anonymized prod) | true, dedicated testing host |

### 8.4 Feature registry (Master)

- Every new module gets a `feature_key`, default `false`
- Testing: Master turns on only the features in that release
- Production: same commit, flags off until enabled per restaurant

### 8.5 Definition of done for a feature

- Works on the developer’s tenant
- Flag off does not change existing checkout/menu for other orgs
- Passed Testing against the anonymized production snapshot
- Runbook: which entitlement to flip in production, for which org

---

## 9. Open questions for discussion

Mark each **Agreed / Rejected / Deferred** in [§11](#11-decision-log).

1. **How many Supabase projects?** Keep two (staging + prod) and refresh staging as Testing? Or add a third (Testing) and a fourth (Sandbox)?
2. **Who is “core” vs “contributor”?** Names / GitHub teams.
3. **Do contractors get GitHub read on the whole private repo, or only after we split `src/features/`?**
4. **Testing branch name:** `release/*` vs long-lived `testing` vs promote Preview of `main`.
5. **Sandbox cadence:** weekly vs on-demand vs never (use Testing for demos).
6. **Anonymization owner:** who runs the clone job; is a GitHub Action acceptable?
7. **Dev host:** `*.dev.directapp.in` vs Vercel Preview URLs only vs `?tenant=` locally.
8. **Plugin SDK:** needed this year, or CODEOWNERS-only for now?
9. **Reminder / automation:** keep daily Cursor reminder until this doc is `Agreed`, then stop.

---

## 10. What we will not do (unless we explicitly reverse it)

- Give every developer production repo secrets and the production database
- Let people develop inside the Sandbox clone
- Clone production **including PII** onto laptops
- Maintain four long-lived forks of the SPA (dev app / test app / sandbox app / prod app)
- Use Taste of Andhra URLs, UPI, or login helpers as the default for a contractor’s tenant

---

## 11. Decision log

| Date | Question | Decision | Who |
|---|---|---|---|
| | | | |

---

## 12. Suggested first implementation slice (after Agreed)

1. Written environment matrix (Git branch × Supabase project × Vercel env × flags) — fill the table in §8.3 with real project refs.
2. GitHub `CODEOWNERS` + branch protection on tenant/payment/migration paths.
3. One “dev restaurant” org seed path on staging, documented, no production keys.

Do not start a plugin-SDK split until question 8 is Agreed as “yes, this year.”
