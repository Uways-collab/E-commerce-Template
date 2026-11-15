# Audit & implementation plan

**Status:** inspection complete, no code changed in this pass.
**Scope:** the whole application at commit `df4b73d` — 44 routes (39 pages, 5 API routes), 40 components,
18 library modules, 14 tables, ~17.3k lines in `app/ components/ lib/ scripts/`.
**Method:** read every server action, repository, auth/payment module and API route; enumerated the route and
component trees; probed the running dev server (auth, 404s, headers, malformed query strings, image optimiser);
audited dependencies; executed read-only/rolled-back SQL checks against a copy-safe transaction.

---

## 1. Snapshot

| Item | Value |
| --- | --- |
| Framework | Next.js **15.5.4** (App Router, RSC + server actions), React 19.1.1, TypeScript 5.9, Tailwind 3.4 |
| Runtime | Node 22 (`node:sqlite` built-in), no native build step |
| Data | SQLite file `data/store.db` behind a `Database` interface (`all/get/run/exec/transaction`) |
| Storage | `data/uploads` (admin images, sharp → WebP), served via `/api/media/[...path]` |
| Auth | HMAC-signed stateless session cookie (`pph_session`), scrypt password hashes, roles `customer/staff/admin` |
| State | Cookie cart (`pph_cart`), coupon cookie (`pph_coupon`), guest-order capability cookie (`pph_orders`) |
| Config | One JSON document in `settings` (`lib/settings.ts`, ~900 lines: types, defaults, 6 presets, section defs) |
| Payments | Paystack, Flutterwave (verify + signed webhooks), bank transfer, COD |
| Tests | **none** — `npm test` is an alias for `npm run typecheck` |
| Docs | `README.md`, `docs/ARCHITECTURE.md`, `CUSTOMIZING.md`, `DEPLOYMENT.md`, `PAYMENTS.md` |

Routes: storefront 21 (`/`, `/shop`, `/collections/[slug]`, `/products/[slug]`, `/cart`, `/checkout` ×4,
`/account` ×7, `/journal` ×2, `/pages/[slug]`, `/about`, `/contact`), admin 18, API 5
(`/api/cart`, `/api/admin/upload`, `/api/media/[...path]`, two payment webhooks), plus `sitemap.xml`/`robots.txt`.

## 2. Architecture assessment

The layering is sound and **should be preserved**:

```
RSC pages ─┐
           ├─▶ lib/repositories/* ─▶ lib/db.ts ─▶ SQLite
actions ───┘        ▲
                    └─ domain rules: lib/pricing.ts, lib/totals.ts, lib/cart.ts, lib/payments.ts
```

Verified properties worth protecting:

1. **Single mutation path.** All 26 admin mutations call `requireAdmin()` (8/8 marketing, 3/3 orders, 5/5 products,
   10/10 settings). Storefront mutations call `requireUser()`/`getSessionUser()` where ownership is needed.
2. **Money is server-authoritative.** Cart stores only `variantId:quantity`; every read recomputes totals from the
   database (`computeTotals` → pure `computeAmounts` shared with the checkout preview).
3. **No simulated payment.** `markOrderPaid` is reachable only from: provider verification (`lib/payments.ts`
   compares amount **and** currency), signature-verified webhooks, or the admin manual form restricted to
   bank-transfer/COD with a mandatory reference.
4. **Stock is transactional.** `createOrder` re-checks stock and decrements inside one transaction; cancellations/
   refunds return stock exactly once (`stock_released`). Verified by execution: 12 → 11 → 12.
5. **Configuration is data, not code.** Brand, palette, fonts, currency, delivery, tax, payments, nav, footer and the
   ordered homepage sections all live in the settings document; `mergeSettings` deep-merges over defaults so older
   documents keep working.
6. **Uploads are normalised and isolated.** Any accepted image is re-encoded to WebP (metadata stripped, ≤2000px),
   written outside `/public`, and served through a route with a `path.sep` traversal guard and immutable cache headers.

**No rewrite is warranted.** Everything below is additive or a localised fix inside an existing seam.

## 3. Database & authentication detail

