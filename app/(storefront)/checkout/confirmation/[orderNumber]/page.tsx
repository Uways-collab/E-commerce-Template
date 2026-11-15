import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, Clock, Copy, Package, Truck } from "lucide-react";
import { getOrderByNumber } from "@/lib/repositories/orders";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { hasOrderAccess } from "@/lib/order-access";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { deliveryEstimate } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

type Params = Promise<{ orderNumber: string }>;
type SearchParams = Promise<{ payment?: string }>;

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ orderNumber }, query, settings, user] = await Promise.all([
    params,
    searchParams,
    getSettings(),
    getSessionUser(),
  ]);

  const order = getOrderByNumber(orderNumber);
  if (!order) notFound();

  const isOwner = Boolean(user && order.userId === user.id);
  const hasCapability = await hasOrderAccess(order.orderNumber);
  if (!isOwner && !hasCapability) notFound();

  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const method = settings.commerce.deliveryMethods.find((entry) => entry.id === order.deliveryMethod);
  const bank = settings.commerce.payments.bankTransfer;
  const paid = order.paymentStatus === "paid";
  const failed = order.paymentStatus === "failed";
  const awaitingTransfer = order.paymentMethod === "bank_transfer" && !paid;
  const retryable = !paid && (order.paymentMethod === "paystack" || order.paymentMethod === "flutterwave");
  const notice = query.payment;

  return (
    <div className="page-shell pb-20 pt-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full ${
              paid ? "bg-success/10 text-success" : failed ? "bg-danger/10 text-danger" : "bg-ink/[0.06] text-ink"
            }`}
          >
            {paid ? <Check size={17} strokeWidth={2} /> : <Clock size={17} strokeWidth={1.8} />}
          </span>
          <p className="eyebrow">
            {paid ? "Payment confirmed" : failed ? "Payment not completed" : "Order received"}
          </p>
        </div>

        <h1 className="display-section mt-4">
          {paid ? "Thank you — your order is confirmed." : "Thank you. Your order is saved."}
        </h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted">
          {paid
            ? `We’ve emailed a receipt to ${order.email}. Your pieces are being prepared and you’ll receive tracking as soon as they ship.`
            : awaitingTransfer
              ? `We’ve reserved your pieces and emailed the details to ${order.email}. Your order ships as soon as the transfer is confirmed — usually within one business day.`
              : order.paymentMethod === "cod"
                ? `Your order is reserved. Pay the courier when it arrives — we’ll email ${order.email} with tracking as soon as it ships.`
                : `Your order is saved but payment has not been confirmed. Complete payment to release it for dispatch.`}
        </p>

        {notice === "unconfirmed" && !paid && (
          <div className="mt-6 border border-warning/30 bg-warning/[0.05] px-4 py-3 text-[12.5px] text-ink">
            We couldn’t reach the payment provider to confirm this payment yet. Your order is saved and nothing has
            been charged twice — refresh this page in a moment, or contact us and we’ll check it manually.
          </div>
        )}
        {notice === "failed" && !paid && (
          <div className="mt-6 border border-danger/30 bg-danger/[0.04] px-4 py-3 text-[12.5px] text-danger">
            The payment was not completed, so your order has not been marked as paid and will not ship yet.
          </div>
        )}
        {failed && (
          <div className="mt-6 border border-danger/30 bg-danger/[0.04] px-4 py-3 text-[12.5px] text-danger">
            {order.paymentNote ?? "The last payment attempt did not complete."}
          </div>
        )}

        <div className="mt-8 grid gap-6 border border-line bg-surface sm:grid-cols-2">
          <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Order number</p>
            <p className="mt-1.5 font-display text-[24px] leading-none">{order.orderNumber}</p>
            <p className="mt-2 text-[11.5px] text-muted">Placed {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Total</p>
            <p className="mt-1.5 font-display text-[24px] leading-none tabular-nums">{money(order.totalCents)}</p>
            <p className="mt-2 text-[11.5px] text-muted">
              {order.paymentStatus === "paid"
                ? "Paid"
                : order.paymentMethod === "cod"
                  ? "Due on delivery"
                  : "Awaiting payment"}{" "}
              · {order.deliveryLabel}
            </p>
          </div>
        </div>

        {awaitingTransfer && (
          <div className="mt-4 border border-accent/25 bg-accent/[0.04] p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-accent">Complete your transfer</p>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Bank</dt>
                <dd className="text-[13px]">{bank.bankName}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Account name</dt>
                <dd className="text-[13px]">{bank.accountName}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Account number</dt>
                <dd className="flex items-center gap-2 text-[13px] tabular-nums">
                  {bank.accountNumber}
                  <Copy size={12} strokeWidth={1.6} className="text-muted" />
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Amount</dt>
                <dd className="text-[13px] tabular-nums">{money(order.totalCents)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Reference</dt>
                <dd className="text-[13px]">{order.orderNumber}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">{bank.instructions}</p>
            <p className="mt-2 text-[12px] text-muted">
              Send proof of payment to{" "}
              <a href={`mailto:${settings.contact.email}`} className="underline underline-offset-4 text-ink">
                {settings.contact.email}
              </a>{" "}
              quoting your order number.
            </p>
          </div>
        )}

        {retryable && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-4">
            <p className="text-[12.5px] text-muted">
              Your pieces are reserved while you complete payment.
            </p>
            <Link href={`/checkout/retry?order=${order.orderNumber}`} className="btn btn-sm btn-primary">
              Retry payment
            </Link>
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Your pieces</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <div className="relative h-[96px] w-[76px] shrink-0 overflow-hidden bg-line/40">
                  {item.image && (
                    <Image src={item.image} alt="" width={152} height={192} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium">{item.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-[11.5px] text-muted">Qty {item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-[12.5px] tabular-nums">{money(item.lineTotalCents)}</p>
                  </div>
                  <Link
                    href={`/products/${item.slug}`}
                    className="mt-auto w-fit text-[10.5px] uppercase tracking-[0.12em] text-muted hover:text-ink"
                  >
                    View piece
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 text-[12.5px]">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{money(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-accent">
                <dt>Discount {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                <dd className="tabular-nums">−{money(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">{order.deliveryLabel}</dt>
              <dd className="tabular-nums">{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                {settings.commerce.tax.label} ({settings.commerce.tax.ratePercent}%
                {settings.commerce.tax.inclusive ? " included" : ""})
              </dt>
              <dd className="tabular-nums">{money(order.taxCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-[14px]">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Delivery</h2>
            <address className="mt-3 text-[12.5px] not-italic leading-relaxed text-muted">
              {order.shippingAddress.fullName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              )}
              <br />
              {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                .filter(Boolean)
                .join(", ")}
              <br />
              {order.shippingAddress.country}
              <br />
              <span className="text-ink">{order.phone}</span>
            </address>
            {method && (
              <p className="mt-3 text-[11.5px] text-muted">
                {method.label} · estimated arrival {deliveryEstimate(method, settings.locale.locale)}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">What happens next</h2>
            <ol className="mt-3 space-y-3">
              {[
                { icon: Check, title: "Order received", body: "We’ve reserved your pieces at the atelier." },
                { icon: Package, title: "Packed by hand", body: "Wrapped in recycled tissue within 24 hours." },
                { icon: Truck, title: "On its way", body: "Tracking lands in your inbox when it ships." },
              ].map((step) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink">
                    <step.icon size={12} strokeWidth={1.7} />
                  </span>
                  <span>
                    <span className="block text-[12px] font-medium">{step.title}</span>
                    <span className="block text-[11.5px] text-muted">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Order timeline</h2>
          <ol className="mt-4 space-y-3 border-l border-line pl-4">
            {order.timeline.map((event, index) => (
              <li key={`${event.at}-${index}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-ink" />
                <p className="text-[12.5px]">{event.label}</p>
                <p className="text-[10.5px] text-muted">
                  {formatDateTime(event.at)}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 flex flex-col gap-2 sm:flex-row">
          <Link href="/shop" className="btn btn-primary">
            Continue shopping
          </Link>
          <Link href="/account/orders" className="btn btn-outline">
            Track this order
          </Link>
        </div>
      </div>
    </div>
  );
}
