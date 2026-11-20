# Product Pro Hub — configurable commerce template

A production-oriented e-commerce storefront and admin suite built to be **re-skinned per client without touching
component code**. The repository ships as a fully populated fashion & lifestyle demo (catalogue, orders, customers,
reviews, coupons, content) so every screen is exercised by real database rows — not mock data.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3.4 · SQLite via Node's built-in
  `node:sqlite` · zod · sharp · self-hosted fonts (`@fontsource`)
- **No external services required to run**: no image CDN, no font CDN, no payment provider needed for development.
- **Everything configurable from `/admin`**: brand identity, palette, typography, currency, delivery, tax, payments,
  navigation, footer, homepage composition and copy.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # set AUTH_SECRET (openssl rand -hex 32)
npm run db:seed                 # creates data/store.db with the demo store
npm run dev                     # http://localhost:3000
```

Demo accounts (created by the seed):

| Role     | Email                      | Password        |
| -------- | -------------------------- | --------------- |
| Admin    | `admin@productprohub.com`  | `Admin!2345`    |
| Customer | `ada@example.com`          | `Shopper!2345`  |

Admin lives at **`/admin`** (redirects to `/admin/login`). Customer area: **`/account`**.

Useful scripts:

| Script              | What it does                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| `npm run dev`       | Dev server on `0.0.0.0:3000`                                             |
| `npm run build`     | Production build                                                         |
| `npm start`         | Production server on `0.0.0.0:3000`                                      |
| `npm run typecheck` | `tsc --noEmit`                                                           |
| `npm run lint`      | ESLint (Next core-web-vitals + TS rules)                                 |
| `npm run db:seed`   | Seed the database (idempotent bootstrap of the schema first)            |
| `npm run db:reset`  | Delete the database file and re-seed                                     |

---

## What is included

### Storefront

| Route                    | Contents                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `/`                      | Announcement bar, hero, marquee, category strip, best sellers, editorial promo, new arrivals, brand story, testimonials, newsletter — **all composed from database settings** |
| `/shop`                  | Grid with search, category, price, availability, sale filters, sorting, pagination, promo banners        |
| `/collections/[slug]`    | Category landing page with editorial header                                                              |
| `/products/[slug]`       | Gallery, pricing & discount, size/colour variants, live stock, quantity, add to bag, buy now, delivery note, accordions, reviews + write-a-review, related pieces, Product JSON-LD |
| `/cart`                  | Line editing, quantity controls, coupon codes, delivery method, running totals, free-shipping progress  |
| `/checkout`              | Customer details, address, delivery method, payment method, order summary, server-validated placement    |
| `/checkout/confirmation/[orderNumber]` | Receipt, next steps, bank-transfer instructions, tracking — access-gated           |
| `/checkout/verify`       | Provider return URL; verifies the transaction server-side before marking anything paid                   |
| `/checkout/retry`        | Retry a failed provider payment for an existing order                                                    |
| `/account/*`             | Register, login, profile, password, addresses, order history, order detail with tracking                  |
| `/journal`, `/journal/[slug]` | Editorial index and article template with Article JSON-LD                                          |
| `/pages/[slug]`          | Delivery & returns, size guide, FAQ, privacy, terms, sustainability, stockists                           |
| `/about`, `/contact`     | Brand story, studio details, contact form persisted to the database                                       |
| `/sitemap.xml`, `/robots.txt` | Generated from the live catalogue and content                                                       |

### Admin (`/admin`)

| Route             | Contents                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `/admin`          | Revenue (30d) with period comparison, orders, AOV, customers, 14-day revenue chart, payment mix, recent orders, top pieces, restock alerts |
| `/admin/orders`   | Filter by status, search, pagination; detail view with fulfilment status, timeline, tracking, and **guarded** manual payment confirmation |
| `/admin/products` | Catalogue list, create/edit with variant matrix (colour × size × stock × SKU) and image uploads       |
| `/admin/categories` | Create, edit, reorder-creating, hide/delete categories                                             |
| `/admin/inventory` | Per-variant stock editing with an append-only inventory log, low/out-of-stock views                  |
| `/admin/customers` | Accounts with lifetime value, order history, saved addresses                                        |
| `/admin/reviews`  | Publish, hide or delete customer reviews                                                            |
| `/admin/messages` | Contact enquiries with status workflow and email reply links                                        |
| `/admin/subscribers` | Mailing list with CSV export                                                                     |
| `/admin/coupons`  | Percent / fixed / free-shipping codes, windows, minimums, usage caps                                |
| `/admin/banners`  | Campaign strips for the shop and announcement rotation                                              |
| `/admin/settings` | 12 tabs of store configuration (see below)                                                          |
| `/admin/configurator` | Palette presets for six verticals, typography, homepage section composer, resets               |

### Store configuration (`/admin/settings`)

One validated JSON document (`settings` table, key `store`) drives the whole storefront:

`brand` · `theme` (colours, fonts, radius, card ratio) · `locale` (currency, country, timezone, weight unit) ·
`contact` · `social` · `announcement` · `navigation` · `footer` · `commerce` (guest checkout, reviews, stock display,
free-shipping threshold, delivery methods with price/ETA, max quantity) · `payments` (enabled methods, bank details,
COD note) · `tax` (rate, inclusive/exclusive, applies to delivery) · `seo` (title template, description, keywords) ·
`homepage` (ordered, editable sections).

Nothing about "a fashion brand" is compiled in: the same build becomes an electronics, furniture, beauty, grocery,
jewellery or general-retail store by editing configuration (see `docs/CUSTOMIZING.md`).

---

## Payments — no simulated success

`lib/payments.ts` implements five methods: **Paystack**, **Flutterwave**, **bank transfer**, **cash on delivery**,
and (in `availablePaymentMethods()`) it silently hides a provider when its keys are absent.

* Orders are created **unpaid**. Nothing in the codebase can mark an order paid except:
  1. server-to-server verification of a Paystack/Flutterwave transaction (amount **and** currency compared), or
  2. a signature-verified webhook (`/api/payments/*/webhook`), or
  3. an administrator recording a real bank-transfer/COD reference in `/admin/orders/[id]`.
* Card orders can never be confirmed manually — the admin UI refuses and explains why.
* Secrets are read with `server-only` modules; only public keys ever reach the browser.

See `docs/PAYMENTS.md` for the exact flow and what to configure.

---

## Repository layout

```
app/
  layout.tsx                 root layout: theme tokens, fonts, metadata
  (storefront)/              all public routes (own layout with header/footer/cart drawer)
  admin/(protected)/         dashboard — guarded by lib/auth.ts requireAdmin()
  admin/login/               staff sign-in
  actions/                   server actions: the only mutation path
  api/cart/                  cart JSON for the client drawer
  api/admin/upload/          authenticated image upload (sharp → WebP)
  api/media/[...path]/       serves uploaded media from the data volume
  api/payments/*/webhook/    provider webhooks
components/
  site/ home/ shop/ product/ cart/ checkout/ account/ auth/   storefront UI
  admin/                     admin UI (shell, nav, forms, charts, editors)
  ui/                        Reveal, Stars and other primitives
lib/
  db.ts, db/schema.sql       data access layer + schema
  repositories/              catalog, orders, marketing, stats
  settings.ts                the configuration engine (types, defaults, presets, section defs)
  pricing.ts, totals.ts      money maths shared by server and checkout preview
  cart.ts                    cookie-backed cart with server-side pricing
  auth.ts, rate-limit.ts     sessions, scrypt passwords, throttling
  payments.ts, order-access.ts
  content.ts                 editorial pages and journal copy
scripts/                     seed data + seed runner
data/                        SQLite database + uploaded media (git-ignored, except .gitkeep)
docs/                        architecture, customization, deployment, payments
```

---

## Deliberately not included

These are integration points, not hidden gaps — each has a clear seam:

| Not included | Where it plugs in |
| --- | --- |
| Transactional email (order receipts, review requests) | `createOrder` / `markOrderPaid` in `lib/repositories/orders.ts` — call your provider (Resend, Postmark, SES) after the transaction commits; keep it out of the DB transaction |
| Password reset by email | `lib/auth.ts` session helpers + a token table; the UI slot exists on the login screen flow |
| Real-time carrier tracking | `setTracking` stores carrier + number; the account order page renders whatever status the admin records |
| Multi-currency conversion | Prices are stored per-store in minor units; switching currency is a configuration change, converting historical prices is a business decision |
| Region-specific tax rules | `commerce.tax` is a single rate; replace `computeAmounts` in `lib/totals.ts` for jurisdiction tables |
| Refund processing with a provider | Status `refunded` records the decision and returns stock; the money movement is performed in the provider dashboard |

Everything else in the brief — catalogue, cart, coupons, delivery charges, checkout, payments with verified confirmation,
accounts, admin CRUD, inventory, customers, settings and the homepage composer — is wired to the database.

## Documentation

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, data model, auth, request flows
* [`docs/CUSTOMIZING.md`](docs/CUSTOMIZING.md) — turn this demo into another client's store, add a section or a new vertical
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — build, persistent disk, custom domain, backups, upgrading to Postgres
* [`docs/PAYMENTS.md`](docs/PAYMENTS.md) — provider setup, webhooks, bank transfer/COD policy

## Security notes

* Session cookies are HMAC-signed (`AUTH_SECRET`); passwords use scrypt with per-user salts.
* In production the app **refuses to start issuing sessions** without a real `AUTH_SECRET`.
* Every admin server action calls `requireAdmin()`; admin routes are additionally guarded in the layout.
* All input is validated (zod for actions, explicit parsing for settings) and all SQL is parameterised.
* Uploads are type/size checked, re-encoded with sharp, stored outside `/public`, and served through a route with a
  path-traversal guard.
* Checkout totals are recomputed on the server from the database — client prices are never trusted.
* Guest order confirmation pages are capability-protected (`pph_orders` cookie) so order numbers cannot be guessed.
