"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useTransition } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { removeLineAction, setQuantityAction } from "@/app/actions/cart";
import { cn } from "@/lib/utils";

export default function CartDrawer({ freeShippingThresholdLabel }: { freeShippingThresholdLabel: string }) {
  const { isOpen, closeCart, snapshot, loading, refresh, itemCount, notify } = useCart();
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLElement | null>(null);

  // Modal behaviour: Escape closes, focus moves into the panel, Tab cycles
  // inside it, and focus returns to the trigger when the drawer closes.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const changeQuantity = (variantId: string, quantity: number) => {
    startTransition(async () => {
      const result = await setQuantityAction(variantId, quantity);
      await refresh();
      if (!result.ok) notify(result.message, "error");
    });
  };

  const removeLine = (variantId: string, name: string) => {
    startTransition(async () => {
      await removeLineAction(variantId);
      await refresh();
      notify(`${name} removed from your basket.`);
    });
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping basket">
      <button
        type="button"
        aria-label="Close basket"
        onClick={closeCart}
        className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]"
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] animate-slide-in flex-col bg-canvas shadow-lift"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[22px] leading-none">Your basket</h2>
            <span className="text-[11px] uppercase tracking-eyebrow text-muted">
              {itemCount} {itemCount === 1 ? "piece" : "pieces"}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex h-9 w-9 items-center justify-center text-ink transition-colors hover:text-accent"
            aria-label="Close basket"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </header>

        {snapshot && snapshot.totals.freeShippingRemainingLabel && (
          <div className="border-b border-line px-5 py-3">
            <p className="text-[11px] text-muted">{snapshot.totals.freeShippingRemainingLabel}</p>
            <div className="mt-2 h-[3px] w-full bg-line">
              <div
                className="h-full bg-accent transition-[width] duration-700 ease-editorial"
                style={{ width: `${Math.round(snapshot.totals.freeShippingProgress * 100)}%` }}
              />
            </div>
          </div>
        )}
        {snapshot && !snapshot.totals.freeShippingRemainingLabel && (
          <div className="border-b border-line bg-accent/[0.06] px-5 py-2.5">
            <p className="text-[11px] text-accent">Complimentary delivery over {freeShippingThresholdLabel}</p>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto px-5", pending || loading ? "opacity-70" : "")}>
          {!snapshot && loading && (
            <div className="space-y-4 py-6">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex gap-4">
                  <div className="h-24 w-20 animate-pulse bg-line/60" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-2/3 animate-pulse bg-line/60" />
                    <div className="h-3 w-1/3 animate-pulse bg-line/40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {snapshot && snapshot.lines.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <ShoppingBag size={28} strokeWidth={1.25} className="text-muted" />
              <p className="font-display text-[22px]">Your basket is empty</p>
              <p className="max-w-[240px] text-[13px] text-muted">
                Pieces are made in small runs. Start with the linen edit — it moves fastest.
              </p>
              <Link href="/shop" onClick={closeCart} className="btn btn-sm btn-primary mt-2">
                Explore the shop
              </Link>
            </div>
          )}

          {snapshot?.lines.map((line) => (
            <div key={line.variantId} className="flex gap-4 border-b border-line/70 py-5 last:border-b-0">
              <Link
                href={`/products/${line.slug}`}
                onClick={closeCart}
                className="media-frame block h-[104px] w-[82px] shrink-0"
              >
                {line.image ? (
                  <Image src={line.image} alt={line.name} width={164} height={208} className="h-full w-full object-cover" />
                ) : (
                  <span className="block h-full w-full bg-line/50" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={closeCart}
                    className="text-[13px] font-medium leading-snug hover:text-accent"
                  >
                    {line.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeLine(line.variantId, line.name)}
                    className="text-muted transition-colors hover:text-danger"
                    aria-label={`Remove ${line.name}`}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">
                  {[line.colorName, line.size].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div className="flex items-center border border-line">
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.variantId, line.quantity - 1)}
                      className="grid h-8 w-8 place-items-center text-ink transition-colors hover:bg-ink/5"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} strokeWidth={1.6} />
                    </button>
                    <span className="w-8 text-center text-[12px] tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(line.variantId, line.quantity + 1)}
                      disabled={line.quantity >= line.stock}
                      className="grid h-8 w-8 place-items-center text-ink transition-colors hover:bg-ink/5 disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} strokeWidth={1.6} />
                    </button>
                  </div>
                  <span className="text-[13px] tabular-nums">{line.lineTotalLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {snapshot && snapshot.lines.length > 0 && (
          <footer className="border-t border-line bg-surface/60 px-5 py-5">
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="tabular-nums text-ink">{snapshot.totals.subtotalLabel}</span>
              </div>
              {snapshot.totals.discountLabel && (
                <div className="flex justify-between text-accent">
                  <span>Discount {snapshot.totals.couponCode ? `(${snapshot.totals.couponCode})` : ""}</span>
                  <span className="tabular-nums">{snapshot.totals.discountLabel}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>{snapshot.totals.deliveryLabel}</span>
                <span className="tabular-nums text-ink">{snapshot.totals.shippingLabel}</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[11px] uppercase tracking-eyebrow text-muted">Total</span>
              <span className="font-display text-[24px] tabular-nums">{snapshot.totals.totalLabel}</span>
            </div>
            <div className="mt-4 grid gap-2">
              <Link href="/checkout" onClick={closeCart} className="btn btn-primary w-full">
                Checkout
              </Link>
              <Link href="/cart" onClick={closeCart} className="btn btn-outline w-full">
                View basket
              </Link>
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted">
              Secure checkout · 30-day returns
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}
