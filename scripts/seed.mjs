#!/usr/bin/env node
/**
 * Database bootstrap + demo seed.
 *
 *   npm run db:seed     — seeds only if the database is empty
 *   npm run db:reset    — deletes the SQLite file and reseeds from scratch
 *
 * Running it against an already-populated database is a no-op unless you pass
 * --force, which clears catalogue + demo transactional data first.
 */
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addresses,
  banners,
  categories,
  coupons,
  customers,
  newsletter,
  products,
  reviews,
} from "./seed-data.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.resolve(root, process.env.DATABASE_PATH ?? "data/store.db");
const force = process.argv.includes("--force");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(fs.readFileSync(path.join(root, "lib/db/schema.sql"), "utf8"));

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

const scrypt = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

/** Deterministic PRNG so repeated seeds look identical. */
let seedState = 20260214;
const random = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));

const isoAgo = (days, hours = 0) => {
  const date = new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
  return date.toISOString().replace("T", " ").slice(0, 19);
};

const orderNumber = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(random() * alphabet.length)];
  return `PPH-${out}`;
};

const existing = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (existing > 0 && !force) {
  console.log(`Database already contains ${existing} products — nothing to do.`);
  console.log("Use `npm run db:reset` for a clean reseed.");
  process.exit(0);
}

