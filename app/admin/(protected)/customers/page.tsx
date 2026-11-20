import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { listCustomers } from "@/lib/repositories/marketing";
import { formatDate, formatMoney } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const { q } = await searchParams;
  const customers = listCustomers({ q });
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);
  const totalLtv = customers.reduce((sum, customer) => sum + customer.lifetimeValueCents, 0);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Customers"
      description="Accounts created at checkout or in the client area, with lifetime value computed from paid orders."
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="border border-line bg-surface px-4 py-3">
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Accounts</p>
          <p className="mt-1 font-display text-[22px] leading-none tabular-nums">{customers.length}</p>
        </div>
        <div className="border border-line bg-surface px-4 py-3">
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Combined lifetime value</p>
          <p className="mt-1 font-display text-[22px] leading-none tabular-nums">{money(totalLtv)}</p>
        </div>
        <form action="/admin/customers" className="ml-auto flex items-center gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or email"
            className="input-boxed !w-56 !py-1.5 !text-[12px]"
            aria-label="Search customers"
          />
          <button type="submit" className="btn btn-sm btn-outline">
            Search
          </button>
        </form>
      </div>

      <div className="mt-4 border border-line bg-surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Lifetime value</th>
              <th>Last order</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:text-accent">
                    {customer.name}
                  </Link>
                  <span className="block text-[10.5px] text-muted">{customer.email}</span>
                </td>
                <td className="text-muted">{customer.phone ?? "—"}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(customer.createdAt)}</td>
                <td className="tabular-nums">{customer.orderCount}</td>
                <td className="whitespace-nowrap tabular-nums">{money(customer.lifetimeValueCents)}</td>
                <td className="whitespace-nowrap text-muted">
                  {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                </td>
                <td className="text-right">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted">
                  No customers match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
