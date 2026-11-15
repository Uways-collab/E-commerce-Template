# Customising the template for a new client

Everything below is data or configuration — no component surgery required for a normal rebrand.

## 1. Rebrand in the admin (≈15 minutes)

Sign in at `/admin/login` and work through **Store Settings**:

| Tab | Set |
| --- | --- |
| Brand | Business name, legal name, tagline, description, logo URL, favicon, OG image |
| Theme | Palette tokens (canvas, surface, ink, muted, line, accent, accent-ink), display/body typeface, radius, card ratio |
| Locale | Currency, country code, timezone, weight unit |
| Contact | Email, phone, WhatsApp, address, city, hours, map URL |
| Social | Instagram, X, Facebook, TikTok, Pinterest, YouTube |
| Announcement | Toggle and rotate 1–5 messages + link |
| Navigation | Primary and utility menus (`Label\|/href` per line) |
| Footer | Blurb, legal line, up to four link columns |
| Commerce | Guest checkout, reviews, newsletter, stock display, thresholds, delivery methods (label, price, ETA, enabled) |
| Payments | Enabled providers, bank-transfer details, COD note |
| Tax | Label, rate, inclusive/exclusive, whether delivery is taxed |
| SEO | Title template, default title/description, keywords, X handle |

Then open **Appearance studio** (`/admin/configurator`) to pick a starting palette, change typefaces, and reorder or
rewrite the homepage sections (add/duplicate, hide, move, edit copy, swap imagery).

**Saving any tab revalidates the layout**, so the storefront changes immediately — no rebuild, no redeploy.

## 2. Vertical presets

| Preset | Intent | Accent | Type | Radius |
| --- | --- | --- | --- | --- |
| `atelier` | Fashion & lifestyle | terracotta | Instrument Serif / Inter | sharp |
| `circuit` | Electronics & tech | blue | DM Sans / Inter | soft |
| `hearth` | Furniture & decor | olive | Fraunces / DM Sans | soft |
| `botanica` | Beauty & skincare | clay | Fraunces / Inter | round |
| `market` | Grocery & food | green | DM Sans / Inter | soft |
| `vault` | Jewellery (dark) | gold | Instrument Serif / DM Sans | sharp |

A preset only replaces tokens; individual colours and fonts remain editable afterwards. Square product cards suit
electronics and homeware; tall cards suit fashion.

## 3. Replace the demo catalogue

```bash
npm run db:reset        # wipe and re-seed
```

* Edit `scripts/seed-data.mjs` to change the demo catalogue, or
* delete products in `/admin/products` and add real ones from the UI — name, slug, category, description, bullets,
  price/compare-at, badge, flags, images (drag-order), variants (colour × size × stock × SKU), composition, care, tags,
  SEO title/description, status.

Uploaded images are normalised by sharp (≤2000px, WebP ≤ 12 MB source) and served from `/api/media/...`, so they
survive deployments as long as `data/uploads` is persisted.

## 4. Editorial content

`lib/content.ts` holds the legal/help pages (`delivery-and-returns`, `size-guide`, `faq`, `privacy`, `terms`,
`sustainability`, `stockists`) and the journal posts. They are typed objects — edit copy, add a page to
`CONTENT_PAGES` (or a post to `JOURNAL`) and the routes, sitemap and navigation pick it up automatically.

## 5. Closing deals: removing demo traces

Before a launch:

1. `/admin/settings` → Brand: replace name, description, contact, socials, favicon.
2. `/admin/configurator`: pick the client's palette; delete or rewrite every homepage section.
3. `/admin/banners`: remove the demo campaign strips.
4. `/admin/coupons`, `/admin/reviews`, `/admin/messages`, `/admin/subscribers`: clear demo rows.
5. `npm run db:reset` after editing `scripts/seed-data.mjs` if you prefer to start from a clean catalogue.
6. Update `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, and provider keys (see `DEPLOYMENT.md`).

## 6. Adding a homepage section type

1. Add an interface to `lib/settings.ts` and extend the `HomeSection` union.
2. Add its `SECTION_DEFS` entry (label, description and fields). The admin editor and section composer are generated
   from this — no new form component.
3. Render it in `components/home/HomeSections.tsx` (`switch` on `section.type`).
4. If it needs data, fetch it in `app/(storefront)/page.tsx` and pass it down.

`addSectionAction` clones the matching default section from `DEFAULT_SETTINGS`, so new types come with sensible copy.

## 7. Adding a settings tab

1. Add the shape to `StoreSettings` (and to `DEFAULT_SETTINGS` so merges stay valid).
2. Add a `case` to `saveSettingsAction` writing only that slice.
3. Add the tab to `TABS` in `app/admin/(protected)/settings/page.tsx` and describe its fields in `fieldsByTab`.

Because `mergeSettings` deep-merges stored documents over defaults, older databases keep working after you add fields.

## 8. Adding a vertical beyond configuration

If a client needs genuinely different commerce rules (subscriptions, bookings, per-market pricing), keep the layer
boundaries: rules go in `lib/*`, SQL in `lib/repositories/*`, forms in `components/*`, mutations in
`app/actions/*`. The storefront never imports the database directly.
