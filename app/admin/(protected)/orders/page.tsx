import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { listOrders, type OrderStatus } from "@/lib/repositories/orders";
import { formatDate, formatMoney, cn } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import OrderStatusChip from "@/components/account/OrderStatusChip";

export const metadata = { title: "Orders" };

const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Packed", value: "packed" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const params = await searchParams;
  const status = (params.status as OrderStatus | "all") ?? "all";
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 25;
  const { orders, total } = listOrders({ status, q: params.q, limit, offset: (page - 1) * limit });
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Orders"
      description="Every order, its payment state and its place in fulfilment. Cancelling or refunding an order returns its stock to the catalogue automatically."
    >
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/admin/orders" : `/admin/orders?status=${tab.value}`}
            className={cn(
              "chip transition-colors",
              status === tab.value ? "border-ink bg-ink text-canvas" : "hover:border-ink hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-2" action="/admin/orders">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Order, name or email"
            className="input-boxed !w-56 !py-1.5 !text-[12px]"
            aria-label="Search orders"
          />
          <button type="submit" className="btn btn-sm btn-outline">
            Search
          </button>
        </form>
      </div>

      <div className="mt-4 border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
            {total} {total === 1 ? "order" : "orders"}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
            Page {page} of {pageCount}
          </p>
        </div>
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12.5px] text-muted">No orders match this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap font-medium">{order.orderNumber}</td>
                    <td>
                      <span className="block text-ink">{order.customerName}</span>
                      <span className="text-[11px] text-muted">{order.email}</span>
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDate(order.createdAt)}</td>
                    <td className="tabular-nums text-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="whitespace-nowrap capitalize text-muted">{order.paymentMethod.replace("_", " ")}</td>
                    <td>
                      <OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">{money(order.totalCents)}</td>
                    <td className="text-right">
                      <Link href={`/admin/orders/${order.id}`} className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <Link
              href={`/admin/orders?status=${status}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}&page=${Math.max(1, page - 1)}`}
              className={cn("text-[10.5px] uppercase tracking-[0.1em]", page === 1 ? "pointer-events-none text-muted/40" : "text-muted hover:text-ink")}
            >
              Previous
            </Link>
            <Link
              href={`/admin/orders?status=${status}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}&page=${Math.min(pageCount, page + 1)}`}
              className={cn("text-[10.5px] uppercase tracking-[0.1em]", page === pageCount ? "pointer-events-none text-muted/40" : "text-muted hover:text-ink")}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
