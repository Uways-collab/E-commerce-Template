import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Lock, RefreshCw, Truck } from "lucide-react";
import { getCart } from "@/lib/cart";
import { getSettings, providerConfigured } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";
import { deliveryEstimate } from "@/lib/pricing";
import CouponForm from "@/components/cart/CouponForm";
import DeliveryPicker from "@/components/cart/DeliveryPicker";
import { CartQuantity, RemoveLineButton } from "@/components/cart/CartLineControls";

export const metadata: Metadata = {
  title: "Your basket",
  description: "Review the pieces in your basket, apply a discount code and choose delivery.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ delivery?: string }>;

export default async function CartPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const cart = await getCart(params.delivery);
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const methods = cart.deliveryOptions;
  const activeMethod = methods.find((method) => method.id === cart.deliveryMethodId) ?? null;
  const enabledPayments = settings.commerce.payments.enabled.filter((method) => providerConfigured(method));

  if (!cart.lines.length) {
    return (
      <div className="page-shell py-20 lg:py-28">
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow">Your basket</p>
          <h1 className="display-section mt-3">Nothing here yet</h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
            Pieces are made in small runs and move quickly. Start with the linen edit — or browse everything we make.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/shop" className="btn btn-primary">
              Shop all pieces
            </Link>
            <Link href="/collections/women" className="btn btn-outline">
              The linen edit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell pb-20 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Basket</p>
          <h1 className="display-section mt-3">Your selection</h1>
        </div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="tabular-nums text-ink">{cart.itemCount}</span>{" "}
          {cart.itemCount === 1 ? "piece" : "pieces"}
        </p>
      </header>

      {cart.removed.length > 0 && (
        <div className="mt-5 border border-warning/30 bg-warning/[0.06] px-4 py-3">
          {cart.removed.map((item, index) => (
            <p key={`${item.name}-${index}`} className="text-[12px] text-warning">
              {item.name} — {item.reason}
            </p>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
        <section aria-label="Basket items">
          <ul className="divide-y divide-line border-y border-line">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-4 py-5 sm:gap-6">
                <Link href={`/products/${line.product.slug}`} className="media-frame block h-[150px] w-[118px] shrink-0">
                  {line.product.images[0] ? (
                    <Image
                      src={line.product.images[0]}
                      alt={line.product.name}
                      width={236}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="block h-full w-full bg-line/50" />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-[14px] font-medium leading-snug">
                        <Link href={`/products/${line.product.slug}`} className="hover:text-accent">
                          {line.product.name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-[11.5px] uppercase tracking-[0.08em] text-muted">
                        {[line.colorName, line.size].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1.5 text-[11.5px] text-muted">{money(line.unitPriceCents)} each</p>
                      {line.stock <= settings.commerce.lowStockThreshold && (
                        <p className="mt-1.5 text-[11px] text-warning">Only {line.stock} left in this option</p>
                      )}
                    </div>
                    <p className="shrink-0 text-[13.5px] tabular-nums">{money(line.lineTotalCents)}</p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                    <CartQuantity variantId={line.variantId} quantity={line.quantity} stock={line.stock} />
                    <RemoveLineButton variantId={line.variantId} name={line.product.name} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-2">
              <Truck size={14} strokeWidth={1.5} /> Dispatched within 24 hours
            </span>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={13} strokeWidth={1.5} /> 30-day returns
            </span>
            <span className="inline-flex items-center gap-2">
              <Lock size={13} strokeWidth={1.5} /> Secure checkout
            </span>
          </div>
        </section>

        <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-[21px] leading-none">Order summary</h2>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink">Discount</p>
                <CouponForm appliedCode={cart.totals.appliedCoupon?.code ?? null} />
                {cart.couponError && <p className="mt-1.5 text-[11.5px] text-danger">{cart.couponError}</p>}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink">Delivery</p>
                <DeliveryPicker
                  methods={methods}
                  activeId={cart.deliveryMethodId}
                  currency={settings.locale.currency}
                  locale={settings.locale.locale}
                />
                {activeMethod && (
                  <p className="mt-2 text-[11px] text-muted">
                    Estimated arrival {deliveryEstimate(activeMethod, settings.locale.locale)}
                  </p>
                )}
              </div>

              <dl className="space-y-1.5 border-t border-line pt-4 text-[12.5px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="tabular-nums">{money(cart.totals.subtotalCents)}</dd>
                </div>
                {cart.totals.discountCents > 0 && (
                  <div className="flex justify-between text-accent">
                    <dt>Discount {cart.totals.appliedCoupon ? `(${cart.totals.appliedCoupon.code})` : ""}</dt>
                    <dd className="tabular-nums">−{money(cart.totals.discountCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted">{cart.totals.deliveryLabel}</dt>
                  <dd className="tabular-nums">
                    {cart.totals.shippingCents === 0 ? "Free" : money(cart.totals.shippingCents)}
                  </dd>
                </div>
                {settings.commerce.tax.enabled && (
                  <div className="flex justify-between text-muted">
                    <dt>
                      {settings.commerce.tax.label} ({settings.commerce.tax.ratePercent}%
                      {settings.commerce.tax.inclusive ? ", included" : ""})
                    </dt>
                    <dd className="tabular-nums">{money(cart.totals.taxCents)}</dd>
                  </div>
                )}
              </dl>

              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-[11px] uppercase tracking-eyebrow text-muted">Total</span>
                <span className="font-display text-[26px] tabular-nums">{money(cart.totals.totalCents)}</span>
              </div>

              {cart.totals.freeShippingRemainingCents > 0 && (
                <p className="text-[11px] leading-relaxed text-muted">
                  Add {money(cart.totals.freeShippingRemainingCents)} more for complimentary delivery.
                </p>
              )}

              <Link href="/checkout" className="btn btn-primary w-full">
                Continue to checkout <ArrowRight size={14} strokeWidth={1.6} />
              </Link>

              <div className="text-center">
                <Link href="/shop" className="text-[10.5px] uppercase tracking-[0.12em] text-muted hover:text-ink">
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-line px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">We accept</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed">
              {enabledPayments.length
                ? enabledPayments
                    .map((method) =>
                      method === "paystack"
                        ? "Paystack (card, bank, USSD)"
                        : method === "flutterwave"
                          ? "Flutterwave (card, bank, mobile money)"
                          : method === "bank_transfer"
                            ? "Bank transfer"
                            : "Cash on delivery",
                    )
                    .join(" · ")
                : "Contact the atelier to arrange payment"}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