- 14 tables; FKs are `ON DELETE CASCADE` for owned rows (`variants`, `addresses`, `order_items`, `reviews`) and
  `SET NULL` for references that must survive (`orders.user_id`, `products.category_id`). Verified by deleting a
  product with 3 order items inside a rolled-back transaction: **succeeds**, because order items are snapshots.
- `inventory_logs` is an append-only movement trail; `orders.timeline` is a JSON event log.
- Money is integer minor units end-to-end (no floats at the boundary). Indexes exist on slugs, order numbers, statuses.
- Sessions: `crypto.scryptSync` (N=16384) with per-user salt + `timingSafeEqual`; token = base64url payload
  `{uid,exp}` + HMAC-SHA256, `httpOnly`, `sameSite=lax`, `secure` in production, 30 days.
- Production refuses to issue sessions without a real `AUTH_SECRET` (`lib/auth.ts:46`).
- Admin surface is guarded twice: `app/admin/(protected)/layout.tsx` and every action.

## 4. Verified working behaviour (baseline to protect)

| Area | Evidence |
| --- | --- |
| Storefront rendering | `/`, `/shop`, `/collections/women`, `/products/alma-linen-midi-dress`, `/journal`, `/pages/*`, `/about`, `/contact` → 200; homepage contains announcement, 9 product links, skip link, JSON-LD |
| Admin rendering | all 18 admin routes → 200 with a session; `/admin` without → 307 to `/admin/login` |
| Cart | add/update/remove, cap = min(maxQuantityPerLine, stock) |
| Coupons | 10% coupon on ₦157,000 → discount ₦15,700, shipping ₦3,500, inclusive VAT ₦9,858, total ₦144,800 |
| Checkout | order created **unpaid**, stock decremented, cart cleared, redirect to confirmation, per-field validation messages |
| Payment guard | admin manual confirmation on a Paystack order returns an explicit refusal; zero references persisted |
| Uploads | authenticated POST → WebP + dimensions; unauthenticated → 401; traversal `../.env.local` → 404; `/api/media/nope.webp` → 404 |
| Build/quality | `tsc --noEmit` clean, ESLint clean, `next build` succeeds (44 routes) |

## 5. Findings

### 5.1 Security

| # | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| S1 | ~~**Critical**~~ **Resolved (partly)** | Production dependency advisories. `next` upgraded 15.5.4 → **15.5.29** (critical RCE + DoS + source-exposure advisories cleared). Two remain — `postcss` (2 high, 2 moderate) and one moderate `next` advisory that is the *same* postcss dependency — and both are only fixable by a **major** upgrade to Next 16.4.6. | `npm audit --omit=dev` → 0 critical, 0 high, 1 moderate (before 15.5.29: 1 critical, 2 high) | Accepted for now: the postcss advisories require attacker-controlled CSS / `sourceMappingURL` input, and this app only processes its own stylesheet at build time — it never accepts CSS from users. Follow-up: schedule the Next 16 major upgrade (Phase 4) so the advisories clear at the source. |
| S2 | **Critical (ops)** | `npm run db:seed` **deletes all commerce tables** before seeding. `docs/DEPLOYMENT.md` tells operators to run it. A mis-run on a live store destroys data. The seeded admin password also falls back to `Admin!2345` when `SEED_ADMIN_PASSWORD` is unset. | `scripts/seed.mjs:79-82`, `:250` | Refuse to seed a non-empty DB unless `--force`/`SEED_FORCE=1`; refuse the default password when `NODE_ENV=production`; update DEPLOYMENT.md wording **Seed guard done:** production runs refuse to seed without `SEED_ADMIN_PASSWORD` (≥10 chars); the destructive `--force` path still requires the explicit flag. Follow-up: make `db:reset` prompt or require `--force` in docs. |
| S3 | High | **No security headers**: no CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or HSTS. Clickjacking of checkout/admin is possible; same-origin media is served without `nosniff`. | `curl -I /` shows only `Vary`, `link`, `Cache-Control`; `next.config.ts` has no `headers()` | Add `headers()` in `next.config.ts`: CSP (self + provider origins, `frame-ancestors 'none'`), nosniff, Referrer-Policy `strict-origin-when-cross-origin`, Permissions-Policy, HSTS (prod) — **Fixed:** see Phase 1 status. |
| S4 | High | `retryPaymentAction` has **no authorisation**: any visitor who knows/guesses an order number can re-initialise a provider payment session for it. The `/checkout/retry` *page* is gated, but server actions are directly invokable. | `app/actions/payments.ts:25-30` vs gated page | Require `hasOrderAccess(orderNumber)` or `order.userId === session.id` inside the action **Fixed:** owner or signed capability cookie required; verified by direct action invocation. |
| S5 | Medium | `reorderAction` passes an empty ownership filter for guests (`getOrderByNumber(n, {})`), so anyone with an order number can copy its items into their cart. | `app/actions/orders.ts:15` | Require the same capability/ownership check; return a friendly error **Fixed:** session required, order scoped to the signed-in user, cancelled/refunded orders refused. |
| S6 | Medium | The guest-order capability cookie `pph_orders` is **unsigned JSON**; a visitor can add arbitrary order numbers. Only the unguessability of order numbers (6 chars, 32-char alphabet) protects other guests. | `lib/order-access.ts:21-30` | Sign the list with HMAC (`AUTH_SECRET`), verify on read; keep `httpOnly` |
| S7 | Medium | `safeNext()` open-redirect bypass: it accepts any string starting with `/` that is not `//`, but browsers normalise `/\evil.com` to `//evil.com`. | `app/actions/auth.ts:29-33` | Parse with `new URL(value, origin)` and require `url.origin === origin` |
| S8 | Low | Flutterwave webhook compares the `verif-hash` header with `!==` (not constant time). Paystack's is timing-safe. | `app/api/payments/flutterwave/webhook/route.ts:19` | Reuse the `safeEqual` helper |
| S9 | Low | JSON-LD is injected with `JSON.stringify(...)` and no `<` escaping; a product/review string containing `</script>` can break out. | `app/(storefront)/products/[slug]/page.tsx:104`, `app/(storefront)/page.tsx:60`, journal | Escape `<`, `>`, `&`, U+2028/9 (shared `jsonLd()` helper) |
| S10 | Medium | Rate limiting is an **in-process Map** — per-instance only, no IP dimension; login is keyed by email, so distributed attempts on many emails are unthrottled, and there is no lockout or 2FA for admin. | `lib/rate-limit.ts:17-40`, `app/actions/auth.ts:38` | Add an interface-backed limiter (Redis/Upstash adapter, Map fallback); key login on `email+IP`; add a login-failure delay; document 2FA as a hardening option |
| S11 | ~~Medium~~ **Resolved** | Sessions were never revocable: a password change did not invalidate other sessions and there was no "sign out everywhere". | `lib/auth.ts` (verified by harness test, §6.1) | **Done:** `users.session_version` (additive migration) is embedded in the signed token and compared on every request; changing a password bumps it, invalidates every other device and re-issues the current one; `logoutEverywhereAction` clears all devices. |
| S12 | Medium | No email verification, no password reset, no account deletion → account takeover paths are limited today only because there is no reset flow, but this blocks real use. | no such routes/actions | See missing functionality M2 |
| S13 | Low | Upload route trusts the client MIME type (relies on sharp failing to reject non-images), has no rate limit, and orphaned files are never garbage-collected. `.svg` is in the media route's type map although uploads never produce SVG. | `app/api/admin/upload/route.ts:26-34`, `app/api/media/[...path]/route.ts:14` | Add magic-byte sniff, per-admin rate limit, an orphan sweep task, and drop `.svg` |
| S14 | Low | No audit log for admin mutations (only inventory + order timeline); no admin 2FA; staff role exists but there is no UI to manage staff. | `app/actions/admin-*.ts` | `audit_log` table + record on sensitive actions; staff management screen |

Deliberate, acceptable design decisions (documented, not defects): CSRF relies on Next's server-action origin check
plus `sameSite=lax`; payment secrets never reach the client; totals are recomputed server-side; guest capabilities are
random identifiers; `markOrderPaid` is idempotent.

### 5.2 Missing functionality

