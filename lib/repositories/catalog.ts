import "server-only";
import { db } from "@/lib/db";
import { newId, parseJson, slugify } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  priceDeltaCents: number;
  stock: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  details: string[];
  priceCents: number;
  compareAtCents: number | null;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  collection: string | null;
  material: string | null;
  care: string | null;
  images: string[];
  tags: string[];
  status: "active" | "draft" | "archived";
  isFeatured: boolean;
  isNew: boolean;
  badge: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sold: number;
  variants?: Variant[];
}

type RawProduct = Record<string, unknown>;

const PRODUCT_SELECT = `
  SELECT p.*,
         c.slug AS category_slug,
         c.name AS category_name,
         (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.is_published = 1) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.is_published = 1) AS review_count,
         (SELECT COALESCE(SUM(v.stock), 0) FROM variants v WHERE v.product_id = p.id AND v.is_active = 1) AS stock,
         (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
           WHERE oi.product_id = p.id AND o.payment_status = 'paid') AS sold
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
`;

function mapProduct(row: RawProduct): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    subtitle: (row.subtitle as string) ?? null,
    description: String(row.description ?? ""),
    details: parseJson<string[]>(row.details, []),
    priceCents: Number(row.price_cents ?? 0),
    compareAtCents: row.compare_at_cents == null ? null : Number(row.compare_at_cents),
    categoryId: (row.category_id as string) ?? null,
    categorySlug: (row.category_slug as string) ?? null,
    categoryName: (row.category_name as string) ?? null,
    collection: (row.collection as string) ?? null,
    material: (row.material as string) ?? null,
    care: (row.care as string) ?? null,
    images: parseJson<string[]>(row.images, []),
    tags: parseJson<string[]>(row.tags, []),
    status: (row.status as Product["status"]) ?? "draft",
    isFeatured: Boolean(row.is_featured),
    isNew: Boolean(row.is_new),
    badge: (row.badge as string) ?? null,
    seoTitle: (row.seo_title as string) ?? null,
    seoDescription: (row.seo_description as string) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    stock: Number(row.stock ?? 0),
    sold: Number(row.sold ?? 0),
  };
}

function mapVariant(row: Record<string, unknown>): Variant {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    sku: String(row.sku),
    size: (row.size as string) ?? null,
    colorName: (row.color_name as string) ?? null,
    colorHex: (row.color_hex as string) ?? null,
    priceDeltaCents: Number(row.price_delta_cents ?? 0),
    stock: Number(row.stock ?? 0),
    isActive: Boolean(row.is_active),
  };
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export function listCategories(options: { activeOnly?: boolean } = {}): Category[] {
  const rows = db().all<Record<string, unknown>>(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS product_count
       FROM categories c
      ${options.activeOnly ? "WHERE c.is_active = 1" : ""}
      ORDER BY c.sort_order ASC, c.name ASC`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string) ?? null,
    image: (row.image as string) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    productCount: Number(row.product_count ?? 0),
  }));
}

export function getCategoryBySlug(slug: string): Category | null {
  return listCategories().find((category) => category.slug === slug) ?? null;
}

export function saveCategory(input: {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): string {
  const id = input.id ?? newId("cat");
  const slug = slugify(input.slug || input.name);
  if (input.id) {
    db().run(
      `UPDATE categories SET name = ?, slug = ?, description = ?, image = ?, sort_order = ?, is_active = ?
        WHERE id = ?`,
      [
        input.name,
        slug,
        input.description ?? null,
        input.image ?? null,
        input.sortOrder ?? 0,
        input.isActive === false ? 0 : 1,
        id,
      ],
    );
  } else {
    db().run(
      `INSERT INTO categories (id, slug, name, description, image, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        slug,
        input.name,
        input.description ?? null,
        input.image ?? null,
        input.sortOrder ?? 0,
        input.isActive === false ? 0 : 1,
      ],
    );
  }
  return id;
}

