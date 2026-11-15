import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type {
  CategoriesSection,
  EditorialSection,
  MarqueeSection,
  NewsletterSection,
  ProductGridSection,
  StoreSettings,
  StorySection,
  TestimonialsSection,
} from "@/lib/settings";
import type { Category, Product } from "@/lib/repositories/catalog";
import type { Review } from "@/lib/repositories/marketing";
import { listProducts } from "@/lib/repositories/catalog";
import ProductCard from "@/components/shop/ProductCard";
import NewsletterForm from "@/components/site/NewsletterForm";
import Stars from "@/components/ui/Stars";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */

export function MarqueeSectionView({ section }: { section: MarqueeSection }) {
  const items = section.items.filter(Boolean);
  if (!items.length) return null;
  const track = [...items, ...items];

  return (
    <section className="overflow-hidden border-y border-line bg-surface/50 py-4">
      <div className="group flex w-max animate-marquee items-center gap-12 whitespace-nowrap hover:[animation-play-state:paused] motion-reduce:animate-none">
        {track.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center gap-12 text-[10.5px] uppercase tracking-[0.18em] text-muted"
            aria-hidden={index >= items.length}
          >
            {item}
            <span className="h-1 w-1 rotate-45 bg-accent/60" aria-hidden="true" />
          </span>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function SectionHeader({
  eyebrow,
  heading,
  body,
  ctaLabel,
  ctaHref,
  className,
}: {
  eyebrow?: string;
  heading: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="display-section mt-3 text-balance">{heading}</h2>
        {body && <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">{body}</p>}
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="group inline-flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink"
        >
          <span className="link-underline">{ctaLabel}</span>
          <ArrowUpRight
            size={14}
            strokeWidth={1.6}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function CategoriesSectionView({
  section,
  categories,
}: {
  section: CategoriesSection;
  categories: Category[];
}) {
  const visible = categories.slice(0, section.limit || 6);
  if (!visible.length) return null;

  return (
    <section className="page-shell py-section">
      <Reveal>
        <SectionHeader eyebrow={section.eyebrow} heading={section.heading} body={section.body} />
      </Reveal>
      <div
        className={cn(
          "mt-10 grid gap-x-5 gap-y-8",
          visible.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {visible.map((category, index) => (
          <Reveal key={category.id} delay={index * 70}>
            <Link href={`/collections/${category.slug}`} className="group block">
              <div className="media-frame media-hover relative aspect-[4/5]">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-line/40 text-[11px] uppercase tracking-eyebrow text-muted">
                    {category.name}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/45 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-canvas">
                  <div>
                    <h3 className="font-display text-[24px] leading-none">{category.name}</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-canvas/75">
                      {category.productCount ?? 0} pieces
                    </p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-canvas/40 transition-all duration-300 group-hover:bg-canvas group-hover:text-ink">
                    <ArrowUpRight size={15} strokeWidth={1.5} />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function ProductGridSectionView({
  section,
  settings,
  overrideProducts,
}: {
  section: ProductGridSection;
  settings: StoreSettings;
  overrideProducts?: Product[];
}) {
  const products =
    overrideProducts ??
    listProducts({
      limit: section.limit || 4,
      sort: section.mode === "new" ? "newest" : section.mode === "featured" ? "featured" : "popular",
      newOnly: section.mode === "new",
      featuredOnly: section.mode === "featured",
    }).products;

  if (!products.length) return null;

  return (
    <section className="page-shell py-section">
      <Reveal>
        <SectionHeader
          eyebrow={section.eyebrow}
          heading={section.heading}
          body={section.body}
          ctaLabel={section.ctaLabel}
          ctaHref={section.ctaHref}
        />
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
        {products.map((product, index) => (
          <Reveal key={product.id} delay={Math.min(index * 60, 240)}>
            <ProductCard product={product} settings={settings} priority={index < 2} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function EditorialSectionView({ section }: { section: EditorialSection }) {
  const isInk = section.tone === "ink";
  const isAccent = section.tone === "accent";

  const toneClasses = isInk
    ? "bg-ink text-canvas"
    : isAccent
      ? "bg-accent text-accent-ink"
      : "bg-surface text-ink";
  const bodyClasses = isInk || isAccent ? "text-current/75" : "text-muted";

  if (section.layout === "banner") {
    return (
      <section className="page-shell py-section">
        <Reveal>
          <div className="relative overflow-hidden">
            <div className="relative h-[clamp(360px,44vw,540px)] w-full bg-line/40">
              {section.image && (
                <Image
                  src={section.image}
                  alt={section.heading}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/35 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-xl px-6 text-canvas sm:px-12 lg:px-16">
                  <p className="eyebrow text-canvas/70">{section.eyebrow}</p>
                  <h2 className="display-section mt-3 text-balance">{section.heading}</h2>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-canvas/80">{section.body}</p>
                  <Link href={section.ctaHref} className="btn btn-on-ink mt-7">
                    {section.ctaLabel}
                    <ArrowRight size={14} strokeWidth={1.6} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    );
  }

  return (
    <section className="page-shell py-section">
      <Reveal>
        <div className={cn("grid overflow-hidden lg:grid-cols-2", toneClasses)}>
          <div className="flex flex-col justify-center gap-6 px-7 py-14 sm:px-12 lg:px-14 lg:py-20">
            <div>
              <p className={cn("eyebrow", isInk || isAccent ? "text-current/65" : "")}>{section.eyebrow}</p>
              <h2 className="display-section mt-3 max-w-[16ch] text-balance">{section.heading}</h2>
            </div>
            <p className={cn("max-w-md text-[13.5px] leading-relaxed", bodyClasses)}>{section.body}</p>
            <div>
              <Link
                href={section.ctaHref}
                className={cn("btn", isInk || isAccent ? "btn-on-ink" : "btn-primary")}
              >
                {section.ctaLabel}
                <ArrowRight size={14} strokeWidth={1.6} />
              </Link>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-px bg-current/10 lg:grid-cols-1">
            <div className="relative aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[520px]">
              {section.image ? (
                <Image
                  src={section.image}
                  alt={section.heading}
                  fill
                  sizes="(max-width: 1024px) 50vw, 45vw"
                  className="object-cover"
                />
              ) : (
                <span className="block h-full w-full bg-line/40" />
              )}
            </div>
            {section.secondaryImage && (
              <div className="relative aspect-[4/5] lg:absolute lg:bottom-6 lg:left-6 lg:aspect-square lg:w-40">
                <Image
                  src={section.secondaryImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 20vw"
                  className="border border-canvas/20 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function StorySectionView({ section }: { section: StorySection }) {
  return (
    <section className="border-y border-line bg-surface/40">
      <div className="page-shell grid gap-10 py-section lg:grid-cols-2 lg:items-center lg:gap-20">
        <Reveal>
          <div className="relative">
            <div className="media-frame relative aspect-[4/5]">
              {section.image ? (
                <Image
                  src={section.image}
                  alt={section.heading}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              ) : (
                <span className="block h-full w-full bg-line/40" />
              )}
            </div>
            <div className="absolute -bottom-5 -right-3 hidden max-w-[220px] border border-line bg-canvas p-4 sm:block lg:-right-8">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Since 2019</p>
              <p className="mt-1.5 font-display text-[19px] leading-tight">
                Three workshops. One standard.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <p className="eyebrow">{section.eyebrow}</p>
          <h2 className="display-section mt-3 max-w-[18ch] text-balance">{section.heading}</h2>
          <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-muted">{section.body}</p>
          {section.bullets.length > 0 && (
            <ul className="mt-7 space-y-0 border-t border-line">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 border-b border-line py-3.5 text-[13px]">
                  <Check size={14} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href={section.ctaHref} className="btn btn-outline mt-8">
            {section.ctaLabel}
            <ArrowRight size={14} strokeWidth={1.6} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function TestimonialsSectionView({
  section,
  reviews,
}: {
  section: TestimonialsSection;
  reviews: Review[];
}) {
  if (!reviews.length) return null;
  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) / Math.max(reviews.length, 1);

  return (
    <section className="page-shell py-section">
      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2 className="display-section mt-3 text-balance">{section.heading}</h2>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">{section.body}</p>
          </div>
          <div className="flex items-center gap-3">
            <Stars rating={average} size={15} className="text-ink" />
            <span className="text-[12px] text-muted">
              <span className="tabular-nums text-ink">{average.toFixed(1)}</span> average from verified buyers
            </span>
          </div>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.slice(0, 6).map((review, index) => (
          <Reveal key={review.id} delay={index * 60}>
            <figure className="flex h-full flex-col justify-between border border-line bg-surface p-6">
              <div>
                <Stars rating={review.rating} size={12} className="text-ink" />
                {review.title && (
                  <figcaption className="mt-3 font-display text-[19px] leading-snug">{review.title}</figcaption>
                )}
                <blockquote className="mt-2 text-[13px] leading-relaxed text-muted">
                  “{review.body}”
                </blockquote>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
                <span className="text-[11px] uppercase tracking-[0.1em]">{review.author}</span>
                {review.productSlug && (
                  <Link
                    href={`/products/${review.productSlug}`}
                    className="text-[10.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink"
                  >
                    {review.productName}
                  </Link>
                )}
              </div>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function NewsletterSectionView({ section }: { section: NewsletterSection }) {
  return (
    <section className="border-t border-line bg-ink text-canvas">
      <div className="page-shell grid gap-8 py-16 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-20">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-canvas/60">{section.eyebrow}</p>
          <h2 className="display-section mt-3 max-w-[16ch] text-balance">{section.heading}</h2>
        </div>
        <div>
          <p className="max-w-md text-[13px] leading-relaxed text-canvas/70">{section.body}</p>
          <div className="mt-6 max-w-md [&_input]:text-canvas [&_input::placeholder]:text-canvas/40 [&>form>div]:border-canvas/30">
            <NewsletterForm source="homepage" variant="inline" buttonLabel="Join" />
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-canvas/45">{section.note}</p>
        </div>
      </div>
    </section>
  );
}
