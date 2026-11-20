import { jsonLdString } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { getProductBySlug, relatedProducts } from "@/lib/repositories/catalog";
import { listProductReviews, ratingBreakdown } from "@/lib/repositories/marketing";
import { getSettings, providerConfigured } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchase from "@/components/product/ProductPurchase";
import ReviewForm from "@/components/product/ReviewForm";
import Stars from "@/components/ui/Stars";
import ProductCard from "@/components/shop/ProductCard";
import Reveal from "@/components/ui/Reveal";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([Promise.resolve(getProductBySlug(slug)), getSettings()]);
  // Throwing here (before the body streams) is what lets Next answer with a
  // real 404 status instead of a 200 page that merely looks like one.
  if (!product) notFound();

  const title = product.seoTitle ?? product.name;
  const description =
    product.seoDescription ?? product.subtitle ?? product.description.slice(0, 155);
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ${settings.brand.name}`,
      description,
      url: `/products/${product.slug}`,
      images: image ? [{ url: image, width: 1200, height: 1500, alt: product.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: product.name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const [settings, user] = await Promise.all([getSettings(), getSessionUser()]);
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const reviews = listProductReviews(product.id);
  const breakdown = ratingBreakdown(product.id);
  const related = relatedProducts(product, 4);

  const deliveryMethods = settings.commerce.deliveryMethods.filter((method) => method.enabled);
  const cheapest = [...deliveryMethods].sort((a, b) => a.priceCents - b.priceCents)[0];
  const deliveryNote = cheapest
    ? `Dispatched within 24 hours. ${cheapest.label} from ${money(cheapest.priceCents)} (${cheapest.minDays}–${cheapest.maxDays} days). Complimentary over ${money(settings.commerce.freeShippingThresholdCents)}.`
    : settings.contact.city
      ? `Dispatched within 24 hours from our ${settings.contact.city} studio.`
      : "Dispatched within 24 hours.";

  const enabledPayments = settings.commerce.payments.enabled.filter((method) => providerConfigured(method));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((image) =>
      image.startsWith("http") ? image : `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${image}`,
    ),
    sku: product.variants?.[0]?.sku,
    brand: { "@type": "Brand", name: settings.brand.name },
    material: product.material ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: settings.locale.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/products/${product.slug}`,
      seller: { "@type": "Organization", name: settings.brand.name },
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    review: reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.author },
      reviewRating: { "@type": "Rating", ratingValue: review.rating },
      name: review.title ?? undefined,
      reviewBody: review.body,
      datePublished: review.createdAt.slice(0, 10),
    })),
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="pt-6 text-[11px] uppercase tracking-[0.12em] text-muted">
        <ol className="flex flex-wrap items-center gap-2">
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
          {product.categorySlug && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/collections/${product.categorySlug}`} className="hover:text-ink">
                  {product.categoryName}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 pb-16 pt-6 lg:grid-cols-2 lg:gap-16 lg:pb-24">
        <ProductGallery images={product.images} name={product.name} badge={product.badge} />

        <div className="lg:pt-2">
          <div className="flex flex-wrap items-center gap-3">
            {product.collection && <p className="eyebrow">{product.collection}</p>}
            {product.reviewCount > 0 && (
              <a href="#reviews" className="flex items-center gap-1.5 text-[11px] text-muted hover:text-ink">
                <Stars rating={product.rating} size={11} className="text-ink" />
                <span className="tabular-nums">{product.rating.toFixed(1)}</span>
                <span>({product.reviewCount})</span>
              </a>
            )}
          </div>

          <h1 className="mt-3 font-display text-[clamp(2rem,3.4vw,2.85rem)] leading-[1.05] tracking-[-0.02em]">
            {product.name}
          </h1>
          {product.subtitle && <p className="mt-2 text-[13.5px] text-muted">{product.subtitle}</p>}

          <div className="mt-5">
            <ProductPurchase
              basePriceCents={product.priceCents}
              compareAtCents={product.compareAtCents}
              variants={product.variants ?? []}
              currency={settings.locale.currency}
              locale={settings.locale.locale}
              lowStockThreshold={settings.commerce.lowStockThreshold}
              showStockCount={settings.commerce.showStockCount}
              deliveryNote={deliveryNote}
              maxQuantity={settings.commerce.maxQuantityPerLine}
            />
          </div>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <details open className="group">
              <summary className="flex cursor-pointer items-center justify-between py-3.5 text-[11px] font-medium uppercase tracking-[0.14em]">
                The piece
                <ChevronRight size={14} strokeWidth={1.5} className="transition-transform group-open:rotate-90" />
              </summary>
              <div className="pb-4">
                <p className="text-[13.5px] leading-relaxed text-muted">{product.description}</p>
                {product.material && (
                  <p className="mt-3 text-[12.5px] text-muted">
                    <span className="text-ink">Composition:</span> {product.material}
                  </p>
                )}
              </div>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-3.5 text-[11px] font-medium uppercase tracking-[0.14em]">
                Details & care
                <ChevronRight size={14} strokeWidth={1.5} className="transition-transform group-open:rotate-90" />
              </summary>
              <ul className="space-y-1.5 pb-4">
                {product.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2 text-[12.5px] text-muted">
                    <Check size={13} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent" />
                    {detail}
                  </li>
                ))}
                {product.care && <li className="pt-1.5 text-[12.5px] text-muted">{product.care}</li>}
              </ul>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-3.5 text-[11px] font-medium uppercase tracking-[0.14em]">
                Delivery & returns
                <ChevronRight size={14} strokeWidth={1.5} className="transition-transform group-open:rotate-90" />
              </summary>
              <div className="space-y-2 pb-4 text-[12.5px] text-muted">
                {deliveryMethods.map((method) => (
                  <div key={method.id} className="flex items-baseline justify-between gap-4">
                    <span>
                      {method.label}
                      <span className="block text-[11px] text-muted/80">{method.description}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">
                      {method.priceCents === 0 ? "Free" : money(method.priceCents)}
                    </span>
                  </div>
                ))}
                <p className="pt-2">
                  30-day returns on unworn pieces with tags attached. Read the full{" "}
                  <Link href="/pages/delivery-and-returns" className="link-quiet">
                    delivery & returns policy
                  </Link>
                  .
                </p>
              </div>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between py-3.5 text-[11px] font-medium uppercase tracking-[0.14em]">
                Payment
                <ChevronRight size={14} strokeWidth={1.5} className="transition-transform group-open:rotate-90" />
              </summary>
              <p className="pb-4 text-[12.5px] leading-relaxed text-muted">
                Pay securely by card, bank transfer or USSD through our payment partners
                {enabledPayments.length ? "" : " (once configured)"}.{" "}
                {settings.commerce.payments.enabled.includes("bank_transfer") &&
                  "Bank transfer is available at checkout with manual confirmation."}{" "}
                {settings.commerce.payments.enabled.includes("cod") && "Cash on delivery is available in selected cities."}
              </p>
            </details>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="border-t border-line py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-16">
          <div>
            <p className="eyebrow">Client reviews</p>
            <h2 className="display-section mt-3">What buyers say</h2>
            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-[52px] leading-none tabular-nums">
                {product.reviewCount ? product.rating.toFixed(1) : "—"}
              </span>
              <div className="pb-2">
                <Stars rating={product.rating} size={14} className="text-ink" />
                <p className="mt-1 text-[11px] text-muted">{product.reviewCount} verified reviews</p>
              </div>
            </div>
            <div className="mt-5 space-y-1.5">
              {breakdown.map((row) => {
                const share = product.reviewCount ? (row.count / product.reviewCount) * 100 : 0;
                return (
                  <div key={row.rating} className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="w-3 tabular-nums">{row.rating}</span>
                    <div className="h-1 flex-1 bg-line">
                      <div className="h-full bg-ink/70" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-5 text-right tabular-nums">{row.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              {reviews.length === 0 && (
                <p className="border border-line bg-surface p-5 text-[13px] text-muted">
                  No reviews yet — be the first to tell other buyers how this piece wears.
                </p>
              )}
              {reviews.map((review) => (
                <article key={review.id} className="border-b border-line pb-5 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={review.rating} size={11} className="text-ink" />
                    {review.title && <h3 className="text-[13.5px] font-medium">{review.title}</h3>}
                    {review.isVerified && (
                      <span className="chip border-success/30 text-success">Verified buyer</span>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{review.body}</p>
                  <p className="mt-2 text-[10.5px] uppercase tracking-[0.12em] text-muted/80">
                    {review.author} · {formatDate(review.createdAt)}
                  </p>
                </article>
              ))}
            </div>

            {settings.commerce.reviewsEnabled && (
              <ReviewForm productId={product.id} productSlug={product.slug} isSignedIn={Boolean(user)} />
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="border-t border-line py-14 lg:py-20">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Complete the look</p>
            <h2 className="display-section mt-3">You may also like</h2>
          </div>
          <Link href="/shop" className="hidden text-[11px] uppercase tracking-[0.14em] text-ink sm:block">
            <span className="link-underline">Shop all</span>
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
          {related.map((item, index) => (
            <Reveal key={item.id} delay={index * 60}>
              <ProductCard product={item} settings={settings} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