if (force) {
  db.exec(`
    DELETE FROM order_items; DELETE FROM orders; DELETE FROM inventory_logs;
    DELETE FROM variants; DELETE FROM products; DELETE FROM categories;
    DELETE FROM reviews; DELETE FROM coupons; DELETE FROM banners;
    DELETE FROM addresses; DELETE FROM users; DELETE FROM newsletter_subscribers;
  `);
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

const categoryIds = new Map();
for (const category of categories) {
  const id = newId("cat");
  categoryIds.set(category.slug, id);
  db.prepare(
    `INSERT INTO categories (id, slug, name, description, image, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  ).run(id, category.slug, category.name, category.description, category.image, category.sortOrder);
}

/* -------------------------------------------------------------------------- */
/* Products + variants                                                        */
/* -------------------------------------------------------------------------- */

const catalog = new Map();

for (const product of products) {
  const id = newId("prd");
  const createdAt = isoAgo(between(4, 90), between(0, 20));
  db.prepare(
    `INSERT INTO products (id, slug, name, subtitle, description, details, price_cents, compare_at_cents,
       category_id, collection, material, care, images, tags, status, is_featured, is_new, badge,
       seo_title, seo_description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    product.slug,
    product.name,
    product.subtitle,
    product.description,
    JSON.stringify(product.details),
    product.price,
    product.compareAt ?? null,
    categoryIds.get(product.category),
    product.collection,
    product.material,
    product.care,
    JSON.stringify(product.images),
    JSON.stringify(product.tags),
    product.isFeatured,
    product.isNew,
    product.badge,
    `${product.name} — ${product.subtitle}`,
    product.description.slice(0, 180),
    createdAt,
    createdAt,
  );

  const variants = [];
  let sortOrder = 0;
  for (const color of product.colors) {
    for (const size of product.sizes) {
      const low = (product.lowStock ?? []).includes(size);
      const base = product.stockPerVariant ?? 6;
      const stock = low ? between(1, 3) : Math.max(0, base + between(-3, 4));
      const variantId = newId("var");
      const sku = `${product.slug.toUpperCase().replace(/-/g, "").slice(0, 8)}-${color.name.slice(0, 3).toUpperCase()}-${size}`
        .replace(/\s+/g, "")
        .slice(0, 40);
      db.prepare(
        `INSERT INTO variants (id, product_id, sku, size, color_name, color_hex, price_delta_cents, stock, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, ?)`,
      ).run(variantId, id, sku, size, color.name, color.hex, stock, sortOrder);
      db.prepare(
        `INSERT INTO inventory_logs (id, variant_id, product_id, delta, reason)
         VALUES (?, ?, ?, ?, 'initial_stock')`,
      ).run(newId("inv"), variantId, id, stock);
      variants.push({
        id: variantId,
        size,
        color: color.name,
        colorHex: color.hex,
        stock,
        sku,
        image: product.images[0],
      });
      sortOrder += 1;
    }
  }

  catalog.set(product.slug, {
    ...product,
    id,
    variants,
  });
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

for (const review of reviews) {
  const product = catalog.get(review.product);
  if (!product) continue;
  db.prepare(
    `INSERT INTO reviews (id, product_id, author, rating, title, body, is_published, is_verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    newId("rev"),
    product.id,
    review.author,
    review.rating,
    review.title,
    review.body,
    review.verified ?? 1,
    isoAgo(review.daysAgo, between(0, 12)),
  );
}

/* -------------------------------------------------------------------------- */
/* Coupons + banners + newsletter                                             */
/* -------------------------------------------------------------------------- */

for (const coupon of coupons) {
  db.prepare(
    `INSERT INTO coupons (id, code, description, kind, value, min_subtotal_cents, max_uses, used_count,
       starts_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    newId("cpn"),
    coupon.code,
    coupon.description,
    coupon.kind,
    coupon.value,
    coupon.minSubtotal,
    coupon.maxUses,
    coupon.usedCount,
    isoAgo(120),
    isoAgo(-coupon.daysFromNow),
  );
}

for (const banner of banners) {
  db.prepare(
    `INSERT INTO banners (id, title, eyebrow, subtitle, image, href, cta_label, placement, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    newId("bnr"),
    banner.title,
    banner.eyebrow,
    banner.subtitle,
    banner.image,
    banner.href,
    banner.ctaLabel,
    banner.placement,
    banner.sortOrder,
  );
}

for (const email of newsletter) {
  db.prepare(
    "INSERT OR IGNORE INTO newsletter_subscribers (email, source, created_at) VALUES (?, 'seed', ?)",
  ).run(email, isoAgo(between(1, 80)));
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@productprohub.com").toLowerCase();
const defaultAdminPassword = "Admin!2345";
const providedAdminPassword = String(process.env.SEED_ADMIN_PASSWORD ?? "").trim();
const adminPassword = providedAdminPassword || defaultAdminPassword;

// Never ship a known administrator password into a production database.
if (process.env.NODE_ENV === "production") {
  if (!providedAdminPassword) {
    console.error(
      "Refusing to seed: set SEED_ADMIN_PASSWORD (and ideally SEED_ADMIN_EMAIL) before seeding in production.",
    );
    process.exit(1);
  }
  if (providedAdminPassword.length < 10) {
    console.error("Refusing to seed: SEED_ADMIN_PASSWORD must be at least 10 characters in production.");
    process.exit(1);
  }
}
db.prepare(
  `INSERT INTO users (id, email, password_hash, name, phone, role, marketing_opt_in, created_at)
   VALUES (?, ?, ?, ?, ?, 'admin', 0, ?)`,
).run(newId("usr"), adminEmail, scrypt(adminPassword), "Product Pro Hub Admin", "+234 901 234 5678", isoAgo(180));

const customerRecords = [];
for (const customer of customers) {
  const id = newId("usr");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, phone, role, marketing_opt_in, created_at)
     VALUES (?, ?, ?, ?, ?, 'customer', ?, ?)`,
  ).run(
    id,
    customer.email,
    scrypt(customer.password ?? crypto.randomBytes(12).toString("hex")),
    customer.name,
    customer.phone,
    random() > 0.5 ? 1 : 0,
    isoAgo(customer.daysAgo),
  );
  customerRecords.push({ ...customer, id });

  // Saved addresses for the demo accounts
  if (customer.password) {
    addresses.forEach((address, index) => {
      db.prepare(
        `INSERT INTO addresses (id, user_id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'Nigeria', ?)`,
      ).run(
        newId("adr"),
        id,
        address.label,
        customer.name,
        customer.phone,
        address.line1,
        address.city,
        address.state,
        address.postalCode,
        index === 0 ? 1 : 0,
      );
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Demo orders — real rows so the dashboard, analytics, order history and      */
/* best-seller ranking are all computed from actual data.                     */
/* -------------------------------------------------------------------------- */

const VAT_RATE = 0.075; // 7.5% VAT, tax-inclusive (mirrors the seeded store settings)
const DELIVERY = {
  standard: { label: "Standard delivery", price: 350_000 },
  express: { label: "Express delivery", price: 750_000 },
  pickup: { label: "Atelier pick-up", price: 0 },
  international: { label: "International (DHL)", price: 2_800_000 },
};

const statusPlan = [
  "delivered", "delivered", "delivered", "delivered", "delivered", "delivered",
  "shipped", "shipped", "processing", "processing", "delivered", "cancelled",
  "delivered", "pending", "shipped", "delivered", "processing", "delivered",
];

const allProducts = [...catalog.values()];

for (let index = 0; index < statusPlan.length; index += 1) {
  const status = statusPlan[index];
  const customer = customerRecords[index % customerRecords.length];
  const daysAgo = Math.round(45 - index * 2.4) + between(0, 1);
  const createdAt = isoAgo(Math.max(daysAgo, 1), between(0, 20));
  const delivery = pick(["standard", "standard", "standard", "express", "pickup", "international"]);
  const paymentMethod = status === "cancelled"
    ? "bank_transfer"
    : pick(["paystack", "paystack", "paystack", "bank_transfer", "cod"]);

  // 1–3 line items
  const lineCount = between(1, 3);
  const chosen = new Set();
  while (chosen.size < lineCount) chosen.add(pick(allProducts));
  const items = [...chosen].map((product) => {
    const variant = pick(product.variants.filter((v) => v.stock > 0) ?? product.variants) ?? product.variants[0];
    const quantity = between(1, 2);
    return {
      product,
      variant,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const couponCode = random() > 0.72 ? pick(["WELCOME10", "FREESHIP", "ATELIER5K"]) : null;
  let discount = 0;
  if (couponCode === "WELCOME10") discount = Math.round(subtotal * 0.1);
  if (couponCode === "ATELIER5K" && subtotal >= 6_000_000) discount = 500_000;
  const shipping = couponCode === "FREESHIP" ? 0 : DELIVERY[delivery].price;
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * VAT_RATE) / (1 + VAT_RATE));
  const total = taxable + shipping;

  const paymentStatus =
    status === "cancelled" ? "unpaid" : status === "pending" ? (paymentMethod === "bank_transfer" ? "pending" : "unpaid") : "paid";

  const timeline = [
    { at: createdAt, label: "Order placed", note: `Payment via ${paymentMethod.replace("_", " ")}` },
  ];
  if (paymentStatus === "paid") {
    timeline.push({ at: isoAgo(Math.max(daysAgo - 0.02, 0.2)), label: "Payment confirmed", note: "Verified by the payments service" });
  }
  if (["processing", "packed", "shipped", "delivered"].includes(status)) {
    timeline.push({ at: isoAgo(Math.max(daysAgo - 1, 0.5)), label: "Preparing your order", note: "Packed at the Lagos atelier" });
  }
  if (["shipped", "delivered"].includes(status)) {
    timeline.push({ at: isoAgo(Math.max(daysAgo - 2, 0.4)), label: "Shipped", note: "Handed to the courier" });
  }
  if (status === "delivered") {
    timeline.push({ at: isoAgo(Math.max(daysAgo - 4, 0.1)), label: "Delivered", note: "Signed for by the recipient" });
  }
  if (status === "cancelled") {
    timeline.push({ at: isoAgo(Math.max(daysAgo - 1, 0.3)), label: "Order cancelled", note: "Stock returned to the catalogue" });
  }

  const orderId = newId("ord");
  const number = orderNumber();
  db.prepare(
    `INSERT INTO orders (id, order_number, user_id, email, phone, customer_name, shipping_address, delivery_method,
       delivery_label, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency, coupon_code,
       status, payment_status, payment_method, payment_reference, timeline, stock_released, created_at, updated_at, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NGN', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(
    orderId,
    number,
    customer.id,
    customer.email,
    customer.phone,
    customer.name,
    JSON.stringify({
      fullName: customer.name,
      phone: customer.phone,
      line1: pick(addresses).line1,
      line2: null,
      city: "Lagos",
      state: "Lagos",
      postalCode: "101241",
      country: "Nigeria",
    }),
    delivery,
    DELIVERY[delivery].label,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    couponCode,
    status,
    paymentStatus,
    paymentMethod,
    paymentStatus === "paid" ? `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null,
    JSON.stringify(timeline),
    createdAt,
    createdAt,
    paymentStatus === "paid" ? isoAgo(Math.max(daysAgo - 0.02, 0.2)) : null,
  );

  for (const item of items) {
    db.prepare(
      `INSERT INTO order_items (id, order_id, product_id, variant_id, name, slug, size, color, image, unit_price_cents, quantity, line_total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newId("oit"),
      orderId,
      item.product.id,
      item.variant.id,
      item.product.name,
      item.product.slug,
      item.variant.size,
      item.variant.color,
      item.variant.image,
      item.unitPrice,
      item.quantity,
      item.lineTotal,
    );
  }
}

const counts = {
  categories: db.prepare("SELECT COUNT(*) AS n FROM categories").get().n,
  products: db.prepare("SELECT COUNT(*) AS n FROM products").get().n,
  variants: db.prepare("SELECT COUNT(*) AS n FROM variants").get().n,
  reviews: db.prepare("SELECT COUNT(*) AS n FROM reviews").get().n,
  orders: db.prepare("SELECT COUNT(*) AS n FROM orders").get().n,
  users: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
};

console.log("Seeded Product Pro Hub demo store →", dbPath);
console.table(counts);
console.log(`Admin login:    ${adminEmail} / ${adminPassword}`);
console.log("Customer login: ada@example.com / Shopper!2345");
db.close();
