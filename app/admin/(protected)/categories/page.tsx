import Link from "next/link";
import Image from "next/image";
import { adminContext } from "@/lib/admin";
import { listCategories } from "@/lib/repositories/catalog";
import AdminShell from "@/components/admin/AdminShell";
import CategoryForm from "@/components/admin/CategoryForm";
import { deleteCategoryAction } from "@/app/actions/admin-products";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const { edit } = await searchParams;
  const categories = listCategories();
  const editing = edit ? categories.find((category) => category.id === edit) : undefined;

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Categories"
      description="Categories drive the storefront navigation, the collection pages and the shop filters. Order and visibility are both editable."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{categories.length} categories</p>
            {editing && (
              <Link href="/admin/categories" className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                Cancel edit
              </Link>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th>Products</th>
                  <th>Order</th>
                  <th>Visible</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden bg-line/40">
                          {category.image && (
                            <Image src={category.image} alt="" width={72} height={72} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-[10.5px] text-muted">{category.description?.slice(0, 48)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">/{category.slug}</td>
                    <td className="tabular-nums">{category.productCount ?? 0}</td>
                    <td className="tabular-nums text-muted">{category.sortOrder}</td>
                    <td>
                      <span className={`chip ${category.isActive ? "border-success/40 text-success" : "text-muted"}`}>
                        {category.isActive ? "Live" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/categories?edit=${category.id}`}
                          className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:text-accent"
                        >
                          Edit
                        </Link>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <ConfirmSubmit
                            message={`Delete the ${category.name} category? Products stay, but lose this category.`}
                            className="text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger"
                          >
                            Delete
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted">
            Deleting a category leaves its products in the catalogue as uncategorised.
          </p>
        </div>

        <CategoryForm
          key={editing?.id ?? "new"}
          category={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  slug: editing.slug,
                  description: editing.description,
                  image: editing.image,
                  sortOrder: editing.sortOrder,
                  isActive: editing.isActive,
                }
              : undefined
          }
        />
      </div>
    </AdminShell>
  );
}
