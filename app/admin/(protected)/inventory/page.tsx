import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { inventoryLevels } from "@/lib/repositories/catalog";
import { db } from "@/lib/db";
import { formatDateTime, cn } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import { adjustStockAction } from "@/app/actions/admin-products";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const { filter } = await searchParams;
  const levels = inventoryLevels();
  const rows = filter === "low" ? levels.filter((row) => row.stock <= 5) : filter === "out" ? levels.filter((row) => row.stock === 0) : levels;
  const logs = db().all<{
    id: string;
    delta: number;
    reason: string;
    created_at: string;
    sku: string | null;
    product_name: string | null;
  }>(
    `SELECT l.id, l.delta, l.reason, l.created_at, v.sku, p.name AS product_name
       FROM inventory_logs l
       LEFT JOIN variants v ON v.id = l.variant_id
       LEFT JOIN products p ON p.id = l.product_id
      ORDER BY l.created_at DESC LIMIT 12`,
  );

  const totalUnits = levels.reduce((sum, row) => sum + row.stock, 0);
  const out = levels.filter((row) => row.stock === 0).length;
  const low = levels.filter((row) => row.stock > 0 && row.stock <= 5).length;

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Inventory"
      description="Stock is tracked per variant. Saving a row writes an inventory log entry so every movement has a trail."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Units in stock", value: totalUnits },
          { label: "Low stock variants", value: low },
          { label: "Out of stock", value: out },
        ].map((stat) => (
          <div key={stat.label} className="border border-line bg-surface p-4">
            <p className="text-[9.5px] uppercase tracking-[0.14em] text-muted">{stat.label}</p>
            <p className="mt-1.5 font-display text-[24px] leading-none tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { label: "All variants", value: "" },
          { label: "Low stock", value: "low" },
          { label: "Out of stock", value: "out" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/inventory?filter=${tab.value}` : "/admin/inventory"}
            className={cn(
              "chip transition-colors",
              (filter ?? "") === tab.value ? "border-ink bg-ink text-canvas" : "hover:border-ink hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Piece</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th className="text-right">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.variant_id}>
                    <td>
                      <Link href={`/admin/products/${row.product_id}`} className="font-medium hover:text-accent">
                        {row.product_name}
                      </Link>
                    </td>
                    <td className="text-muted">{[row.color_name, row.size].filter(Boolean).join(" · ")}</td>
                    <td className="text-[10.5px] text-muted">{row.sku}</td>
                    <td>
                      <span
                        className={cn(
                          "tabular-nums",
                          row.stock === 0 ? "text-danger" : row.stock <= 5 ? "text-warning" : "text-ink",
                        )}
                      >
                        {row.stock}
                      </span>
                    </td>
                    <td>
                      <form action={adjustStockAction} className="flex items-center justify-end gap-1.5">
                        <input type="hidden" name="variantId" value={row.variant_id} />
                        <input
                          type="number"
                          name="stock"
                          min="0"
                          defaultValue={row.stock}
                          className="input-boxed !w-16 !py-1 !text-[11.5px]"
                          aria-label={`Stock for ${row.product_name}`}
                        />
                        <button type="submit" className="btn btn-sm btn-outline !px-2 !py-1 !text-[10px]">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Recent movements</h2>
          <ul className="mt-3 space-y-2.5">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-3 text-[11.5px]">
                <div className="min-w-0">
                  <p className="truncate">{log.product_name ?? "Unknown piece"}</p>
                  <p className="text-[10.5px] text-muted">
                    {log.reason.replace(/_/g, " ")} · {formatDateTime(log.created_at)}
                  </p>
                </div>
                <span className={cn("shrink-0 tabular-nums", log.delta > 0 ? "text-success" : "text-danger")}>
                  {log.delta > 0 ? "+" : ""}
                  {log.delta}
                </span>
              </li>
            ))}
            {logs.length === 0 && <li className="text-[11.5px] text-muted">No movements recorded yet.</li>}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
