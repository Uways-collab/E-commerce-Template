import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/repositories/orders";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import AccountShell from "@/components/account/AccountShell";
import OrderStatusChip from "@/components/account/OrderStatusChip";

export const metadata: Metadata = { title: "Orders & tracking", robots: { index: false, follow: false } };

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [user, { status }] = await Promise.all([requireUser("/account/orders"), searchParams]);
  const settings = await getSettings();
  const filter = status && status !== "all" ? (status as "processing" | "shipped" | "delivered") : "all";
  const { orders, total } = listOrders({ userId: user.id, status: filter, limit: 50 });
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  const tabs = [
    { label: "All", value: "all" },
    { label: "Processing", value: "processing" },
    { label: "Shipped", value: "shipped" },
    { label: "Delivered", value: "delivered" },
  ];

  return (
    <AccountShell
      user={user}
      active="/account/orders"
      title="Orders & tracking"
      description="Every order, its payment status and where it is in the atelier."
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/account/orders" : `/account/orders?status=${tab.value}`}
            className={`chip transition-colors ${
              (status ?? "all") === tab.value ? "border-ink bg-ink text-canvas" : "hover:border-ink hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-[11px] uppercase tracking-[0.12em] text-muted">
          {total} {total === 1 ? "order" : "orders"}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 border border-line bg-surface p-10 text-center">
          <p className="font-display text-[22px]">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[12.5px] text-muted">
            Orders in this status will appear here with live tracking updates.
          </p>
          <Link href="/shop" className="btn btn-sm btn-outline mt-5">
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="border border-line bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <p className="text-[12.5px] font-medium">{order.orderNumber}</p>
                  <p className="text-[11.5px] text-muted">{formatDate(order.createdAt)}</p>
                </div>
                <OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />
              </div>

              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="flex gap-2">
                  {order.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="relative h-[64px] w-[50px] overflow-hidden bg-line/40">
                      {item.image && (
                        <Image src={item.image} alt="" width={100} height={128} className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-muted">
                  {order.items.length} {order.items.length === 1 ? "piece" : "pieces"} ·{" "}
                  <span className="text-ink tabular-nums">{money(order.totalCents)}</span>
                </p>
                {order.trackingNumber && (
                  <p className="text-[11px] text-muted">
                    {order.trackingCarrier} · {order.trackingNumber}
                  </p>
                )}
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-ink"
                >
                  View order <ArrowRight size={12} strokeWidth={1.6} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
