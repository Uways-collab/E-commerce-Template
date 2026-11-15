import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { adminContext } from "@/lib/admin";
import { dashboardStats } from "@/lib/repositories/stats";
import { formatDate, formatMoney } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import { MiniBar, RevenueChart, StatCard } from "@/components/admin/Charts";
import OrderStatusChip from "@/components/account/OrderStatusChip";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const { user, settings, groups } = await adminContext();
  const stats = dashboardStats();
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  const delta =
    stats.revenuePrev30Cents > 0
      ? ((stats.revenue30Cents - stats.revenuePrev30Cents) / stats.revenuePrev30Cents) * 100
      : stats.revenue30Cents > 0
        ? 100
        : 0;

  const maxPayments = Math.max(...stats.paymentBreakdown.map((row) => row.count), 1);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Store overview"
      description="Live figures from the database — revenue counts only orders the payment provider (or an administrator) has confirmed as paid."
      action={
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="btn btn-sm btn-primary">
            New product
          </Link>
          <Link href="/admin/orders" className="btn btn-sm btn-outline">
            Manage orders
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30 days)"
          value={money(stats.revenue30Cents)}
          delta={{ value: delta }}
          sub="vs previous 30"
        />
        <StatCard label="Orders (30 days)" value={String(stats.orders30)} sub={`${stats.ordersTotal} all time`} />
        <StatCard label="Average order value" value={money(stats.aovCents)} sub={`${stats.paidOrders} paid orders`} />
        <StatCard
          label="Customers"
          value={String(stats.customers)}
          sub={`+${stats.newCustomers30} in 30 days`}
          tone="accent"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Revenue — last 14 days</h2>
            <span className="text-[10.5px] text-muted">Total {money(stats.series.reduce((sum, point) => sum + point.revenueCents, 0))}</span>
          </div>
          <div className="mt-3">
            <RevenueChart series={stats.series} currency={settings.locale.currency} locale={settings.locale.locale} />
          </div>
        </section>

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Payment mix</h2>
          <div className="mt-4">
            <MiniBar
              max={maxPayments}
              items={stats.paymentBreakdown.map((row) => ({
                label: row.method,
                value: row.count,
                hint: `${row.count} · ${money(row.revenueCents)}`,
              }))}
            />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[11px]">
            <div>
              <dt className="text-muted">Unit volume</dt>
              <dd className="mt-0.5 text-[13px] tabular-nums">{stats.unitsSold} pieces</dd>
            </div>
            <div>
              <dt className="text-muted">Subscribers</dt>
              <dd className="mt-0.5 text-[13px] tabular-nums">{stats.subscribers}</dd>
            </div>
            <div>
              <dt className="text-muted">Low stock</dt>
              <dd className="mt-0.5 text-[13px] tabular-nums text-warning">{stats.lowStockCount} variants</dd>
            </div>
            <div>
              <dt className="text-muted">Out of stock</dt>
              <dd className="mt-0.5 text-[13px] tabular-nums text-danger">{stats.outOfStockCount} variants</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Recent orders</h2>
            <Link href="/admin/orders" className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="px-4 py-8 text-[12px] text-muted">No orders yet — they will appear here the moment one is placed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-accent">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="text-muted">{order.customerName}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(order.createdAt)}</td>
                      <td className="text-right tabular-nums">{money(order.totalCents)}</td>
                      <td>
                        <OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <section className="border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Top pieces</h2>
              <Link href="/admin/products" className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                Catalogue
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line/70">
              {stats.topProducts.length === 0 && <li className="py-4 text-[12px] text-muted">No paid orders yet.</li>}
              {stats.topProducts.map((product, index) => (
                <li key={product.slug} className="flex items-center gap-3 py-2.5">
                  <span className="text-[10px] tabular-nums text-muted">0{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px]">{product.name}</p>
                    <p className="text-[10.5px] text-muted">{product.units} sold</p>
                  </div>
                  <span className="text-[11.5px] tabular-nums">{money(product.revenueCents)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Restock alerts</h2>
              <Link href="/admin/inventory" className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                Inventory
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {stats.lowStock.length === 0 && <li className="text-[12px] text-muted">Everything is comfortably stocked.</li>}
              {stats.lowStock.map((variant) => (
                <li key={variant.sku} className="flex items-center justify-between gap-3 text-[11.5px]">
                  <span className="min-w-0">
                    <span className="block truncate">{variant.productName}</span>
                    <span className="text-[10.5px] text-muted">
                      {[variant.colorName, variant.size].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${variant.stock === 0 ? "text-danger" : "text-warning"}`}
                  >
                    {variant.stock} left
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/admin/settings"
            className="flex items-center justify-between border border-line bg-ink px-4 py-3.5 text-canvas transition-colors hover:bg-ink/90"
          >
            <span className="text-[11px] uppercase tracking-[0.12em]">Customise the store</span>
            <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
