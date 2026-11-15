import Link from "next/link";
import Image from "next/image";
import { adminContext } from "@/lib/admin";
import { listProducts } from "@/lib/repositories/catalog";
import { formatMoney, cn } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import { deleteProductAction } from "@/app/actions/admin-products";

export const metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const params = await searchParams;
  const { products, total } = listProducts({
    q: params.q,
    includeDrafts: true,
    limit: 100,
    sort: "newest",
  });
  const filtered = params.status ? products.filter((product) => product.status === params.status) : products;
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Products"
      description="Create, edit and retire pieces. Variants carry their own SKU and stock, and every stock change is written to the inventory log."
      action={
        <Link href="/admin/products/new" className="btn btn-sm btn-primary">
          New product
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: "All", value: "" },
          { label: "Active", value: "active" },
          { label: "Draft", value: "draft" },
          { label: "Archived", value: "archived" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/products?status=${tab.value}` : "/admin/products"}
            className={cn(
              "chip transition-colors",
              (params.status ?? "") === tab.value ? "border-ink bg-ink text-canvas" : "hover:border-ink hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        ))}
        <form action="/admin/products" className="ml-auto flex items-center gap-2">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search products"
            className="input-boxed !w-52 !py-1.5 !text-[12px]"
            aria-label="Search products"
          />
          <button type="submit" className="btn btn-sm btn-outline">
            Search
          </button>
        </form>
      </div>

      <div className="mt-4 border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
            {filtered.length} of {total} products
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Stock counts live variants</p>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] text-muted">No products match this view.</p>
            <Link href="/admin/products/new" className="btn btn-sm btn-primary mt-4">
              Create the first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Piece</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="relative h-[52px] w-[42px] shrink-0 overflow-hidden bg-line/40">
                          {product.images[0] && (
                            <Image src={product.images[0]} alt="" width={84} height={104} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${product.id}`} className="block truncate font-medium hover:text-accent">
                            {product.name}
                          </Link>
                          <span className="text-[10.5px] text-muted">/{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{product.categoryName ?? "—"}</td>
                    <td className="whitespace-nowrap tabular-nums">
                      {money(product.priceCents)}
                      {product.compareAtCents && (
                        <span className="ml-1 text-[10.5px] text-muted line-through">
                          {money(product.compareAtCents)}
                        </span>
                      )}
                    </td>
                    <td className={cn("tabular-nums", product.stock === 0 ? "text-danger" : product.stock <= 5 ? "text-warning" : "")}>
                      {product.stock}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "chip",
                          product.status === "active"
                            ? "border-success/40 text-success"
                            : product.status === "draft"
                              ? "border-warning/40 text-warning"
                              : "text-muted",
                        )}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="text-[10.5px] text-muted">
                      {[product.isFeatured ? "Featured" : null, product.isNew ? "New" : null].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:text-accent"
                        >
                          Edit
                        </Link>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button
                            type="submit"
                            className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
