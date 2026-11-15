"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, Truck } from "lucide-react";
import type { Variant } from "@/lib/repositories/catalog";
import { useCart } from "@/components/cart/CartProvider";
import { addToCartAction, buyNowAction } from "@/app/actions/cart";
import { cn } from "@/lib/utils";

export default function ProductPurchase({
  basePriceCents,
  compareAtCents,
  variants,
  currency,
  locale,
  lowStockThreshold,
  showStockCount,
  deliveryNote,
  maxQuantity,
}: {
  basePriceCents: number;
  compareAtCents: number | null;
  variants: Variant[];
  currency: string;
  locale: string;
  lowStockThreshold: number;
  showStockCount: boolean;
  deliveryNote: string;
  maxQuantity: number;
}) {
  const { openCart, setItemCount, notify } = useCart();
  const [pending, startTransition] = useTransition();

  const colors = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const variant of variants) {
      if (variant.colorName && !map.has(variant.colorName)) map.set(variant.colorName, variant.colorHex);
    }
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [variants]);

  const sizes = useMemo(() => {
    const first = colors[0]?.name;
    const relevant = variants.filter((variant) => !first || variant.colorName === first);
    const map = new Map<string, Variant>();
    for (const variant of relevant) map.set(variant.size ?? "One size", variant);
    return Array.from(map.entries()).map(([label, variant]) => ({ label, variant }));
  }, [variants, colors]);

  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(() => {
    const firstAvailable = variants.find((variant) => variant.stock > 0);
    return firstAvailable?.size ?? sizes[0]?.label ?? null;
  });
  const [quantity, setQuantity] = useState(1);

  const colorSizes = useMemo(() => {
    const relevant = variants.filter((variant) => !color || variant.colorName === color);
    const map = new Map<string, Variant>();
    for (const variant of relevant) map.set(variant.size ?? "One size", variant);
    return Array.from(map.entries()).map(([label, variant]) => ({ label, variant }));
  }, [variants, color]);

  const variant = colorSizes.find((entry) => entry.label === size)?.variant ?? null;
  const unitPrice = basePriceCents + (variant?.priceDeltaCents ?? 0);
  const stock = variant?.stock ?? 0;
  const soldOut = stock <= 0;
  const cappedQuantity = Math.min(quantity, Math.max(1, Math.min(maxQuantity, stock)));

  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value / 100);

  const discount =
    compareAtCents && compareAtCents > unitPrice
      ? Math.round(((compareAtCents - unitPrice) / compareAtCents) * 100)
      : 0;

  const add = () => {
    if (!variant) {
      notify("Choose a size first.", "error");
      return;
    }
    startTransition(async () => {
      const result = await addToCartAction(variant.id, cappedQuantity);
      if (result.ok) {
        setItemCount(result.itemCount);
        notify(result.message);
        openCart();
      } else {
        notify(result.message, "error");
      }
    });
  };

  const buyNow = () => {
    if (!variant) {
      notify("Choose a size first.", "error");
      return;
    }
    startTransition(async () => {
      const result = await buyNowAction(variant.id, cappedQuantity);
      if (!result.ok) notify(result.message, "error");
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[19px] tabular-nums">{money(unitPrice)}</span>
        {compareAtCents && compareAtCents > unitPrice && (
          <>
            <span className="text-[14px] tabular-nums text-muted line-through">{money(compareAtCents)}</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-accent">−{discount}%</span>
          </>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-muted">Tax included</span>
      </div>

      {colors.length > 1 && (
        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink">
              Colour — <span className="text-muted">{color}</span>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((entry) => {
              const available = variants.some(
                (variantItem) => variantItem.colorName === entry.name && variantItem.stock > 0,
              );
              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => {
                    setColor(entry.name);
                    const firstForColor = variants.find(
                      (variantItem) => variantItem.colorName === entry.name && variantItem.stock > 0,
                    );
                    if (firstForColor?.size) setSize(firstForColor.size);
                  }}
                  className={cn(
                    "group relative flex items-center gap-2 border px-2.5 py-1.5 text-[11px] transition-colors",
                    color === entry.name ? "border-ink" : "border-line hover:border-ink/40",
                  )}
                  aria-pressed={color === entry.name}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/15"
                    style={{ backgroundColor: entry.hex ?? "#ccc" }}
                  />
                  {entry.name}
                  {!available && <span className="text-[9px] uppercase text-muted">(sold out)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink">Size</p>
          <Link href="/pages/size-guide" className="text-[10.5px] text-muted underline underline-offset-4 hover:text-ink">
            Size guide
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {colorSizes.map((entry) => {
            const isDisabled = entry.variant.stock <= 0;
            return (
              <button
                key={entry.label}
                type="button"
                onClick={() => {
                  setSize(entry.label);
                  setQuantity(1);
                }}
                disabled={isDisabled}
                className={cn(
                  "relative border py-2.5 text-[11.5px] uppercase tracking-[0.08em] transition-colors",
                  size === entry.label
                    ? "border-ink bg-ink text-canvas"
                    : "border-line text-ink hover:border-ink",
                  isDisabled && "cursor-not-allowed border-line/70 text-muted/40 line-through hover:border-line/70",
                )}
                aria-pressed={size === entry.label}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11.5px]">
          {soldOut ? (
            <span className="text-danger">Sold out in this option</span>
          ) : stock <= lowStockThreshold ? (
            <span className="text-warning">
              Only {showStockCount ? stock : "a few"} left — made in small runs
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-success">
              <span className="status-dot bg-success" /> In stock, ready to dispatch
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-stretch gap-3">
        <div className="flex items-center border border-line">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid h-12 w-10 place-items-center transition-colors hover:bg-ink/5"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
          >
            <Minus size={13} strokeWidth={1.6} />
          </button>
          <span className="w-8 text-center text-[13px] tabular-nums" aria-live="polite">
            {cappedQuantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(Math.min(maxQuantity, Math.max(stock, 1)), value + 1))}
            className="grid h-12 w-10 place-items-center transition-colors hover:bg-ink/5"
            aria-label="Increase quantity"
            disabled={cappedQuantity >= Math.min(maxQuantity, stock)}
          >
            <Plus size={13} strokeWidth={1.6} />
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={pending || soldOut}
          className="btn btn-primary h-12 flex-1"
        >
          {soldOut ? "Sold out" : pending ? "Adding…" : "Add to basket"}
        </button>
      </div>

      <button
        type="button"
        onClick={buyNow}
        disabled={pending || soldOut}
        className="btn btn-outline mt-2 h-12 w-full"
      >
        Buy it now
      </button>

      <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 text-[11.5px] leading-relaxed text-muted">
        <Truck size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink" />
        <p>{deliveryNote}</p>
      </div>
    </div>
  );
}