export function deleteCategory(id: string) {
  db().run("DELETE FROM categories WHERE id = ?", [id]);
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export type ProductSort = "featured" | "newest" | "price-asc" | "price-desc" | "popular" | "rating";

export interface ProductFilters {
  q?: string;
  category?: string;
  collection?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStockOnly?: boolean;
  onSale?: boolean;
  tags?: string[];
  sort?: ProductSort;
  limit?: number;
  offset?: number;
  includeDrafts?: boolean;
  featuredOnly?: boolean;
  newOnly?: boolean;
}

const SORT_SQL: Record<ProductSort, string> = {
  featured: "p.is_featured DESC, p.is_new DESC, p.created_at DESC",
  newest: "p.created_at DESC",
  "price-asc": "p.price_cents ASC",
  "price-desc": "p.price_cents DESC",
  popular: "sold DESC, p.is_featured DESC",
  rating: "rating DESC, review_count DESC, p.created_at DESC",
};

function filterClause(filters: ProductFilters) {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (!filters.includeDrafts) where.push("p.status = 'active'");
  if (filters.featuredOnly) where.push("p.is_featured = 1");
  if (filters.newOnly) where.push("p.is_new = 1");
  if (filters.onSale) where.push("p.compare_at_cents IS NOT NULL AND p.compare_at_cents > p.price_cents");
  if (filters.category) {
    where.push("c.slug = ?");
    params.push(filters.category);
  }
  if (filters.collection) {
    where.push("lower(p.collection) = lower(?)");
    params.push(filters.collection);
  }
  if (filters.q) {
    where.push(
      "(lower(p.name) LIKE ? OR lower(p.description) LIKE ? OR lower(p.tags) LIKE ? OR lower(c.name) LIKE ? OR lower(COALESCE(p.material,'')) LIKE ?)",
    );
    const like = `%${filters.q.toLowerCase()}%`;
    params.push(like, like, like, like, like);
  }
  if (typeof filters.minPriceCents === "number") {
    where.push("p.price_cents >= ?");
    params.push(filters.minPriceCents);
  }
  if (typeof filters.maxPriceCents === "number") {
    where.push("p.price_cents <= ?");
    params.push(filters.maxPriceCents);
  }
  if (filters.inStockOnly) {
    where.push(
      "(SELECT COALESCE(SUM(v.stock),0) FROM variants v WHERE v.product_id = p.id AND v.is_active = 1) > 0",
    );
  }
  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export function listProducts(filters: ProductFilters = {}): { products: Product[]; total: number } {
  const { clause, params } = filterClause(filters);
  const sort = SORT_SQL[filters.sort ?? "featured"];
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const rows = db().all<Record<string, unknown>>(
    `${PRODUCT_SELECT} ${clause} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const countRow = db().get<{ total: number }>(
    `SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id ${clause}`,
    params,
  );

  return { products: rows.map(mapProduct), total: Number(countRow?.total ?? 0) };
}

export function getProductBySlug(slug: string, options: { includeDrafts?: boolean } = {}): Product | null {
  const row = db().get<Record<string, unknown>>(
    `${PRODUCT_SELECT} WHERE p.slug = ? ${options.includeDrafts ? "" : "AND p.status = 'active'"}`,
    [slug],
  );
  if (!row) return null;
  const product = mapProduct(row);
  product.variants = listVariants(product.id);
  return product;
}

export function getProductById(id: string): Product | null {
  const row = db().get<Record<string, unknown>>(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
  if (!row) return null;
  const product = mapProduct(row);
  product.variants = listVariants(product.id);
  return product;
}

export function listVariants(productId: string): Variant[] {
  return db()
    .all<Record<string, unknown>>(
      "SELECT * FROM variants WHERE product_id = ? ORDER BY sort_order ASC, size ASC",
      [productId],
    )
    .map(mapVariant);
}

export function getVariantById(id: string):
  | (Variant & { product: Product; unitPriceCents: number })
  | null {
  const row = db().get<Record<string, unknown>>("SELECT * FROM variants WHERE id = ?", [id]);
  if (!row) return null;
  const variant = mapVariant(row);
  const product = getProductById(variant.productId);
  if (!product) return null;
  return { ...variant, product, unitPriceCents: product.priceCents + variant.priceDeltaCents };
}

export function relatedProducts(product: Product, limit = 4): Product[] {
  const { products } = listProducts({
    category: product.categorySlug ?? undefined,
    limit: limit + 3,
  });
  const filtered = products.filter((item) => item.id !== product.id).slice(0, limit);
  if (filtered.length >= limit) return filtered;
  const fallback = listProducts({ limit: limit + 4 }).products.filter(
    (item) => item.id !== product.id && !filtered.some((f) => f.id === item.id),
  );
  return [...filtered, ...fallback].slice(0, limit);
}

export interface ProductInput {
  id?: string;
  name: string;
  slug?: string;
  subtitle?: string | null;
  description: string;
  details: string[];
  priceCents: number;
  compareAtCents?: number | null;
  categoryId?: string | null;
  collection?: string | null;
  material?: string | null;
  care?: string | null;
  images: string[];
  tags: string[];
  status: Product["status"];
  isFeatured: boolean;
  isNew: boolean;
  badge?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  variants: {
    id?: string;
    sku?: string;
    size?: string | null;
    colorName?: string | null;
    colorHex?: string | null;
    priceDeltaCents?: number;
    stock: number;
    isActive?: boolean;
  }[];
}

export function saveProduct(input: ProductInput): string {
  const id = input.id ?? newId("prd");
  const slug = slugify(input.slug || input.name);

  db().transaction(() => {
    const payload = [
      input.name.trim(),
      slug,
      input.subtitle?.trim() || null,
      input.description,
      JSON.stringify(input.details.filter(Boolean)),
      input.priceCents,
      input.compareAtCents ?? null,
      input.categoryId || null,
      input.collection?.trim() || null,
      input.material?.trim() || null,
      input.care?.trim() || null,
      JSON.stringify(input.images.filter(Boolean)),
      JSON.stringify(input.tags.filter(Boolean)),
      input.status,
      input.isFeatured ? 1 : 0,
      input.isNew ? 1 : 0,
      input.badge?.trim() || null,
      input.seoTitle?.trim() || null,
      input.seoDescription?.trim() || null,
    ];

    if (input.id) {
      db().run(
        `UPDATE products SET name = ?, slug = ?, subtitle = ?, description = ?, details = ?, price_cents = ?,
           compare_at_cents = ?, category_id = ?, collection = ?, material = ?, care = ?, images = ?, tags = ?,
           status = ?, is_featured = ?, is_new = ?, badge = ?, seo_title = ?, seo_description = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
        [...payload, id],
      );
    } else {
      db().run(
        `INSERT INTO products (name, slug, subtitle, description, details, price_cents, compare_at_cents,
           category_id, collection, material, care, images, tags, status, is_featured, is_new, badge,
           seo_title, seo_description, id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...payload, id],
      );
    }

    // Variants: upsert the submitted rows, remove ones no longer present.
    const keptIds: string[] = [];
    input.variants.forEach((variant, index) => {
      if (!variant.size && !variant.colorName) return;
      const variantId = variant.id ?? newId("var");
      const sku =
        variant.sku?.trim() ||
        `${slug}-${slugify(`${variant.size ?? ""}-${variant.colorName ?? ""}`) || index + 1}`.toUpperCase();
      const existing = variant.id
        ? db().get<{ stock: number }>("SELECT stock FROM variants WHERE id = ?", [variant.id])
        : undefined;

      if (existing) {
        db().run(
          `UPDATE variants SET sku = ?, size = ?, color_name = ?, color_hex = ?, price_delta_cents = ?,
             stock = ?, is_active = ?, sort_order = ? WHERE id = ?`,
          [
            sku,
            variant.size ?? null,
            variant.colorName ?? null,
            variant.colorHex ?? null,
            variant.priceDeltaCents ?? 0,
            variant.stock,
            variant.isActive === false ? 0 : 1,
            index,
            variantId,
          ],
        );
        if (existing.stock !== variant.stock) {
          db().run(
            "INSERT INTO inventory_logs (id, variant_id, product_id, delta, reason) VALUES (?, ?, ?, ?, 'manual_adjustment')",
            [newId("inv"), variantId, id, variant.stock - existing.stock],
          );
        }
      } else {
        db().run(
          `INSERT INTO variants (id, product_id, sku, size, color_name, color_hex, price_delta_cents, stock, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            variantId,
            id,
            sku,
            variant.size ?? null,
            variant.colorName ?? null,
            variant.colorHex ?? null,
            variant.priceDeltaCents ?? 0,
            variant.stock,
            variant.isActive === false ? 0 : 1,
            index,
          ],
        );
        db().run(
          "INSERT INTO inventory_logs (id, variant_id, product_id, delta, reason) VALUES (?, ?, ?, ?, 'initial_stock')",
          [newId("inv"), variantId, id, variant.stock],
        );
      }
      keptIds.push(variantId);
    });

    if (keptIds.length) {
      db().run(
        `DELETE FROM variants WHERE product_id = ? AND id NOT IN (${keptIds.map(() => "?").join(",")})`,
        [id, ...keptIds],
      );
    } else {
      db().run("DELETE FROM variants WHERE product_id = ?", [id]);
    }
  });

  return id;
}

