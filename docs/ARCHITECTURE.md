# Architecture

## Principles

1. **Configuration over code.** Store identity, merchandising and policy live in one JSON document
   (`lib/settings.ts` → `settings` table). Components read it; they never hardcode a brand, currency or copy line.
2. **One mutation path.** Every write goes through a server action in `app/actions/*` (or an API route for
   webhooks/uploads). Client components never touch the database, and they always re-read state from the server.
3. **Server is the source of truth for money.** Carts store only variant ids and quantities; prices, discounts,
   delivery and tax are recomputed server-side on every read and again when an order is created.
4. **Clear separation.** Storefront (`app/(storefront)`), admin (`app/admin`), backend (`lib/*`, `app/api/*`) and
   actions (`app/actions/*`) are distinct trees with their own layouts and guards.

## Layers

```
Browser
  ├─ React Server Components  ──▶ lib/repositories/*  ──▶ lib/db.ts ──▶ SQLite
  └─ Server actions (app/actions/*) ──▶ repositories + rules ──▶ revalidatePath
Provider servers ──▶ /api/payments/*/webhook ──▶ verification ──▶ records.markOrderPaid
```

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | `app/(storefront)`, `app/admin`, `components/*` | Rendering, accessibility, interaction |
| Actions | `app/actions/*` | Validation (zod), authorisation, orchestration, revalidation |
| Domain | `lib/pricing.ts`, `lib/totals.ts`, `lib/cart.ts`, `lib/payments.ts`, `lib/order-access.ts` | Business rules |
| Persistence | `lib/repositories/*`, `lib/db.ts`, `lib/db/schema.sql` | Typed SQL access |

`lib/db.ts` exposes a small `Database` interface (`all`, `get`, `run`, `exec`, `transaction`). The default
implementation is SQLite through `node:sqlite`, so there is no native build step. Swapping to Postgres/Supabase means
implementing that interface with `pg` (or Supabase's client) and keeping the repositories.

## Data model (`lib/db/schema.sql`)

| Table | Purpose |
| --- | --- |
| `users` | Customers, staff and admins. scrypt password hashes, role column |
| `addresses` | Saved addresses, one default per user |
| `categories` | Storefront taxonomy with imagery and ordering |
| `products` | Catalogue: pricing, media JSON, copy, status, flags, SEO columns |
| `variants` | SKU-level stock with size, colour, swatch and price delta |
| `inventory_logs` | Append-only stock movement trail (reason: sale, manual, restock…) |
| `orders` | Order header: customer snapshot, address JSON, totals, payment + fulfilment state, timeline JSON |
| `order_items` | Immutable line snapshot (name, variant, price at purchase) |
| `products.reviews` → `reviews` | Ratings, moderation state, verified-purchase flag |
| `coupons` | Percent / fixed / free-shipping codes with windows and caps |
| `banners` | Promo, hero, story and announcement campaign blocks |
| `newsletter_subscribers` | Mailing list with source attribution |
| `contact_messages` | Enquiries from the contact form |
| `settings` | Key/value JSON — the store configuration document |

Money is stored as **integer minor units** (kobo/cents) everywhere. Formatting is a presentation concern
(`formatMoney`), so currency changes never rewrite stored prices.

## Request flows

### Cart

1. `components/...` calls a cart server action (`addToCartAction`, `setQuantityAction`, …).
2. `lib/cart.ts` writes only `variantId:quantity` into the `pph_cart` cookie.
3. On read, `getCart()` joins variants → products, checks stock, applies the coupon cookie through
   `evaluateCoupon`, and computes totals with `computeTotals` (which delegates to the pure `computeAmounts`).
4. `GET /api/cart` returns a formatted snapshot that the drawer, mini-cart and cart page refresh from.

### Checkout

1. `placeOrderAction` re-validates customer details with zod, re-reads the cart server-side, recomputes totals,
   re-checks stock and coupon validity, then calls `createOrder` inside a transaction (stock decrement + inventory log).
2. Payment method decides the next step:
   * `bank_transfer` / `cod` → order stays unpaid; redirect to the confirmation page with transfer instructions.
   * `paystack` / `flutterwave` → `initializePayment` returns a provider URL (server-side secret, reference stored on
     the order) and the browser is redirected there.
3. A capability cookie (`pph_orders`) is set so the guest can view that confirmation; the cart is cleared.
4. `/checkout/verify` (provider return) and `/api/payments/*/webhook` both call the same verification code, which
   compares amount **and** currency before `markOrderPaid`.

### Admin

`app/admin/(protected)/layout.tsx` calls `requireAdmin()`; every admin action calls it again. `adminContext()`
(`lib/admin.ts`) also loads settings and computes nav badges (pending orders, new messages, low stock) so the shell
never renders stale counts from a client fetch.

## Auth

* Passwords: `crypto.scryptSync` with a 16-byte salt and per-user parameters; verification is constant-time.
* Sessions: base64url JSON payload (`uid`, `exp`) signed with HMAC-SHA256 and stored in an httpOnly, sameSite=lax,
  secure-in-production cookie.
* Roles: `customer`, `staff`, `admin`. `requireAdmin()` sends anyone without an admin/staff session to `/admin/login`;
  `requireUser()` sends guests to `/account/login?next=…` so they return to where they were.
* Rate limiting (`lib/rate-limit.ts`) protects login, register, review, newsletter and contact submissions.

## Rendering & performance

* Server components by default; client components only where interaction demands it (cart, filters, forms, editor).
* `next/image` with AVIF/WebP, generated blur-free sizes and lazy loading below the fold.
* Fonts self-hosted through `@fontsource`, wired into CSS variables by `lib/theme.ts`; no runtime CDN request.
* `Reveal` uses IntersectionObserver for entrance animations and respects `prefers-reduced-motion`.
* All storefront pages are dynamic (they depend on cookies/settings); the sitemap and journal pages are the only
  generated/static surfaces.

## Error handling

* `app/error.tsx` (client boundary) offers retry; `app/(storefront)/not-found.tsx` and `app/not-found.tsx` cover 404s.
* Server actions return discriminated results (`{ ok, message }` / `{ error }`) that forms render inline — no silent
  failures, no `alert()`.
* Stock conflicts throw `StockError` and are surfaced at checkout with the affected piece named.
* Payment failures are recorded (`markPaymentFailed`) and the customer is offered `/checkout/retry`.
