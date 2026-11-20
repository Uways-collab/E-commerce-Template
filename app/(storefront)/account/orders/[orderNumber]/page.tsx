import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Copy, Truck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/repositories/orders";
import { getSettings } from "@/lib/settings";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { deliveryEstimate } from "@/lib/pricing";
import AccountShell from "@/components/account/AccountShell";
import OrderStatusChip from "@/components/account/OrderStatusChip";
import { reorderAction } from "@/app/actions/orders";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const [{ orderNumber }, user, settings] = await Promise.all([params, requireUser(), getSettings()]);
  const order = getOrderByNumber(orderNumber, { userId: user.id });
  if (!order) notFound();

  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const method = settings.commerce.deliveryMethods.find((entry) => entry.id === order.deliveryMethod);
  const stages = ["pending", "processing", "packed", "shipped", "delivered"];
  const currentStage = stages.indexOf(order.status);

  return (
    <AccountShell
      user={user}
      active="/account/orders"
      title={order.orderNumber}
      description={`Placed ${formatDateTime(order.createdAt)} · ${order.deliveryLabel}`}
      action={<OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-line bg-surface p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Total</p>
          <p className="mt-1.5 font-display text-[22px] leading-none tabular-nums">{money(order.totalCents)}</p>
        </div>
        <div className="border border-line bg-surface p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Payment</p>
          <p className="mt-1.5 text-[13px] capitalize">{order.paymentStatus === "paid" ? "Paid" : order.paymentStatus}</p>
          <p className="text-[11px] text-muted">{order.paymentMethod.replace("_", " ")}</p>
        </div>
        <div className="border border-line bg-surface p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Estimated arrival</p>
          <p className="mt-1.5 text-[13px]">{deliveryEstimate(method ?? null, settings.locale.locale) || "—"}</p>
          <p className="text-[11px] text-muted">{order.deliveryLabel}</p>
        </div>
      </div>

      {order.status !== "cancelled" && order.status !== "refunded" && (
        <section className="mt-8 border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Tracking</h2>
            {order.trackingNumber ? (
              <p className="flex items-center gap-2 text-[12px]">
                <Truck size={14} strokeWidth={1.5} className="text-muted" />
                {order.trackingCarrier} · <span className="tabular-nums">{order.trackingNumber}</span>
              </p>
            ) : (
              <p className="text-[11.5px] text-muted">Tracking is added as soon as your parcel is scanned.</p>
            )}
          </div>
          <ol className="mt-5 grid gap-4 sm:grid-cols-5">
            {stages.map((stage, index) => {
              const done = currentStage >= index;
              return (
                <li key={stage} className="relative">
                  <div className={`h-[3px] w-full ${done ? "bg-ink" : "bg-line"}`} />
                  <p className={`mt-2 text-[10.5px] uppercase tracking-[0.1em] ${done ? "text-ink" : "text-muted/60"}`}>
                    {stage === "pending" ? "Placed" : stage}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Pieces</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <div className="relative h-[96px] w-[76px] shrink-0 overflow-hidden bg-line/40">
                {item.image && (
                  <Image src={item.image} alt="" width={152} height={192} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${item.slug}`} className="text-[13px] font-medium hover:text-accent">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted">Qty {item.quantity}</p>
                  </div>
                  <p className="text-[12.5px] tabular-nums">{money(item.lineTotalCents)}</p>
                </div>
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
              {settings.commerce.tax.label} ({settings.commerce.tax.ratePercent}%)
            </dt>
            <dd className="tabular-nums">{money(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-[14px]">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Delivering to</h2>
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
            {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}
            <br />
            {order.shippingAddress.country}
          </address>
        </div>
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Timeline</h2>
          <ol className="mt-3 space-y-2.5 border-l border-line pl-4">
            {order.timeline.map((event, index) => (
              <li key={`${event.at}-${index}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-ink" />
                <p className="text-[12px]">{event.label}</p>
                <p className="text-[10.5px] text-muted">{formatDateTime(event.at)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <form action={reorderAction}>
          <input type="hidden" name="orderNumber" value={order.orderNumber} />
          <button type="submit" className="btn btn-sm btn-outline">
            Buy these again
          </button>
        </form>
        <Link href="/contact" className="btn btn-sm btn-ghost">
          Need help with this order?
        </Link>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-muted">
          <Copy size={11} strokeWidth={1.6} /> {order.orderNumber}
        </span>
      </div>
    </AccountShell>
  );
}