export function deleteProduct(id: string) {
  db().run("DELETE FROM products WHERE id = ?", [id]);
}

export function updateStock(variantId: string, stock: number, reason = "manual_adjustment") {
  const current = db().get<{ stock: number; product_id: string }>(
    "SELECT stock, product_id FROM variants WHERE id = ?",
    [variantId],
  );
  if (!current) return;
  db().transaction(() => {
    db().run("UPDATE variants SET stock = ? WHERE id = ?", [Math.max(0, stock), variantId]);
    db().run(
      "INSERT INTO inventory_logs (id, variant_id, product_id, delta, reason) VALUES (?, ?, ?, ?, ?)",
      [newId("inv"), variantId, current.product_id, Math.max(0, stock) - current.stock, reason],
    );
  });
}

export function inventoryLevels() {
  return db().all<{
    variant_id: string;
    sku: string;
    size: string | null;
    color_name: string | null;
    stock: number;
    product_id: string;
    product_name: string;
    product_slug: string;
    threshold: number;
  }>(
    `SELECT v.id AS variant_id, v.sku, v.size, v.color_name, v.stock, p.id AS product_id, p.name AS product_name,
            p.slug AS product_slug, 5 AS threshold
       FROM variants v JOIN products p ON p.id = v.product_id
      WHERE p.status != 'archived'
      ORDER BY v.stock ASC, p.name ASC`,
  );
}

export function collections(): string[] {
  return db()
    .all<{ collection: string }>(
      "SELECT DISTINCT collection FROM products WHERE collection IS NOT NULL AND collection != '' ORDER BY collection",
    )
    .map((row) => row.collection);
}

export function priceBounds(): { min: number; max: number } {
  const row = db().get<{ min: number; max: number }>(
    "SELECT COALESCE(MIN(price_cents),0) AS min, COALESCE(MAX(price_cents),0) AS max FROM products WHERE status = 'active'",
  );
  return { min: Number(row?.min ?? 0), max: Number(row?.max ?? 0) };
}
