import { adminContext } from "@/lib/admin";
import { listCategories } from "@/lib/repositories/catalog";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { user, settings, groups } = await adminContext();
  const categories = listCategories();

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="New product"
      description="Add a piece to the catalogue. Images are normalised and stored on the data volume; variants define the stock the storefront can sell."
    >
      <ProductForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        currencySymbol={settings.locale.currencySymbol}
      />
    </AdminShell>
  );
}
