"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { normaliseImageSource, sanitizeImageList } from "@/lib/images";
import {
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveProduct,
  updateStock,
} from "@/lib/repositories/catalog";
import { parseJson } from "@/lib/utils";

export interface AdminActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

function refreshStorefront() {
  revalidatePath("/", "layout");
}

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(140),
  slug: z.string().trim().optional().default(""),
  subtitle: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().min(20, "Add a description of at least 20 characters."),
  priceCents: z.coerce.number().int().min(0, "Price cannot be negative."),
  compareAtCents: z.coerce.number().int().min(0).optional(),
  status: z.enum(["active", "draft", "archived"]),
});

/** Variants arrive as JSON from the product editor's size/colour matrix. */
function parseVariants(raw: FormDataEntryValue | null) {
  const parsed = parseJson<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: typeof record.id === "string" && record.id ? record.id : undefined,
        sku: typeof record.sku === "string" ? record.sku : undefined,
        size: typeof record.size === "string" ? record.size : null,
        colorName: typeof record.colorName === "string" ? record.colorName : null,
        colorHex: typeof record.colorHex === "string" ? record.colorHex : null,
        priceDeltaCents: Number(record.priceDeltaCents ?? 0) || 0,
        stock: Math.max(0, Number(record.stock ?? 0) || 0),
        isActive: record.isActive !== false,
      };
    })
    .filter((variant) => variant.size || variant.colorName);
}

function sanitiseOptionalImage(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const normalised = normaliseImageSource(value);
  return normalised;
}

export async function saveProductAction(_prev: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    description: formData.get("description"),
    priceCents: Math.round(Number(formData.get("price") ?? 0) * 100),
    compareAtCents: formData.get("compareAt")
      ? Math.round(Number(formData.get("compareAt")) * 100)
      : undefined,
    status: formData.get("status") ?? "active",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the product details." };
  }

  const rawImages = parseJson<unknown[]>(formData.get("images"), []);
  const images = sanitizeImageList(rawImages);
  if (!images.length) {
    return { error: "Add at least one product image — upload a file or paste an https:// link." };
  }
  if (images.length !== rawImages.filter(Boolean).length) {
    return { error: "One of the image links is not allowed. Use an uploaded image or an https:// URL." };
  }

  const variants = parseVariants(formData.get("variants"));
  if (!variants.length) {
    return { error: "Add at least one size/colour variant with stock." };
  }

  const id = String(formData.get("id") ?? "") || undefined;

  try {
    const productId = saveProduct({
      id,
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      subtitle: parsed.data.subtitle || null,
      description: parsed.data.description,
      details: lines(formData.get("details")),
      priceCents: parsed.data.priceCents,
      compareAtCents: parsed.data.compareAtCents || null,
      categoryId: String(formData.get("categoryId") ?? "") || null,
      collection: String(formData.get("collection") ?? "") || null,
      material: String(formData.get("material") ?? "") || null,
      care: String(formData.get("care") ?? "") || null,
      images,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: parsed.data.status,
      isFeatured: formData.get("isFeatured") === "on",
      isNew: formData.get("isNew") === "on",
      badge: String(formData.get("badge") ?? "") || null,
      seoTitle: String(formData.get("seoTitle") ?? "") || null,
      seoDescription: String(formData.get("seoDescription") ?? "") || null,
      variants,
    });

    refreshStorefront();
    revalidatePath("/admin/products");
    redirect(`/admin/products/${productId}?saved=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("saveProductAction", error);
    return { error: "Could not save the product. Check the slug is unique." };
  }
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteProduct(id);
  refreshStorefront();
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function saveCategoryAction(_prev: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter a category name." };

  saveCategory({
    id: String(formData.get("id") ?? "") || undefined,
    name,
    slug: String(formData.get("slug") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || null,
    image: sanitiseOptionalImage(formData.get("image")),
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    isActive: formData.get("isActive") !== "false",
  });

  refreshStorefront();
  revalidatePath("/admin/categories");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteCategory(id);
  refreshStorefront();
  revalidatePath("/admin/categories");
}

export async function adjustStockAction(formData: FormData) {
  await requireAdmin();
  const variantId = String(formData.get("variantId") ?? "");
  const stock = Number(formData.get("stock") ?? 0);
  if (variantId && Number.isFinite(stock)) {
    updateStock(variantId, Math.max(0, Math.round(stock)), "admin_inventory_update");
  }
  refreshStorefront();
  revalidatePath("/admin/inventory");
}
