import Image from "next/image";
import Link from "next/link";
import { type Product } from "@/lib/repositories/catalog";
import { cn, formatMoney, percentOff } from "@/lib/utils";
import { CARD_RATIO } from "@/lib/theme";
import type { StoreSettings } from "@/lib/settings";
import Stars from "@/components/ui/Stars";
import QuickAdd from "@/components/shop/QuickAdd";

export function quickAddOptions(product: Product) {
  const variants = (product.variants ?? []).filter((variant) => variant.isActive);
  if (!variants.length) return [];
  const firstColor = variants[0]?.colorName ?? null;
  const sameColor = variants.filter((variant) => (variant.colorName ?? null) === firstColor);
  const seen = new Set<string>();
  return sameColor
    .filter((variant) => {
      const key = variant.size ?? "one";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((variant) => ({
      label: variant.size ?? "One size",
      variantId: variant.stock > 0 ? variant.id : null,
      stock: variant.stock,
    }));
}

export default function ProductCard({
  product,
  settings,
  priority = false,
  className,
}: {
  product: Product;
  settings: StoreSettings;
  priority?: boolean;
  className?: string;
}) {
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const discount = percentOff(product.priceCents, product.compareAtCents);
  const image = product.images[0];
  const secondImage = product.images[1];
  const colors = Array.from(
    new Map(
      (product.variants ?? [])
        .filter((variant) => variant.colorName)
        .map((variant) => [variant.colorName, variant.colorHex]),
    ).entries(),
  );
  const soldOut = product.stock <= 0;
  const options = quickAddOptions(product);

  return (
    <article className={cn("group relative", className)}>
      <div
        className="media-frame media-hover relative"
        style={{ aspectRatio: CARD_RATIO[settings.theme.productCardRatio] }}
      >
        <Link href={`/products/${product.slug}`} className="block h-full w-full" aria-label={product.name}>
          {image ? (
            <>
              <Image
                src={image}
                alt={product.name}
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={cn("object-cover", secondImage && "group-hover:opacity-0")}
              />
              {secondImage && (
                <Image
                  src={secondImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="grid h-full w-full place-items-center text-[11px] uppercase tracking-eyebrow text-muted">
              Image coming soon
            </span>
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount > 0 && (
            <span className="bg-accent px-2 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-accent-ink">
              −{discount}%
            </span>
          )}
          {product.badge && (
            <span className="bg-canvas/95 px-2 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink">
              {product.badge}
            </span>
          )}
          {soldOut && (
            <span className="bg-ink px-2 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-canvas">
              Sold out
            </span>
          )}
        </div>

        {!soldOut && options.length > 0 && (
          <div className="absolute inset-x-3 bottom-3 hidden justify-center sm:flex">
            <div className="border border-line/80 bg-canvas/95 px-2 py-1.5 shadow-panel backdrop-blur-sm">
              <QuickAdd options={options} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium leading-snug">
            <Link href={`/products/${product.slug}`} className="transition-colors hover:text-accent">
              {product.name}
            </Link>
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {colors.length > 0 && (
              <span className="flex items-center gap-1">
                {colors.slice(0, 4).map(([name, hex]) => (
                  <span
                    key={name}
                    title={name ?? ""}
                    className="h-2 w-2 rounded-full ring-1 ring-inset ring-ink/15"
                    style={{ backgroundColor: hex ?? "#ccc" }}
                  />
                ))}
              </span>
            )}
            <span className="truncate text-[11px] text-muted">
              {product.variants?.find((variant) => variant.colorName)?.colorName ?? product.subtitle ?? ""}
            </span>
          </div>
          {product.reviewCount > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-muted">
              <Stars rating={product.rating} size={10} className="text-ink" />
              <span className="tabular-nums">{product.rating.toFixed(1)}</span>
              <span className="text-muted/60">({product.reviewCount})</span>
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[12.5px] tabular-nums">{money(product.priceCents)}</p>
          {product.compareAtCents && product.compareAtCents > product.priceCents && (
            <p className="mt-0.5 text-[11px] tabular-nums text-muted line-through">
              {money(product.compareAtCents)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