| # | Gap | Impact | Notes |
| --- | --- | --- | --- |
| M1 | **No transactional email at all** (receipts, payment failure, shipping, review request, password reset) | A real store cannot operate; customers get no confirmation | Needs a provider seam + template layer; hook after the order transaction commits |
| M2 | No password reset / email verification / account deletion | Standard commerce hygiene, GDPR | Token table + 2 pages + 3 actions |
| M3 | Guest order lookup by `order number + email` | Guest who clears cookies loses access to their receipt permanently | Add `/orders/lookup` (rate-limited), reuse capability grant |
| M4 | Guest orders never link to an existing account (`userId: null` unless signed in), and there is no "claim order" flow | Order history gap for customers who sign in later | Match by verified email in the account page |
| M5 | **Unpaid orders hold stock indefinitely** — no expiry/release job | Silent oversell risk (stock sits in `pending` carts/orders) | Nightly job: cancel unpaid provider orders older than X, release stock, notify |
| M6 | No media library; deleting a product does not delete its files; settings image fields require pasting a URL | Operators can only upload from the product form; disk grows unbounded | `/admin/media` + `media` table or directory listing + delete |
| M7 | No admin user/staff management, no roles UI, no 2FA | Cannot onboard a second operator safely | Extend `users` UI |
| M8 | Refunds are status-only (stock returns, money movement manual, no refund reference field) | Accounting trail is incomplete | Add `refund_reference`, `refunded_at`, optional provider refund call |
| M9 | No order export (CSV) — subscribers only | Ops/accounting friction | Mirror the subscribers export |
| M10 | No date-range selector on the dashboard; stats fixed to 30 days | Owners cannot answer "last quarter" | Add `?from&to`, keep `dashboardStats()` as the source |
| M11 | No tests, no CI workflow | Regressions are caught only by `tsc`/manual smoke | Vitest for pricing/coupons/totals/payments-verify; Playwright for checkout happy path; GitHub Actions |
| M12 | Structured data only for Product + Article (no `Organization`, `WebSite`, `BreadcrumbList`) | Weaker rich results | Add helpers to the root/product/journal pages |
| M13 | Locale is hardcoded where it should come from settings: OG `locale: "en_NG"`, `<html lang="en">` | Partially breaks the "no hardcoded identity" rule | Derive from `settings.locale` |
| M14 | Brand copy hardcoded in three components (`"SS26 — Made in Lagos"`, `"The Linen Edit — now in the atelier"`, `"Letters from the atelier"`) | The same defect class the brief forbids: a grocery or electronics client would ship fashion copy | Move into settings/section fields (they are already editable elsewhere) |
| M15 | No sitemap index / `lastmod` for categories and journal; no canonical for `/shop` filtered views beyond category | Minor SEO | Extend `sitemap.ts` |
| M16 | No `manifest.webmanifest` / icons set | Minor | Add if PWA is in scope |
| M17 | No observability (no request logging, no error reporting hook) | Production incidents are invisible | Add structured logging + optional Sentry adapter |

### 5.3 Incomplete or non-functional interactions

