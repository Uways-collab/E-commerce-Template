"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
import { placeOrderAction, type CheckoutState } from "@/app/actions/checkout";
import { computeAmounts, type TaxConfig } from "@/lib/totals";
import { cn, formatMoney } from "@/lib/utils";
import type { DeliveryMethod } from "@/lib/settings";
import DeliveryPicker from "@/components/cart/DeliveryPicker";
import CouponForm from "@/components/cart/CouponForm";

export interface CheckoutLine {
  name: string;
  image: string | null;
  size: string | null;
  colorName: string | null;
  quantity: number;
  lineTotalCents: number;
}

export interface PaymentOption {
  id: string;
  label: string;
  description: string;
}

const initialState: CheckoutState | null = null;

export default function CheckoutForm({
  lines,
  subtotalCents,
  discountCents,
  couponCode,
  couponFreeShipping,
  deliveryMethods,
  defaultDelivery,
  paymentOptions,
  tax,
  currency,
  locale,
  thresholdCents,
  freeShippingRemainingCents,
  defaults,
  signedIn,
  bankDetails,
  codNote,
}: {
  lines: CheckoutLine[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  couponFreeShipping: boolean;
  deliveryMethods: DeliveryMethod[];
  defaultDelivery: string;
  paymentOptions: PaymentOption[];
  tax: TaxConfig;
  currency: string;
  locale: string;
  thresholdCents: number;
  freeShippingRemainingCents: number;
  defaults: {
    email: string;
    phone: string;
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  signedIn: boolean;
  bankDetails: { bankName: string; accountName: string; accountNumber: string; instructions: string };
  codNote: string;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initialState);
  const [delivery, setDelivery] = useState(defaultDelivery);
  const [payment, setPayment] = useState(paymentOptions[0]?.id ?? "bank_transfer");

  const money = (value: number) => formatMoney(value, currency, locale);
  const method = deliveryMethods.find((entry) => entry.id === delivery) ?? deliveryMethods[0];

  const totals = useMemo(() => {
    const afterDiscount = Math.max(0, subtotalCents - discountCents);
    const qualifies = (thresholdCents > 0 && afterDiscount >= thresholdCents) || couponFreeShipping;
    const shippingCents = qualifies ? 0 : (method?.priceCents ?? 0);
    const amounts = computeAmounts({
      subtotalCents,
      discountCents,
      shippingCents,
      tax,
    });
    return { ...amounts, shippingCents };
  }, [subtotalCents, discountCents, couponFreeShipping, method, tax, thresholdCents]);

  const fieldError = (key: string) => state?.fieldErrors?.[key];

  const inputClass = (key: string) =>
    cn("input-boxed", fieldError(key) && "border-danger focus:border-danger");

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
      <div>
        {state?.error && (
          <div className="mb-6 flex items-start gap-3 border border-danger/30 bg-danger/[0.04] px-4 py-3">
            <AlertCircle size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="text-[12.5px] text-danger">{state.error}</p>
              {state.orderNumber && (
                <Link
                  href={`/checkout/confirmation/${state.orderNumber}`}
                  className="mt-1 inline-block text-[12px] underline underline-offset-4 text-ink"
                >
                  View order {state.orderNumber}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 01 — Contact */}
        <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] tabular-nums text-muted">01</span>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Contact</h2>
            {!signedIn && (
              <Link
                href="/account/login?next=/checkout"
                className="ml-auto text-[11px] text-muted underline underline-offset-4 hover:text-ink"
              >
                Already have an account? Sign in
              </Link>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={defaults.email}
                className={inputClass("email")}
                placeholder="you@example.com"
              />
              {fieldError("email") && <p className="mt-1 text-[11px] text-danger">{fieldError("email")}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                defaultValue={defaults.phone}
                className={inputClass("phone")}
                placeholder="+234 801 234 5678"
              />
              {fieldError("phone") && <p className="mt-1 text-[11px] text-danger">{fieldError("phone")}</p>}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Order updates and tracking go to this email. We never share your details.
          </p>
        </section>

        {/* 02 — Delivery address */}
        <section className="border-t border-line py-6">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] tabular-nums text-muted">02</span>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Delivery address</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="label">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                defaultValue={defaults.fullName}
                className={inputClass("fullName")}
              />
              {fieldError("fullName") && <p className="mt-1 text-[11px] text-danger">{fieldError("fullName")}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line1" className="label">
                Street address
              </label>
              <input
                id="line1"
                name="line1"
                required
                autoComplete="address-line1"
                defaultValue={defaults.line1}
                className={inputClass("line1")}
              />
              {fieldError("line1") && <p className="mt-1 text-[11px] text-danger">{fieldError("line1")}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line2" className="label">
                Apartment, suite, landmark (optional)
              </label>
              <input id="line2" name="line2" autoComplete="address-line2" defaultValue={defaults.line2} className="input-boxed" />
            </div>
            <div>
              <label htmlFor="city" className="label">
                City
              </label>
              <input
                id="city"
                name="city"
                required
                autoComplete="address-level2"
                defaultValue={defaults.city}
                className={inputClass("city")}
              />
              {fieldError("city") && <p className="mt-1 text-[11px] text-danger">{fieldError("city")}</p>}
            </div>
            <div>
              <label htmlFor="state" className="label">
                State / region
              </label>
              <input id="state" name="state" autoComplete="address-level1" defaultValue={defaults.state} className="input-boxed" />
            </div>
            <div>
              <label htmlFor="postalCode" className="label">
                Postal code
              </label>
              <input
                id="postalCode"
                name="postalCode"
                autoComplete="postal-code"
                defaultValue={defaults.postalCode}
                className="input-boxed"
              />
            </div>
            <div>
              <label htmlFor="country" className="label">
                Country
              </label>
              <input
                id="country"
                name="country"
                required
                autoComplete="country-name"
                defaultValue={defaults.country}
                className={inputClass("country")}
              />
              {fieldError("country") && <p className="mt-1 text-[11px] text-danger">{fieldError("country")}</p>}
            </div>
          </div>
        </section>

        {/* 03 — Delivery method */}
        <section className="border-t border-line py-6">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] tabular-nums text-muted">03</span>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Delivery</h2>
          </div>
          <div className="mt-4">
            <DeliveryPicker
              methods={deliveryMethods}
              activeId={delivery}
              currency={currency}
              locale={locale}
              name="deliveryMethod"
              onChange={setDelivery}
            />
          </div>
          {fieldError("deliveryMethod") && (
            <p className="mt-1 text-[11px] text-danger">{fieldError("deliveryMethod")}</p>
          )}
        </section>

        {/* 04 — Payment */}
        <section className="border-t border-line py-6">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] tabular-nums text-muted">04</span>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Payment</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
              <Lock size={11} strokeWidth={1.6} /> Encrypted
            </span>
          </div>

          {paymentOptions.length === 0 && (
            <p className="mt-4 border border-warning/30 bg-warning/[0.06] px-4 py-3 text-[12.5px] text-warning">
              No payment method is enabled yet. An administrator needs to enable one in Store Settings.
            </p>
          )}

          <div className="mt-4 space-y-2">
            {paymentOptions.map((option) => {
              const active = payment === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 border px-3.5 py-3.5 transition-colors",
                    active ? "border-ink bg-ink/[0.02]" : "border-line hover:border-ink/40",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    checked={active}
                    onChange={() => setPayment(option.id)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-ink"
                  />
                  <span>
                    <span className="block text-[12.5px] font-medium">{option.label}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {payment === "bank_transfer" && (
            <div className="mt-3 border border-line bg-surface px-4 py-3.5 text-[12px]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Transfer to</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                  <dt className="text-[10.5px] text-muted">Bank</dt>
                  <dd>{bankDetails.bankName}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] text-muted">Account name</dt>
                  <dd>{bankDetails.accountName}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] text-muted">Account number</dt>
                  <dd className="tabular-nums">{bankDetails.accountNumber}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] text-muted">Reference</dt>
                  <dd>Your order number (issued next)</dd>
                </div>
              </dl>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">{bankDetails.instructions}</p>
            </div>
          )}

          {payment === "cod" && (
            <p className="mt-3 border border-line bg-surface px-4 py-3 text-[11.5px] leading-relaxed text-muted">
              {codNote}
            </p>
          )}

          {payment === "paystack" || payment === "flutterwave" ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              You’ll be redirected to {payment === "paystack" ? "Paystack" : "Flutterwave"} to pay securely. Your order is
              only marked as paid once the provider confirms the transaction — never before.
            </p>
          ) : null}

          {fieldError("paymentMethod") && <p className="mt-1 text-[11px] text-danger">{fieldError("paymentMethod")}</p>}
        </section>

        {/* 05 — Notes */}
        <section className="border-t border-line py-6">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] tabular-nums text-muted">05</span>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Notes (optional)</h2>
          </div>
          <textarea
            name="notes"
            rows={3}
            maxLength={600}
            placeholder="Delivery instructions, gift note, preferred call time…"
            className="input-boxed mt-4 resize-none"
          />
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] text-muted">
            <input type="checkbox" name="marketingOptIn" value="true" className="checkbox mt-0.5" />
            Email me when new pieces arrive and restocks happen.
          </label>
        </section>

        <div className="border-t border-line pt-6 lg:hidden">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-eyebrow text-muted">Total</span>
            <span className="font-display text-[26px] tabular-nums">{money(totals.totalCents)}</span>
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary mt-4 w-full">
            {pending ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-2 text-center text-[10.5px] text-muted">
            Taxes included. You’ll receive an email confirmation.
          </p>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-surface">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-[21px] leading-none">Your order</h2>
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
              {lines.reduce((sum, line) => sum + line.quantity, 0)} pieces
            </span>
          </div>

          <ul className="max-h-[280px] divide-y divide-line/70 overflow-y-auto px-5">
            {lines.map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex gap-3 py-3.5">
                <div className="relative h-[64px] w-[50px] shrink-0 overflow-hidden bg-line/40">
                  {line.image && (
                    <Image src={line.image} alt="" width={100} height={128} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] text-canvas">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{line.name}</p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted">
                    {[line.colorName, line.size].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] tabular-nums">{money(line.lineTotalCents)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-4 border-t border-line px-5 py-4">
            <CouponForm appliedCode={couponCode} />

            <dl className="space-y-1.5 text-[12.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{money(subtotalCents)}</dd>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-accent">
                  <dt>Discount{couponCode ? ` (${couponCode})` : ""}</dt>
                  <dd className="tabular-nums">−{money(discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">{method?.label ?? "Delivery"}</dt>
                <dd className="tabular-nums">{totals.shippingCents === 0 ? "Free" : money(totals.shippingCents)}</dd>
              </div>
              {tax.enabled && (
                <div className="flex justify-between text-muted">
                  <dt>
                    {tax.inclusive ? "Included tax" : "Tax"} ({tax.ratePercent}%)
                  </dt>
                  <dd className="tabular-nums">{money(totals.taxCents)}</dd>
                </div>
              )}
              {freeShippingRemainingCents > 0 && (
                <p className="pt-1 text-[11px] leading-relaxed text-muted">
                  Add {money(freeShippingRemainingCents)} more for complimentary delivery.
                </p>
              )}
            </dl>

            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[10.5px] uppercase tracking-eyebrow text-muted">Total</span>
              <span className="font-display text-[26px] tabular-nums">{money(totals.totalCents)}</span>
            </div>

            <button type="submit" disabled={pending} className="btn btn-primary hidden w-full lg:inline-flex">
              {pending ? "Placing order…" : "Place order"}
              {!pending && <ArrowRight size={14} strokeWidth={1.6} />}
            </button>

            <p className="text-center text-[10px] uppercase tracking-[0.12em] text-muted">
              Secure checkout · 30-day returns
            </p>
          </div>
        </div>

        <div className="mt-3 border border-line px-4 py-3 text-[11px] leading-relaxed text-muted">
          Need help? Email{" "}
          <a href="mailto:hello@productprohub.com" className="underline underline-offset-4 hover:text-ink">
            our client care team
          </a>{" "}
          — replies within one business day.
        </div>
      </aside>
    </form>
  );
}
