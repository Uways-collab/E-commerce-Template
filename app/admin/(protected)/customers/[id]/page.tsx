import Link from "next/link";
import { notFound } from "next/navigation";
import { adminContext } from "@/lib/admin";
import { getCustomer } from "@/lib/repositories/marketing";
import { listOrders } from "@/lib/repositories/orders";
import { formatDate, formatMoney } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import OrderStatusChip from "@/components/account/OrderStatusChip";

export const metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { user, settings, groups }] = await Promise.all([params, adminContext()]);
  const customer = getCustomer(id);
  if (!customer) notFound();
  const { orders } = listOrders({ userId: id, limit: 50 });
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title={customer.name}
      description={`${customer.email} · joined ${formatDate(customer.createdAt)}`}
      action={
        <Link href={`mailto:${customer.email}`} className="btn btn-sm btn-outline">
          Email customer
        </Link>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <section className="border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em]">
            Orders ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <p className="px-4 py-8 text-[12.5px] text-muted">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-accent">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-muted">{formatDate(order.createdAt)}</td>
                      <td>
                        <OrderStatusChip status={order.status} paymentStatus={order.paymentStatus} />
                      </td>
                      <td className="text-right tabular-nums">{money(order.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <section className="border border-line bg-surface p-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Summary</h2>
            <dl className="mt-2 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Orders</dt>
                <dd className="tabular-nums">{customer.orderCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Lifetime value</dt>
                <dd className="tabular-nums">{money(customer.lifetimeValueCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Phone</dt>
                <dd>{customer.phone ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="border border-line bg-surface p-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Addresses</h2>
            <ul className="mt-2 space-y-3">
              {customer.addresses.map((address) => (
                <li key={String(address.id)} className="border-b border-line/70 pb-2 text-[11.5px] leading-relaxed text-muted last:border-b-0">
                  <p className="text-ink">
                    {String(address.label)}
                    {Number(address.is_default) === 1 && <span className="ml-2 text-[9.5px] uppercase text-accent">Default</span>}
                  </p>
                  <p>{String(address.line1)}</p>
                  <p>{[address.city, address.state].filter(Boolean).map(String).join(", ")}</p>
                  <p>{String(address.country)}</p>
                </li>
              ))}
              {customer.addresses.length === 0 && <li className="text-[11.5px] text-muted">No saved addresses.</li>}
            </ul>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