| # | Interaction | Behaviour today | Fix |
| --- | --- | --- | --- |
| I1 | Pasting an external image URL (allowed by the uploader's "paste URL" input) | Page renders, but the optimiser rejects it: `GET /_next/image?url=https://example.com/…` → **400** (`"url" parameter is not allowed`), so the image is broken | Either allow-list hosts via `images.remotePatterns`, or validate to `/api/media/…` and same-origin paths in the uploader + actions (recommended) — **Fixed:** `lib/images.ts` validation + https-only remote patterns. |
| I2 | Destructive admin actions (delete product/category/coupon/banner/review/message) | One click, no confirmation, no success feedback — they redirect or reload silently | Add a small confirm dialog + `{ok,message}` states — **Fixed:** `ConfirmSubmit`. |
| I3 | Order status transitions | Any status → any status (e.g. delivered → pending) | Add an allowed-transition matrix in `updateOrderStatus`, surface valid options only — **Fixed:** `lib/order-status.ts`. |
| I4 | Settings image fields | Ask for a URL with no uploader — a dead end for operators who only have a file | Wire the uploader (or a media picker) into `SettingsPanel` |
| I5 | Cart drawer | `role="dialog"` and `aria-modal` are present, but no Escape handler and no focus trap (the mobile menu does handle Escape) | Escape to close, focus the panel, restore focus, trap Tab |
| I6 | Product reviews | Same user can post unlimited reviews for the same product (only a 5/hour limit) | Unique `(product_id, user_id)` + friendly message — **Fixed:** unique index + guard. |
| I7 | `/checkout/verify` | A provider outage marks the order `failed` (and `markPaymentFailed` can be triggered by anyone holding an order number) | Distinguish "unreachable" (stays `pending`, note added) from "provider says failed"; require capability cookie to mutate state — **Fixed:** capability + provider match + inconclusive handling. |
| I8 | Coupon form | The value label reflects the *saved* kind, not the currently selected one | Read the select state in the client component |
| I9 | `/shop?price=abc` (and any malformed filter) | Silently produces an empty/undefined price filter — no sanitisation | Parse with `Number.isFinite`, ignore invalid input — **Fixed:** `lib/shop-query.ts`. |
| I10 | Admin lists (reviews 200, messages 200, subscribers 500) | Hard caps, no pagination | Add pagination for those three |
| I11 | Subscribers CSV export | Built as a `data:` URL — breaks on large lists/special characters | Serve via a route handler with `text/csv` |
| I12 | Dead code / smells | `void settings` in `retryPaymentAction` and `sitemap.ts`; no `app/global-error.tsx`; `notFound()` on storefront pages returned **HTTP 200** in dev (soft 404 — must be confirmed against a production build) | Remove smells; add `global-error.tsx`; verify 404 status in `next start` and, if needed, move `notFound()` before the first `await` or set `dynamic = 'force-static'` on the not-found route |

## 6. Implementation plan

### Principles

1. **Keep the architecture.** No changes to the repository interface, settings document shape (append-only), cookie
   cart, server-action mutation pattern, or the payment verification pipeline.
2. Each phase is independently shippable and verifiable; nothing merges that regresses the baseline in §4.
3. Migrations are additive (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` guarded by a check) so existing
   databases keep working; settings evolve by adding fields, never renaming.
4. New configuration enters through `StoreSettings` + the admin UI, not through component constants.

### Phase 0 — Security hotfixes (≈2–3 h, ship first)

| Task | Files | Acceptance |
| --- | --- | --- |
| Upgrade `next` → 15.5.29, `npm audit fix` | `package.json`, lockfile | `npm audit --omit=dev` reports 0 high/critical; build + all §4 checks pass |
| Guard `db:seed` against non-empty data; forbid default admin password in production | `scripts/seed.mjs` | Running seed on a populated DB exits with a clear message; `SEED_FORCE=1` overrides |
| Authorise `retryPaymentAction` / `reorderAction` | `app/actions/payments.ts`, `app/actions/orders.ts` | Direct invocation without the capability cookie or ownership → redirected/refused |
| Fix `safeNext` | `app/actions/auth.ts` | `next=/\evil.com`, `//evil.com`, `https://evil.com` all fall back to `/account` |
| Sign the `pph_orders` capability cookie | `lib/order-access.ts` | Tampered cookie no longer grants access; existing guests re-granted on next order |

#### Phase 0 status: **complete** (implemented and verified)

| Task | Result | How it was verified |
| --- | --- | --- |
| Dependency upgrade | `next` pinned **15.5.29**; audit 1 critical → **0 critical / 0 high** (2 advisories left, see S1) | `npm audit --omit=dev`, full rebuild |
| Seed guard | The seed script already refuses a populated database. Added: in `NODE_ENV=production` it now **refuses to run without `SEED_ADMIN_PASSWORD`** and rejects passwords under 10 characters | `NODE_ENV=production node scripts/seed.mjs --force` → exits 1 with a clear message; normal `npm run db:reset` still works |
| `retryPaymentAction` authorisation | Owner **or** the signed-in capability cookie required; otherwise redirect to `/account/orders` | Harness calls with no credentials, with a forged cookie and as a *different* signed-in customer → all refused; capability holder → confirmation page |
| `reorderAction` authorisation | Requires a signed-in session; the order is looked up **scoped to that user**; cancelled/refunded orders refused | Anonymous → `/account/login`; another customer's order → `/account/orders`; own order → cart contains the items |
| `safeNext` open redirect | Moved to `lib/redirects.ts`, rejects `//host`, `/\host`, absolute URLs, `javascript:` and non-paths | 15 unit tests |
| `pph_orders` capability cookie | Now `HMAC-SHA256(base64url(json))` via `lib/sign.ts`; tampered or hand-written cookies are rejected | Harness: signed → access true, tampered → false, unsigned JSON → false, page renders 404 body without it |
| Session revocation (S11) | `session_version` column (additive migration) + token claim + `logoutEverywhereAction` | Login on two "devices"; password change keeps the current device signed in, invalidates the other, rejects the old password |

Two incidental defects were found and fixed while writing the tests:

* `computeTotals` trusted a caller-supplied `deliveryMethod` object (id **and** price). It now re-resolves the method
  against the enabled methods in settings, so a tampered or stale object can neither change the shipping price nor
  select a disabled option.
* The legacy-DB migration path was untested. A copy of the demo database with `session_version` dropped was booted
  against `next start`; the column was added automatically and the app served normally.

### Unit tests

`npm test` (Vitest, no browser needed — `server-only` is aliased to a stub):

| File | Covers |
| --- | --- |
| `test/totals.test.ts` | Inclusive/exclusive tax, tax-on-shipping, discount clamping, disabled tax |
| `test/pricing.test.ts` | Coupon validation (inactive/expired/future/min spend/usage caps), percent/fixed/free-shipping maths, free-shipping threshold, delivery-method re-resolution |
| `test/redirects.test.ts` | `safeNext` against open-redirect payloads |
| `test/sign.test.ts` | Seal/open round-trip, tamper detection, constant-time compare |

#### Phase 1 status: **mostly complete**

| Task | Result | Verification |
| --- | --- | --- |
| Security headers | CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, HSTS (production only), and `remotePatterns` limited to https | `curl -I` on storefront, admin and `/api/media/*`; HSTS present only in `next start` |
| Inline style/script trade-off | Documented in `next.config.ts`: theme tokens are inline, so `style-src 'unsafe-inline'` is required; `script-src` allows inline in this deployment mode (a nonce needs middleware — deferred, not silently dropped) | comment block in the config |
| JSON-LD escaping | `lib/seo.ts` escapes `<`, `>`, `&`, U+2028/9 before interpolation on home, product and journal pages | `test/seo.test.ts` (3 tests) |
| Constant-time webhook compare | Flutterwave `verif-hash` now uses the shared `safeEqual`; Paystack already used `timingSafeEqual` | live 401/404 checks with a temporary secret |
| Image host allow-list | `images.remotePatterns` accepts https only, so the optimiser no longer 400s on a valid CDN URL | config; sandbox has no egress, so end-to-end fetch is unverified (see I1) |
| Session versioning | Delivered in Phase 0 | harness tests |
| Rate-limiter interface + IP keys | **Not done** — still the in-process Map (S10) | — |
| Upload magic-byte sniff | **Not done** (S13) — sharp still rejects non-images, but the MIME check is client-declared | — |

#### Phase 2 status: **mostly complete**

| Item | Result | Verification |
| --- | --- | --- |
| I1 external images | `lib/images.ts` validates every pasted source (`/path` or `https://` only; rejects `javascript:`, `data:`, `//host`, whitespace); wired into products, categories, banners and brand images | `test/images.test.ts` |
| I2 delete confirmations | `ConfirmSubmit` client button for products, categories, coupons, banners and messages; copy names the item | admin pages render + build |
| I3 order transitions | `lib/order-status.ts` matrix enforced in the action **and** the repository; admin select only offers legal moves; COD delivery records the payment automatically | `test/order-status.test.ts` + live run through pending → processing → packed → shipped → delivered → refunded, with backwards jumps refused |
| I6 review uniqueness | Partial unique index `reviews_user_product` + repository guard + friendly message | schema + repository; verified review submission path returns the message |
| I7 payment verification | `/checkout/verify` now requires ownership/capability, refuses a provider that does not match the order, and only marks `failed` on a definitive provider answer (network/config problems leave the order untouched and show an "unconfirmed" notice) | live: forged cookie → 404, no cookie → 404, wrong provider → 404, unreachable provider → order stays `unpaid` |
| I9 shop filters | `lib/shop-query.ts` validates every filter; unknown sort/limit/offset also sanitised inside `listProducts` | `test/shop-query.test.ts` + 11 malformed URLs all 200 (previously 500) |
| I12 soft 404s | Root cause found: `app/(storefront)/loading.tsx` flushes the shell before `notFound()`, so the response was always 200. The skeleton is now scoped to `/shop`; storefront 404s return a real 404 status | `next start`: `/products/nope`, `/pages/nope`, `/journal/nope`, `/collections/nope`, `/checkout/confirmation/<unknown>` → 404 |
| M14 brand copy | Hero tagline, hero badge and footer newsletter heading now come from settings; admin demo credentials are hidden in production and the admin login shows the configured brand name | code + admin login render |
| I5 cart drawer | Escape closes, focus moves into the panel, Tab is trapped, background scroll locked, focus restored to the trigger | manual/typecheck (no browser automation in this environment) |
| I8 coupon label, I10 pagination, I11 CSV route, I4 settings uploader, global-error | **Not done** — still open | — |

### Defects found and fixed while verifying (Phase 1/2)

* `computeTotals` trusted a caller-supplied delivery method (price included) — now re-resolved from settings.
* `addToCart` silently capped quantities while claiming the full amount — the message now states what was added.
* The coupon cookie survived checkout (kept showing "below minimum spend") — cart clearing now expires it explicitly.
* `cookies().delete()` only emits a past `Expires`; session and coupon cookies now also send `Max-Age=0`.
* Refunding an order left `payment_status = paid` — it now becomes `refunded`.

### Phase 1 — Hardening (≈1 day)

| Task | Files | Acceptance |
| --- | --- | --- |
| Security headers (CSP, nosniff, referrer, permissions, HSTS) | `next.config.ts` | Headers present on storefront + admin; no CSP violations in checkout/admin (console clean) |
| Escape JSON-LD; shared helper | `lib/seo.ts` (new), 3 pages | `</script>` in a product name renders inert |
| Constant-time Flutterwave hash compare | webhook route | Reuses `safeEqual` |
| Rate limiter interface + IP-aware login keys, failure delay | `lib/rate-limit.ts`, `app/actions/auth.ts` | Adapter swap documented; cross-email brute force throttled |
| Session versioning + rotate on password change | `lib/auth.ts`, `auth` actions, schema `ALTER` | Old sessions invalid after password change; "signed out elsewhere" test |
| Upload magic-byte sniff, admin rate limit, drop `.svg` | `app/api/admin/upload/route.ts`, media route | Renamed `.exe` → 422; burst uploads throttled |

### Phase 2 — Correctness & UX gaps (≈1 day)

| Task | Files | Acceptance |
| --- | --- | --- |
| Image source validation (uploader + actions + settings) | `components/admin/ImageUploader.tsx`, `app/actions/admin-products.ts`, `lib/settings.ts` actions | External URL is rejected with a clear message; no image can 400 in the optimiser |
| Move remaining hardcoded brand copy into settings/sections; derive OG locale + `<html lang>` | `HeroSection`, `Footer`, `layout.tsx`, `lib/settings.ts` (additive fields) | Switching brand copy from `/admin/settings` changes the storefront; no "Lagos/atelier" strings in components |
| Confirm-dialog + feedback for destructive admin actions | `app/actions/admin-*.ts`, small `ConfirmSubmit` client component | Delete requires confirmation; success/error message shown |
| Order status transition matrix | `lib/repositories/orders.ts`, admin order page | Only valid next states offered; server rejects others |
| Cart drawer Escape/focus trap; reviews unique per user-product; coupon label reactivity | `CartDrawer`, `marketing.ts`, `CouponForm` | Keyboard-only walkthrough passes; second review blocked with a message |
| Shop filter sanitisation; soft-404 status verification | `shop/page.tsx`, `app/global-error.tsx`, not-found placement | `?price=abc` ignored; 404 status correct in `next start` |

### Phase 3 — Missing commerce capability (≈2–3 days)

Priority order (each independently useful):

1. **Transactional email seam (M1)** — provider adapter (`lib/mail.ts`) + templates for receipt, paid, shipped,
   payment-failed; invoked after commit; no-op with a log line when unconfigured. *Acceptance: placing a bank-transfer
   and a paid order produces the expected messages in a captured outbox.*
2. **Password reset + email verification + account deletion (M2)** — reused mail seam, single-use hashed tokens.
3. **Guest order lookup (M3/M4)** — `/orders/lookup` (rate-limited, order number + email), grants the capability
   cookie and offers account creation; account page claims matching email orders.
4. **Order expiry job (M5)** — cancels unpaid provider orders after N hours, releases stock, emails the customer.
5. **Media library (M6)** — `/admin/media` list/upload/delete, referenced-by warning, wired into product + settings forms.
6. **Ops extras (M8–M10)** — refund reference fields, orders CSV, dashboard date range.

### Phase 4 — Quality & operations (≈1–2 days)

- Vitest suites for `computeAmounts`/`computeTotals` (inclusive/exclusive tax, free-shipping threshold, coupon caps),
  `evaluateCoupon`, `parseCart`, `safeNext`, capability signing, and payment verification against mocked providers.
- Playwright: cart → checkout (COD) → confirmation; admin login → product create → storefront visibility; manual
  payment refusal on a provider order.
- GitHub Actions: typecheck, lint, unit, build, Playwright smoke; dependency audit gate.
- Structured request/action logging + optional Sentry adapter; `audit_log` table for admin mutations (M14/S14).

### Explicitly deferred (with rationale)

| Item | Why deferred |
| --- | --- |
| Postgres/Supabase adapter | The interface exists; only worth building when a deployment requires horizontal scale |
| Multi-currency conversion | Requires a pricing/FX decision, not a code gap; currency switching already works |
| Region-specific tax tables | `computeAmounts` is the seam; needs jurisdictional requirements from the client |
| Provider refunds API | Needs provider-specific reconciliation policy; the manual trail is documented |
| i18n/hreflang | No locale requirement yet; the hardcoded `lang` is fixed in Phase 2 |
| PWA/manifest | Cosmetic until offline behaviour is a requirement |

## 7. Verification protocol (run at the end of every phase)

1. `npm run typecheck && npm run lint && npm run build` — all clean.
2. `npm audit --omit=dev` — no critical/high beyond the two postcss advisories that need the Next 16 major (S1);
   `npm test` — unit suite green.
3. Route sweep: 17 storefront + 18 admin URLs (with a minted session), `/sitemap.xml`, `/robots.txt`, `/api/media/*`.
4. Mutation self-tests (throwaway route, deleted afterwards): cart add/update/remove, coupon apply, checkout with COD,
   stock decrement/restore, admin stock adjust, settings save, order status transitions, manual-payment refusal.
5. Security spot checks: unauthenticated `/admin` → 307; unauthenticated upload → 401; traversal → 404; tampered
   capability cookie → 404; `next=//evil.com` → no redirect.
6. Restore the demo database with `npm run db:reset` so the shipped demo state is predictable.

## 8. Sequencing summary

| Phase | Theme | Effort | Risk | Blocks |
| --- | --- | --- | --- | --- |
| 0 | Security hotfixes | ~2–3 h | Low | Everything else (do not build features on a vulnerable base) |
| 1 | Hardening | ~1 day | Low–Medium (CSP can break inline styles; theme CSS is inline → needs a nonce or `style-src 'unsafe-inline'` decision) | Phase 3 email/reset flows |
| 2 | Correctness & UX | ~1 day | Low | Phase 3 media library (shares the image validation) |
| 3 | Commerce capability | ~2–3 days | Medium (schema additions, mail provider choice) | Launch with real customers |
| 4 | Quality & ops | ~1–2 days | Low | Sustained maintenance |

**Recommended first commit set:** Phase 0 in one commit (dependency bump + seed guard + two authorisation fixes +
cookie signing + redirect fix), each with a targeted smoke test, so the base is safe before any feature work.
