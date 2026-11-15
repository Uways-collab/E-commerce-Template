import "server-only";
import { db } from "@/lib/db";
import { newId } from "@/lib/utils";
import type { CouponRecord } from "@/lib/pricing";

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

export function listCoupons(): CouponRecord[] {
  return db().all<CouponRecord>("SELECT * FROM coupons ORDER BY is_active DESC, created_at DESC");
}

export function getCouponByCode(code: string): CouponRecord | null {
  return db().get<CouponRecord>("SELECT * FROM coupons WHERE upper(code) = upper(?)", [code.trim()]) ?? null;
}

export function getCouponById(id: string): CouponRecord | null {
  return db().get<CouponRecord>("SELECT * FROM coupons WHERE id = ?", [id]) ?? null;
}

export interface CouponInput {
  id?: string;
  code: string;
  description?: string | null;
  kind: CouponRecord["kind"];
  value: number;
  minSubtotalCents: number;
  maxUses?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export function saveCoupon(input: CouponInput): string {
  const id = input.id ?? newId("cpn");
  const code = input.code.trim().toUpperCase();
  if (input.id) {
    db().run(
      `UPDATE coupons SET code = ?, description = ?, kind = ?, value = ?, min_subtotal_cents = ?,
         max_uses = ?, starts_at = ?, expires_at = ?, is_active = ? WHERE id = ?`,
      [
        code,
        input.description ?? null,
        input.kind,
        input.value,
        input.minSubtotalCents,
        input.maxUses ?? null,
        input.startsAt || null,
        input.expiresAt || null,
        input.isActive === false ? 0 : 1,
        id,
      ],
    );
  } else {
    db().run(
      `INSERT INTO coupons (id, code, description, kind, value, min_subtotal_cents, max_uses, starts_at, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        code,
        input.description ?? null,
        input.kind,
        input.value,
        input.minSubtotalCents,
        input.maxUses ?? null,
        input.startsAt || null,
        input.expiresAt || null,
        input.isActive === false ? 0 : 1,
      ],
    );
  }
  return id;
}

export function deleteCoupon(id: string) {
  db().run("DELETE FROM coupons WHERE id = ?", [id]);
}

export function toggleCoupon(id: string, isActive: boolean) {
  db().run("UPDATE coupons SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, id]);
}

/* -------------------------------------------------------------------------- */
/* Banners                                                                    */
/* -------------------------------------------------------------------------- */

export interface Banner {
  id: string;
  title: string;
  eyebrow: string | null;
  subtitle: string | null;
  image: string | null;
  href: string | null;
  ctaLabel: string | null;
  placement: "promo" | "hero" | "story" | "announcement";
  sortOrder: number;
  isActive: boolean;
}

function mapBanner(row: Record<string, unknown>): Banner {
  return {
    id: String(row.id),
    title: String(row.title),
    eyebrow: (row.eyebrow as string) ?? null,
    subtitle: (row.subtitle as string) ?? null,
    image: (row.image as string) ?? null,
    href: (row.href as string) ?? null,
    ctaLabel: (row.cta_label as string) ?? null,
    placement: (row.placement as Banner["placement"]) ?? "promo",
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
  };
}

export function listBanners(options: { placement?: Banner["placement"]; activeOnly?: boolean } = {}): Banner[] {
  const where: string[] = [];
  const params: string[] = [];
  if (options.placement) {
    where.push("placement = ?");
    params.push(options.placement);
  }
  if (options.activeOnly) where.push("is_active = 1");
  return db()
    .all<Record<string, unknown>>(
      `SELECT * FROM banners ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY sort_order ASC, created_at DESC`,
      params,
    )
    .map(mapBanner);
}

export function saveBanner(input: Omit<Banner, "id"> & { id?: string }): string {
  const id = input.id ?? newId("bnr");
  const params = [
    input.title,
    input.eyebrow ?? null,
    input.subtitle ?? null,
    input.image ?? null,
    input.href ?? null,
    input.ctaLabel ?? null,
    input.placement,
    input.sortOrder,
    input.isActive ? 1 : 0,
  ];
  if (input.id) {
    db().run(
      `UPDATE banners SET title = ?, eyebrow = ?, subtitle = ?, image = ?, href = ?, cta_label = ?,
         placement = ?, sort_order = ?, is_active = ? WHERE id = ?`,
      [...params, id],
    );
  } else {
    db().run(
      `INSERT INTO banners (id, title, eyebrow, subtitle, image, href, cta_label, placement, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ...params],
    );
  }
  return id;
}

export function deleteBanner(id: string) {
  db().run("DELETE FROM banners WHERE id = ?", [id]);
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userId: string | null;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  isPublished: boolean;
  isVerified: boolean;
  createdAt: string;
}

function mapReview(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: (row.product_name as string) ?? undefined,
    productSlug: (row.product_slug as string) ?? undefined,
    userId: (row.user_id as string) ?? null,
    author: String(row.author),
    rating: Number(row.rating),
    title: (row.title as string) ?? null,
    body: String(row.body),
    isPublished: Boolean(row.is_published),
    isVerified: Boolean(row.is_verified),
    createdAt: String(row.created_at),
  };
}

