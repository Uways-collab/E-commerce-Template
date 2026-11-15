import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { adminContext } from "@/lib/admin";
import { getOrderById } from "@/lib/repositories/orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import OrderStatusChip from "@/components/account/OrderStatusChip";
import { ManualPaymentForm, StatusForm, TrackingForm } from "@/components/admin/OrderActions";

export const metadata = { title: "Order detail" };

const STATUS_OPTIONS = ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"];

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { user, settings, groups }] = await Promise.all([params, adminContext()]);
  const order = getOrderById(id);
  if (!order) notFound();

  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const manualEligible =
    order.paymentStatus !== "paid" && !["paystack", "flutterwave"].includes(order.paymentMethod);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title={order.orderNumber}
      description={`Placed ${formatDateTime(order.createdAt)} · ${order.deliveryLabel} · ${order.paymentMethod.replace("_", " ")}`}
      action={
        <div className="flex items-center gap-2">
          <OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />
          <Link
            href={`/checkout/confirmation/${order.orderNumber}`}
            target="_blank"
            className="btn btn-sm btn-outline"
          >
            Client view
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <section className="border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em]">
              Items
            </h2>
            <ul className="divide-y divide-line/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-[64px] w-[50px] shrink-0 overflow-hidden bg-line/40">
                    {item.image && (
                      <Image src={item.image} alt="" width={100} height={128} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.slug}`} className="text-[12.5px] font-medium hover:text-accent">
                      {item.name}
                    </Link>
                    <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted">
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-[10.5px] text-muted">
                      {money(item.unitPriceCents)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-[12px] tabular-nums">{money(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-line px-4 py-3 text-[12px]">
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
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">{money(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd className="tabular-nums">{money(order.taxCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 text-[13px]">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.totalCents)}</dd>
              </div>
            </dl>
          </section>

          <section className="border border-line bg-surface p-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Fulfilment</h2>
            <div className="mt-3">
              <StatusForm orderId={order.id} status={order.status} options={STATUS_OPTIONS} />
            </div>
            <div className="mt-4">
              <TrackingForm
                orderId={order.id}
                trackingNumber={order.trackingNumber}
                carrier={order.trackingCarrier}
              />
            </div>
          </section>

          <section className="border border-line bg-surface p-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Timeline</h2>
            <ol className="mt-3 space-y-2.5 border-l border-line pl-4">
              {order.timeline.map((event, index) => (
                <li key={`${event.at}-${index}`} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-ink" />
                  <p className="text-[12px]">{event.label}</p>
                  <p className="text-[10.5px] text-muted">
                    {formatDateTime(event.at)}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-3">
          <section className="border border-line bg-surface p-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Customer</h2>
            <p className="mt-2 text-[12.5px]">{order.customerName}</p>
            <p className="text-[11.5px] text-muted">{order.email}</p>
            <p className="text-[11.5px] text-muted">{order.phone}</p>
            <address className="mt-3 border-t border-line pt-3 text-[11.5px] not-italic leading-relaxed text-muted">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              <br />
              {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                .filter(Boolean)
                .join(", ")}
              <br />
              {order.shippingAddress.country}
            </address>
            {order.notes && (
              <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed">
                <span className="text-muted">Client note: </span>
                {order.notes}
              </p>
            )}
          </section>

          <section className="border border-line bg-surface p-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Payment</h2>
            <dl className="mt-2 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Method</dt>
                <dd className="capitalize">{order.paymentMethod.replace("_", " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd className="capitalize">{order.paymentStatus}</dd>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Reference</dt>
                  <dd className="truncate text-right">{order.paymentReference}</dd>
                </div>
              )}
              {order.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-muted">Paid</dt>
                  <dd>{formatDateTime(order.paidAt)}</dd>
                </div>
              )}
            </dl>

            {order.paymentNote && (
              <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-muted">{order.paymentNote}</p>
            )}

            {manualEligible && <ManualPaymentForm orderId={order.id} />}

            {["paystack", "flutterwave"].includes(order.paymentMethod) && order.paymentStatus !== "paid" && (
              <p className="mt-3 border-t border-line pt-2 text-[10.5px] leading-relaxed text-muted">
                This order awaits confirmation from {order.paymentMethod === "paystack" ? "Paystack" : "Flutterwave"}.
                The webhook and the server-side verification callback will mark it paid automatically.
              </p>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
