import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCategoryBySlug, listProducts } from "@/lib/repositories/catalog";
import { getSettings } from "@/lib/settings";
import ProductCard from "@/components/shop/ProductCard";
import Reveal from "@/components/ui/Reveal";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Collection not found" };
  const settings = await getSettings();
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} at ${settings.brand.name}.`,
    alternates: { canonical: `/collections/${category.slug}` },
    openGraph: {
      title: `${category.name} — ${settings.brand.name}`,
      description: category.description ?? settings.seo.defaultDescription,
      images: category.image ? [{ url: category.image }] : undefined,
    },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const settings = await getSettings();
  const { products, total } = listProducts({ category: slug, limit: 24 });

  return (
    <div>
      <section className="page-shell pt-6">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.12em] text-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/shop" className="hover:text-ink">
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink">{category.name}</li>
          </ol>
        </nav>

        <div className="mt-5 grid gap-8 border-b border-line pb-10 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16">
          <div>
            <p className="eyebrow">Collection</p>
            <h1 className="display-section mt-3">{category.name}</h1>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-muted">
              {category.description ?? "A considered edit from the atelier."}
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="tabular-nums text-ink">{total}</span> {total === 1 ? "piece" : "pieces"}
            </p>
          </div>
          {category.image && (
            <div className="relative hidden aspect-[16/9] overflow-hidden lg:block">
              <Image src={category.image} alt={category.name} fill sizes="45vw" className="object-cover" priority />
            </div>
          )}
        </div>
      </section>

      <section className="page-shell py-10">
        {products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index * 50, 250)}>
                <ProductCard product={product} settings={settings} priority={index < 4} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border border-line bg-surface px-6 py-16 text-center">
            <p className="font-display text-[24px]">This edit is being restocked</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted">
              Pieces return to this collection weekly. Browse everything we make in the meantime.
            </p>
            <Link href="/shop" className="btn btn-outline mt-6">
              Shop all pieces
            </Link>
          </div>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            Free delivery over {settings.locale.currencySymbol}
            {(settings.commerce.freeShippingThresholdCents / 100).toLocaleString()}
          </p>
          <Link href="/shop" className="text-[11px] uppercase tracking-[0.14em]">
            <span className="link-underline">Browse all categories</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