export function listProductReviews(productId: string): Review[] {
  return db()
    .all<Record<string, unknown>>(
      "SELECT * FROM reviews WHERE product_id = ? AND is_published = 1 ORDER BY created_at DESC",
      [productId],
    )
    .map(mapReview);
}

export function ratingBreakdown(productId: string): { rating: number; count: number }[] {
  const rows = db().all<{ rating: number; n: number }>(
    "SELECT rating, COUNT(*) AS n FROM reviews WHERE product_id = ? AND is_published = 1 GROUP BY rating",
    [productId],
  );
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: Number(rows.find((row) => Number(row.rating) === rating)?.n ?? 0),
  }));
}

export function createReview(input: {
  productId: string;
  userId?: string | null;
  author: string;
  rating: number;
  title?: string | null;
  body: string;
  isVerified?: boolean;
}): string {
  const id = newId("rev");
  db().run(
    `INSERT INTO reviews (id, product_id, user_id, author, rating, title, body, is_published, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      input.productId,
      input.userId ?? null,
      input.author,
      Math.min(5, Math.max(1, Math.round(input.rating))),
      input.title ?? null,
      input.body,
      input.isVerified ? 1 : 0,
    ],
  );
  return id;
}

export function listAllReviews(limit = 100): Review[] {
  return db()
    .all<Record<string, unknown>>(
      `SELECT r.*, p.name AS product_name, p.slug AS product_slug FROM reviews r
         JOIN products p ON p.id = r.product_id
        ORDER BY r.created_at DESC LIMIT ?`,
      [limit],
    )
    .map(mapReview);
}

export function topReviews(limit = 6): Review[] {
  return db()
    .all<Record<string, unknown>>(
      `SELECT r.*, p.name AS product_name, p.slug AS product_slug FROM reviews r
         JOIN products p ON p.id = r.product_id
        WHERE r.is_published = 1 AND r.rating >= 4 AND length(r.body) > 60
        ORDER BY r.rating DESC, r.created_at DESC LIMIT ?`,
      [limit],
    )
    .map(mapReview);
}

export function setReviewPublished(id: string, published: boolean) {
  db().run("UPDATE reviews SET is_published = ? WHERE id = ?", [published ? 1 : 0, id]);
}

export function deleteReview(id: string) {
  db().run("DELETE FROM reviews WHERE id = ?", [id]);
}

/* -------------------------------------------------------------------------- */
/* Newsletter                                                                 */
/* -------------------------------------------------------------------------- */

export function subscribeNewsletter(email: string, source = "footer"): { ok: boolean; message: string } {
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { ok: false, message: "Please enter a valid email address." };
  }
  const existing = db().get<{ email: string }>("SELECT email FROM newsletter_subscribers WHERE email = ?", [clean]);
  if (existing) return { ok: true, message: "You’re already on the list — thank you." };
  db().run("INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?)", [clean, source]);
  return { ok: true, message: "Welcome to the list. Check your inbox for your welcome code." };
}

export function listSubscribers(limit = 200) {
  return db().all<{ email: string; source: string; created_at: string }>(
    "SELECT email, source, created_at FROM newsletter_subscribers ORDER BY created_at DESC LIMIT ?",
    [limit],
  );
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  orderCount: number;
  lifetimeValueCents: number;
  lastOrderAt: string | null;
}

export function listCustomers(options: { q?: string; limit?: number } = {}): CustomerSummary[] {
  const params: string[] = [];
  let clause = "WHERE u.role = 'customer'";
  if (options.q) {
    clause += " AND (lower(u.name) LIKE ? OR lower(u.email) LIKE ?)";
    const like = `%${options.q.toLowerCase()}%`;
    params.push(like, like);
  }
  return db().all<Record<string, unknown>>(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
            (SELECT COALESCE(SUM(o.total_cents),0) FROM orders o WHERE o.user_id = u.id AND o.payment_status = 'paid') AS ltv,
            (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) AS last_order_at
       FROM users u ${clause}
      ORDER BY u.created_at DESC LIMIT ?`,
    [...params, Math.min(options.limit ?? 100, 500)],
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: (row.phone as string) ?? null,
    role: String(row.role),
    createdAt: String(row.created_at),
    orderCount: Number(row.order_count ?? 0),
    lifetimeValueCents: Number(row.ltv ?? 0),
    lastOrderAt: (row.last_order_at as string) ?? null,
  }));
}

export function getCustomer(id: string) {
  const row = db().get<Record<string, unknown>>(
    `SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
            (SELECT COALESCE(SUM(o.total_cents),0) FROM orders o WHERE o.user_id = u.id AND o.payment_status='paid') AS ltv
       FROM users u WHERE u.id = ?`,
    [id],
  );
  if (!row) return null;
  const addresses = db().all<Record<string, unknown>>(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC",
    [id],
  );
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: (row.phone as string) ?? null,
    role: String(row.role),
    createdAt: String(row.created_at),
    orderCount: Number(row.order_count ?? 0),
    lifetimeValueCents: Number(row.ltv ?? 0),
    addresses,
  };
}

export function customerCount() {
  return Number(db().get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'")?.n ?? 0);
}
