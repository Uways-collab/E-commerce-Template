import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrderByNumber } from "@/lib/repositories/orders";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { hasOrderAccess } from "@/lib/order-access";
import { retryPaymentAction } from "@/app/actions/payments";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Complete payment", robots: { index: false, follow: false } };

export default async function RetryPaymentPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const [{ order: orderNumber }, settings, user] = await Promise.all([searchParams, getSettings(), getSessionUser()]);
  if (!orderNumber) notFound();

  const order = getOrderByNumber(orderNumber);
  if (!order) notFound();

  const isOwner = Boolean(user && order.userId === user.id);
  const capability = await hasOrderAccess(order.orderNumber);
  if (!isOwner && !capability) notFound();
  if (order.paymentStatus === "paid") redirect(`/checkout/confirmation/${order.orderNumber}`);

  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const provider = order.paymentMethod === "paystack" ? "Paystack" : "Flutterwave";

  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-lg border border-line bg-surface p-8">
        <p className="eyebrow">Payment pending</p>
        <h1 className="display-section mt-3">Complete your payment</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Order <span className="text-ink">{order.orderNumber}</span> is reserved for you. Pay{" "}
          <span className="text-ink">{money(order.totalCents)}</span> with {provider} to release it for dispatch.
        </p>

        {order.paymentStatus === "failed" && order.paymentNote && (
          <p className="mt-4 border border-danger/30 bg-danger/[0.04] px-3 py-2 text-[12px] text-danger">
            {order.paymentNote}
          </p>
        )}

        <form action={retryPaymentAction} className="mt-6">
          <input type="hidden" name="order" value={order.orderNumber} />
          <button type="submit" className="btn btn-primary w-full">
            Pay {money(order.totalCents)} with {provider}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
          <Link href={`/checkout/confirmation/${order.orderNumber}`} className="hover:text-ink">
            Back to order
          </Link>
          <Link href="/contact" className="hover:text-ink">
            Need help?
          </Link>
        </div>
      </div>
    </div>
  );
}
