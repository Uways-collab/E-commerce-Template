import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { listCategories, listProducts, priceBounds } from "@/lib/repositories/catalog";
import { listBanners } from "@/lib/repositories/marketing";
import ProductCard from "@/components/shop/ProductCard";
import Pagination from "@/components/shop/Pagination";
import { ShopFilters, SortSelect } from "@/components/shop/ShopControls";
import { formatMoney, cn } from "@/lib/utils";
import { parseShopQuery, SHOP_SORTS } from "@/lib/shop-query";

const PAGE_SIZE = 12;
const SORTS: { label: string; value: (typeof SHOP_SORTS)[number] }[] = [
  { label: "Featured", value: "featured" },
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price-asc" },
  { label: "Price: high to low", value: "price-desc" },
  { label: "Most loved", value: "popular" },
  { label: "Top rated", value: "rating" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const settings = await getSettings();
  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const category = categorySlug
    ? listCategories({ activeOnly: true }).find((item) => item.slug === categorySlug)
    : undefined;
  const title = category ? `${category.name} — shop` : "Shop all pieces";
  return {
    title,
    description:
      category?.description ??
      `Browse every piece from ${settings.brand.name}: ${settings.brand.tagline}`,
    alternates: { canonical: categorySlug ? `/shop?category=${categorySlug}` : "/shop" },
    openGraph: { title: `${title} — ${settings.brand.name}`, description: settings.seo.defaultDescription },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const query = parseShopQuery(params as Record<string, string | string[] | undefined>);
  const { category: categorySlug, collection, q, sort, inStockOnly, onSale, page } = query;
  const { minPriceCents, maxPriceCents } = query;
  // Canonical price band string for the filter UI and pagination links.
  const price =
    minPriceCents !== undefined || maxPriceCents !== undefined
      ? `${minPriceCents ?? 0}-${maxPriceCents ?? ""}`
      : undefined;

  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  const [{ products, total }, categories, bounds, collectionRows, banners] = await Promise.all([
    Promise.resolve(
      listProducts({
        category: categorySlug,
        collection,
        q,
        minPriceCents,
        maxPriceCents,
        inStockOnly,
        onSale,
        sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    ),
    Promise.resolve(listCategories({ activeOnly: true })),
    Promise.resolve(priceBounds()),
    Promise.resolve(
      db().all<{ collection: string; n: number }>(
        "SELECT collection, COUNT(*) AS n FROM products WHERE status = 'active' AND collection IS NOT NULL GROUP BY collection ORDER BY n DESC",
      ),
    ),
    Promise.resolve(listBanners({ placement: "promo", activeOnly: true })),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCategory = categories.find((category) => category.slug === categorySlug);
  const promo = banners[0];

  // Four price bands tuned to the live catalogue range.
  const span = Math.max(bounds.max - bounds.min, 1);
  const step = Math.round(span / 4);
  const priceBands = [
    { label: `Under ${money(bounds.min + step)}`, min: undefined, max: bounds.min + step },
    { label: `${money(bounds.min + step)} – ${money(bounds.min + step * 2)}`, min: bounds.min + step, max: bounds.min + step * 2 },
    { label: `${money(bounds.min + step * 2)} – ${money(bounds.min + step * 3)}`, min: bounds.min + step * 2, max: bounds.min + step * 3 },
    { label: `${money(bounds.min + step * 3)} and above`, min: bounds.min + step * 3, max: undefined },
  ];

  const heading = activeCategory ? activeCategory.name : onSale ? "The archive sale" : "All pieces";
  const description =
    activeCategory?.description ??
    (onSale
      ? "Last-season pieces from the atelier, reduced while the final sizes remain."
      : "Every piece we make, in one place — natural fibres, small runs, honest construction.");

  return (
    <div className="page-shell">
      <nav aria-label="Breadcrumb" className="pt-6 text-[11px] uppercase tracking-[0.12em] text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink">{heading}</li>
        </ol>
      </nav>

      <header className="grid gap-4 border-b border-line pb-8 pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">{activeCategory ? "Collection" : "The shop"}</p>
          <h1 className="display-section mt-3">{heading}</h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted">{description}</p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted lg:pb-2">
          <span className="tabular-nums text-ink">{total}</span> {total === 1 ? "piece" : "pieces"}
          {q && (
            <>
              {" "}
              for <span className="text-ink">“{q}”</span>
            </>
          )}
        </p>
      </header>

      {promo && !q && (
        <div className="mt-8 grid overflow-hidden border border-line bg-surface sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
            {promo.eyebrow && (
              <span className="text-[10px] uppercase tracking-[0.16em] text-accent">{promo.eyebrow}</span>
            )}
            <p className="text-[13px] text-ink">{promo.title}</p>
            {promo.subtitle && <p className="text-[12px] text-muted sm:border-l sm:border-line sm:pl-6">{promo.subtitle}</p>}
          </div>
          {promo.href && (
            <Link
              href={promo.href}
              className="border-t border-line px-5 py-3 text-[10.5px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-canvas sm:border-l sm:border-t-0 sm:py-4"
            >
              {promo.ctaLabel ?? "Discover"}
            </Link>
          )}
        </div>
      )}

      <div className="mt-2 grid gap-8 lg:mt-8 lg:grid-cols-[220px_1fr] lg:gap-12">
        <ShopFilters
          categories={categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            count: category.productCount ?? 0,
          }))}
          collections={collectionRows.map((row) => ({ name: row.collection, count: Number(row.n) }))}
          priceBands={priceBands}
          activeCategory={categorySlug}
          activeCollection={collection}
          activePrice={price}
          inStockOnly={inStockOnly}
          onSale={onSale}
          total={categories.reduce((sum, category) => sum + (category.productCount ?? 0), 0)}
          query={q}
        />

        <div>
          <div className="mb-6 hidden items-center justify-between border-b border-line py-3 lg:flex">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
              Showing <span className="text-ink tabular-nums">{products.length}</span> of{" "}
              <span className="text-ink tabular-nums">{total}</span>
            </p>
            <SortSelect value={sort} options={SORTS.map((item) => ({ label: item.label, value: item.value }))} />
          </div>
          <div className="mb-6 flex items-center justify-between border-b border-line py-3 lg:hidden">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
              {total} pieces
            </span>
            <SortSelect value={sort} options={SORTS.map((item) => ({ label: item.label, value: item.value }))} />
          </div>

          {products.length === 0 ? (
            <div className="border border-line bg-surface px-6 py-16 text-center">
              <p className="font-display text-[24px]">Nothing matched that search</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted">
                Try a different category or clear your filters — the collection changes weekly.
              </p>
              <Link href="/shop" className="btn btn-outline mt-6">
                Reset filters
              </Link>
            </div>
          ) : (
            <div className={cn("grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3")}>
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} settings={settings} priority={index < 3} />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            params={{ category: categorySlug, collection, q, price, sort, stock: inStockOnly ? "in" : undefined, sale: onSale ? "true" : undefined }}
          />
        </div>
      </div>

      {banners[1] && (
        <section className="my-section border-t border-line pt-10">
          <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr_auto]">
            {banners[1].image && (
              <div className="media-frame relative aspect-[4/3]">
                <Image src={banners[1].image} alt="" fill sizes="180px" className="object-cover" />
              </div>
            )}
            <div>
              <p className="eyebrow">{banners[1].eyebrow}</p>
              <h2 className="mt-2 font-display text-[22px] leading-tight">{banners[1].title}</h2>
              <p className="mt-1 max-w-lg text-[12.5px] text-muted">{banners[1].subtitle}</p>
            </div>
            {banners[1].href && (
              <Link href={banners[1].href} className="btn btn-outline btn-sm">
                {banners[1].ctaLabel ?? "Discover"}
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
