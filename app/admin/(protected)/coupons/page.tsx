import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { listCoupons } from "@/lib/repositories/marketing";
import { formatDate, formatMoney } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import CouponForm from "@/components/admin/CouponForm";
import { deleteCouponAction, toggleCouponAction } from "@/app/actions/admin-marketing";

export const metadata = { title: "Coupons" };

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const { edit } = await searchParams;
  const coupons = listCoupons();
  const editing = edit ? coupons.find((coupon) => coupon.id === edit) : undefined;
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Coupons"
      description="Discount codes are validated server-side at cart and checkout — expired, over-used or below-minimum codes are rejected before an order is created."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="border border-line bg-surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Reward</th>
                <th>Minimum</th>
                <th>Used</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <p className="font-medium tracking-[0.04em]">{coupon.code}</p>
                    <p className="text-[10.5px] text-muted">{coupon.description}</p>
                  </td>
                  <td className="whitespace-nowrap">
                    {coupon.kind === "percent"
                      ? `${coupon.value}% off`
                      : coupon.kind === "fixed"
                        ? `${money(coupon.value)} off`
                        : "Free delivery"}
                  </td>
                  <td className="whitespace-nowrap text-muted">
                    {coupon.min_subtotal_cents > 0 ? money(coupon.min_subtotal_cents) : "—"}
                  </td>
                  <td className="tabular-nums text-muted">
                    {coupon.used_count}
                    {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                  </td>
                  <td className="whitespace-nowrap text-muted">
                    {coupon.expires_at ? formatDate(coupon.expires_at) : "—"}
                  </td>
                  <td>
                    <span className={`chip ${coupon.is_active ? "border-success/40 text-success" : "text-muted"}`}>
                      {coupon.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/coupons?edit=${coupon.id}`}
                        className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:text-accent"
                      >
                        Edit
                      </Link>
                      <form action={toggleCouponAction}>
                        <input type="hidden" name="id" value={coupon.id} />
                        <input type="hidden" name="next" value={String(!coupon.is_active)} />
                        <button className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                          {coupon.is_active ? "Pause" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteCouponAction}>
                        <input type="hidden" name="id" value={coupon.id} />
                        <button className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[12.5px] text-muted">
                    No discount codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <CouponForm
          key={editing?.id ?? "new"}
          coupon={editing}
          currencySymbol={settings.locale.currencySymbol}
        />
      </div>
    </AdminShell>
  );
}
