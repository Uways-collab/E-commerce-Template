import type { ProductSort } from "@/lib/repositories/catalog";

export const SHOP_SORTS: ProductSort[] = ["featured", "newest", "price-asc", "price-desc", "popular", "rating"];

export interface ShopQuery {
  category?: string;
  collection?: string;
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort: ProductSort;
  inStockOnly: boolean;
  onSale: boolean;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/i;
const MAX_QUERY_LENGTH = 120;
const MAX_PAGE = 1000;
const MAX_PRICE_CENTS = 1_000_000_000; // ₦10m — far above any real catalogue price

function single(value: string | string[] | undefined): string | undefined {
  const entry = Array.isArray(value) ? value[0] : value;
  if (typeof entry !== "string") return undefined;
  return entry;
}

function slug(value: string | string[] | undefined): string | undefined {
  const entry = single(value)?.trim();
  if (!entry || entry.length > 64 || !SLUG.test(entry)) return undefined;
  return entry;
}

function cents(value: string): number | undefined {
  if (!/^\d{1,12}$/.test(value)) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_PRICE_CENTS) return undefined;
  return parsed;
}

/**
 * Every shop filter arrives from the URL, so each one is validated before it
 * reaches SQL. Invalid input falls back to the unfiltered default instead of
 * erroring — the previous implementation passed `undefined` bind values and an
 * unknown `sort` straight into the query, which threw a 500.
 */
export function parseShopQuery(params: RawParams): ShopQuery {
  const rawSort = single(params.sort);
  const sort = (SHOP_SORTS as string[]).includes(rawSort ?? "") ? (rawSort as ProductSort) : "featured";

  let minPriceCents: number | undefined;
  let maxPriceCents: number | undefined;
  const price = single(params.price)?.trim();
  if (price) {
    const [rawMin, rawMax] = price.split("-");
    minPriceCents = cents(String(rawMin ?? "").trim());
    maxPriceCents = cents(String(rawMax ?? "").trim());
    // `price=500-100` is a typo, not an empty result: normalise the range.
    if (minPriceCents !== undefined && maxPriceCents !== undefined && minPriceCents > maxPriceCents) {
      [minPriceCents, maxPriceCents] = [maxPriceCents, minPriceCents];
    }
  }

  const rawPage = single(params.page);
  const parsedPage = rawPage && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1;

  const rawQuery = single(params.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  const cleanQuery = rawQuery ? rawQuery.replace(/[\u0000-\u001f\u007f]/g, "") : undefined;

  return {
    category: slug(params.category),
    collection: slug(params.collection),
    q: cleanQuery || undefined,
    minPriceCents,
    maxPriceCents,
    sort,
    inStockOnly: single(params.stock) === "in",
    onSale: single(params.sale) === "true",
    page: Math.min(Math.max(parsedPage || 1, 1), MAX_PAGE),
  };
}
