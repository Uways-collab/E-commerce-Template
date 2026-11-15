-- ---------------------------------------------------------------------------
-- Product Pro Hub — core schema (SQLite dialect)
-- All money values are integers in minor units (kobo / cents).
-- ---------------------------------------------------------------------------

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Key/value configuration store. The "store" key holds the full StoreSettings
-- JSON document that drives branding, theme, navigation and commerce rules.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at  TEXT
);

CREATE TABLE IF NOT EXISTS addresses (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Home',
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  line1        TEXT NOT NULL,
  line2        TEXT,
  city         TEXT NOT NULL,
  state        TEXT,
  postal_code  TEXT,
  country      TEXT NOT NULL,
  is_default   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  image       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  subtitle         TEXT,
  description      TEXT NOT NULL DEFAULT '',
  details          TEXT NOT NULL DEFAULT '[]',      -- JSON string[]
  price_cents      INTEGER NOT NULL,
  compare_at_cents INTEGER,
  category_id      TEXT REFERENCES categories(id) ON DELETE SET NULL,
  collection       TEXT,                             -- e.g. "The Linen Edit"
  material         TEXT,
  care             TEXT,
  images           TEXT NOT NULL DEFAULT '[]',      -- JSON string[]
  tags             TEXT NOT NULL DEFAULT '[]',      -- JSON string[]
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  is_featured      INTEGER NOT NULL DEFAULT 0,
  is_new           INTEGER NOT NULL DEFAULT 0,
  badge            TEXT,
  seo_title        TEXT,
  seo_description  TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE TABLE IF NOT EXISTS variants (
  id               TEXT PRIMARY KEY,
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              TEXT NOT NULL UNIQUE,
  size             TEXT,
  color_name       TEXT,
  color_hex        TEXT,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  stock            INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

CREATE TABLE IF NOT EXISTS coupons (
  id                 TEXT PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE,
  description        TEXT,
  kind               TEXT NOT NULL CHECK (kind IN ('percent', 'fixed', 'free_shipping')),
  value              INTEGER NOT NULL DEFAULT 0,      -- percent (0-100) or minor units
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  max_uses           INTEGER,                          -- NULL = unlimited
  used_count         INTEGER NOT NULL DEFAULT 0,
  starts_at          TEXT,
  expires_at         TEXT,
  is_active          INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  order_number     TEXT NOT NULL UNIQUE,
  user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  shipping_address TEXT NOT NULL,                     -- JSON Address
  delivery_method  TEXT NOT NULL,
  delivery_label   TEXT NOT NULL,
  subtotal_cents   INTEGER NOT NULL,
  discount_cents   INTEGER NOT NULL DEFAULT 0,
  shipping_cents   INTEGER NOT NULL DEFAULT 0,
  tax_cents        INTEGER NOT NULL DEFAULT 0,
  total_cents      INTEGER NOT NULL,
  currency         TEXT NOT NULL,
  coupon_code      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','packed','shipped','delivered','cancelled','refunded')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  payment_method   TEXT NOT NULL,
  payment_reference TEXT,
  payment_note     TEXT,
  notes            TEXT,
  tracking_number  TEXT,
  tracking_carrier TEXT,
  timeline         TEXT NOT NULL DEFAULT '[]',        -- JSON OrderEvent[]
  stock_released   INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       TEXT,
  variant_id       TEXT,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  size             TEXT,
  color            TEXT,
  image            TEXT,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  author       TEXT NOT NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 1,
  is_verified  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS banners (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  eyebrow    TEXT,
  subtitle   TEXT,
  image      TEXT,
  href       TEXT,
  cta_label  TEXT,
  placement  TEXT NOT NULL DEFAULT 'promo' CHECK (placement IN ('promo','hero','story','announcement')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email      TEXT PRIMARY KEY,
  source     TEXT NOT NULL DEFAULT 'footer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id         TEXT PRIMARY KEY,
  variant_id TEXT,
  product_id TEXT,
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  order_id   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_logs(product_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
