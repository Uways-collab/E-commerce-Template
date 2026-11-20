import Link from "next/link";
import { notFound } from "next/navigation";
import { adminContext } from "@/lib/admin";
import { getProductById, listCategories } from "@/lib/repositories/catalog";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import { deleteProductAction } from "@/app/actions/admin-products";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }, { user, settings, groups }] = await Promise.all([params, searchParams, adminContext()]);
  const product = getProductById(id);
  if (!product) notFound();
  const categories = listCategories();

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title={product.name}
      description={`Updated ${formatDate(product.updatedAt)} · ${product.variants?.length ?? 0} variants · ${product.stock} units in stock`}
      action={
        <div className="flex items-center gap-2">
          <Link href={`/products/${product.slug}`} target="_blank" className="btn btn-sm btn-outline">
            View on storefront
          </Link>
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmSubmit
              message={`Delete ${product.name}? This also removes its variants. Past orders keep their history.`}
              className="btn btn-sm btn-ghost text-danger"
            >
              Delete
            </ConfirmSubmit>
          </form>
        </div>
      }
    >
      {saved === "1" && (
        <p className="mb-4 border border-success/30 bg-success/[0.05] px-3 py-2 text-[12px] text-success">
          Saved — the storefront now reflects these changes.
        </p>
      )}
      <ProductForm
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          subtitle: product.subtitle,
          description: product.description,
          details: product.details,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          categoryId: product.categoryId,
          collection: product.collection,
          material: product.material,
          care: product.care,
          images: product.images,
          tags: product.tags,
          status: product.status,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
          badge: product.badge,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          variants: (product.variants ?? []).map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            stock: variant.stock,
            priceDeltaCents: variant.priceDeltaCents,
          })),
        }}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        currencySymbol={settings.locale.currencySymbol}
      />
    </AdminShell>
  );
}
