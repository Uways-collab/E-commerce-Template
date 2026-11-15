import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Package, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/repositories/orders";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/utils";
import AccountShell from "@/components/account/AccountShell";
import OrderStatusChip from "@/components/account/OrderStatusChip";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const { orders } = listOrders({ userId: user.id, limit: 5 });
  const all = listOrders({ userId: user.id, limit: 100 }).orders;
  const spent = all.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalCents, 0);
  const addresses = db().all<{ id: string; label: string; line1: string; city: string; is_default: number }>(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC",
    [user.id],
  );
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  return (
    <AccountShell
      user={user}
      active="/account"
      title={`Hello, ${user.name.split(" ")[0]}`}
      description="A quiet record of everything you’ve ordered, saved and tracked with the atelier."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Package, label: "Orders placed", value: String(all.length) },
          { icon: Wallet, label: "Lifetime spend", value: money(spent) },
          { icon: MapPin, label: "Saved addresses", value: String(addresses.length) },
        ].map((stat) => (
          <div key={stat.label} className="border border-line bg-surface p-4">
            <stat.icon size={16} strokeWidth={1.5} className="text-muted" />
            <p className="mt-3 font-display text-[26px] leading-none tabular-nums">{stat.value}</p>
            <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Recent orders</h2>
          <Link href="/account/orders" className="text-[10.5px] uppercase tracking-[0.12em] text-muted hover:text-ink">
            View all
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-4 border border-line bg-surface p-8 text-center">
            <p className="font-display text-[22px]">No orders yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[12.5px] text-muted">
              When you place an order it will appear here with live tracking from the atelier.
            </p>
            <Link href="/shop" className="btn btn-sm btn-primary mt-5">
              Start with the linen edit
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="group flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-[13px] font-medium">{order.orderNumber}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                  <OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] tabular-nums">{money(order.totalCents)}</span>
                    <ArrowRight
                      size={14}
                      strokeWidth={1.6}
                      className="text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Default address</h2>
          <Link href="/account/addresses" className="text-[10.5px] uppercase tracking-[0.12em] text-muted hover:text-ink">
            Manage
          </Link>
        </div>
        {addresses[0] ? (
          <div className="mt-4 border border-line bg-surface p-5 text-[12.5px] leading-relaxed text-muted">
            <p className="text-ink">{addresses[0].label}</p>
            <p className="mt-1">{addresses[0].line1}</p>
            <p>{addresses[0].city}</p>
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-line p-5 text-[12.5px] text-muted">
            No saved address yet.{" "}
            <Link href="/account/addresses" className="text-ink underline underline-offset-4">
              Add one
            </Link>{" "}
            to check out faster next time.
          </div>
        )}
      </section>
    </AccountShell>
  );
}
