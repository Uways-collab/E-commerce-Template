"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction, type AdminActionState } from "@/app/actions/admin-products";
import ImageUploader from "@/components/admin/ImageUploader";
import { slugify } from "@/lib/utils";

export interface SerializedVariant {
  id: string;
  sku: string;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  stock: number;
  priceDeltaCents: number;
}

export interface SerializedProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  details: string[];
  priceCents: number;
  compareAtCents: number | null;
  categoryId: string | null;
  collection: string | null;
  material: string | null;
  care: string | null;
  images: string[];
  tags: string[];
  status: string;
  isFeatured: boolean;
  isNew: boolean;
  badge: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  variants: SerializedVariant[];
}

interface SizeRow {
  id?: string;
  label: string;
  stock: number;
  sku?: string;
}

interface ColourBlock {
  key: string;
  name: string;
  hex: string;
  sizes: SizeRow[];
}

const initial: AdminActionState | null = null;

function buildBlocks(variants: SerializedVariant[]): ColourBlock[] {
  const map = new Map<string, ColourBlock>();
  for (const variant of variants) {
    const name = variant.colorName ?? "Default";
    const key = `${name}-${variant.colorHex ?? ""}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name,
        hex: variant.colorHex ?? "#D8CEBB",
        sizes: [],
      });
    }
    map.get(key)!.sizes.push({
      id: variant.id,
      label: variant.size ?? "One size",
      stock: variant.stock,
      sku: variant.sku,
    });
  }
  return Array.from(map.values());
}

export default function ProductForm({
  product,
  categories,
  currencySymbol,
}: {
  product?: SerializedProduct;
  categories: { id: string; name: string }[];
  currencySymbol: string;
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, initial);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [blocks, setBlocks] = useState<ColourBlock[]>(
    product ? buildBlocks(product.variants) : [
      { key: "c1", name: "Sand", hex: "#D8CEBB", sizes: [{ label: "S", stock: 5 }, { label: "M", stock: 5 }, { label: "L", stock: 5 }] },
    ],
  );

  const variantsJson = useMemo(
    () =>
      JSON.stringify(
        blocks.flatMap((block) =>
          block.sizes
            .filter((size) => size.label.trim())
            .map((size) => ({
              id: size.id,
              size: size.label.trim(),
              colorName: block.name.trim() || null,
              colorHex: block.hex,
              stock: Number(size.stock) || 0,
              sku: size.sku,
            })),
        ),
      ),
    [blocks],
  );

  const totalStock = blocks.reduce(
    (sum, block) => sum + block.sizes.reduce((inner, size) => inner + (Number(size.stock) || 0), 0),
    0,
  );

  const updateBlock = (key: string, patch: Partial<ColourBlock>) =>
    setBlocks((current) => current.map((block) => (block.key === key ? { ...block, ...patch } : block)));

  const updateSize = (key: string, index: number, patch: Partial<SizeRow>) =>
    setBlocks((current) =>
      current.map((block) =>
        block.key === key
          ? { ...block, sizes: block.sizes.map((size, i) => (i === index ? { ...size, ...patch } : size)) }
          : block,
      ),
    );

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="variants" value={variantsJson} />

      <div className="space-y-4">
        {state?.error && (
          <p className="border border-danger/30 bg-danger/[0.04] px-3 py-2 text-[12px] text-danger">{state.error}</p>
        )}

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Basics</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">
                Product name
              </label>
              <input
                id="name"
                name="name"
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!product) setSlug(slugify(event.target.value));
                }}
                className="input-boxed"
                placeholder="Alma Linen Midi Dress"
              />
            </div>
            <div>
              <label htmlFor="slug" className="label">
                URL slug
              </label>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
                className="input-boxed"
                placeholder="alma-linen-midi-dress"
              />
              <p className="mt-1 text-[10px] text-muted">/products/{slug || "…"}</p>
            </div>
            <div>
              <label htmlFor="subtitle" className="label">
                Subtitle
              </label>
              <input
                id="subtitle"
                name="subtitle"
                defaultValue={product?.subtitle ?? ""}
                className="input-boxed"
                placeholder="Belted midi in washed European linen"
              />
            </div>
            <div>
              <label htmlFor="categoryId" className="label">
                Category
              </label>
              <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className="select-boxed">
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="collection" className="label">
                Collection
              </label>
              <input
                id="collection"
                name="collection"
                defaultValue={product?.collection ?? ""}
                className="input-boxed"
                placeholder="The Linen Edit"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={5}
                defaultValue={product?.description ?? ""}
                className="input-boxed resize-none"
                placeholder="What it is, how it fits, why it is made this way…"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="details" className="label">
                Detail bullets (one per line)
              </label>
              <textarea
                id="details"
                name="details"
                rows={4}
                defaultValue={product?.details.join("\n") ?? ""}
                className="input-boxed resize-none"
              />
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Pricing</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className="label">
                Price ({currencySymbol})
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={product ? product.priceCents / 100 : ""}
                className="input-boxed"
              />
            </div>
            <div>
              <label htmlFor="compareAt" className="label">
                Compare-at ({currencySymbol})
              </label>
              <input
                id="compareAt"
                name="compareAt"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.compareAtCents ? product.compareAtCents / 100 : ""}
                className="input-boxed"
              />
            </div>
            <div>
              <label htmlFor="badge" className="label">
                Badge
              </label>
              <input id="badge" name="badge" defaultValue={product?.badge ?? ""} className="input-boxed" placeholder="Best seller" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} className="checkbox" />
              Featured on the homepage
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" name="isNew" defaultChecked={product?.isNew} className="checkbox" />
              Mark as new arrival
            </label>
          </div>
        </section>

        <section className="border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">
              Variants & stock — {totalStock} units
            </h2>
            <button
              type="button"
              onClick={() =>
                setBlocks((current) => [
                  ...current,
                  { key: `c${Date.now()}`, name: "New colour", hex: "#CFC4B2", sizes: [{ label: "M", stock: 5 }] },
                ])
              }
              className="btn btn-sm btn-outline"
            >
              <Plus size={12} strokeWidth={1.8} /> Colour
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {blocks.map((block) => (
              <div key={block.key} className="border border-line p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1">
                    <span className="label">Colour name</span>
                    <input
                      value={block.name}
                      onChange={(event) => updateBlock(block.key, { name: event.target.value })}
                      className="input-boxed !py-1.5 !text-[12px]"
                    />
                  </div>
                  <div>
                    <span className="label">Swatch</span>
                    <input
                      type="color"
                      value={block.hex}
                      onChange={(event) => updateBlock(block.key, { hex: event.target.value })}
                      className="h-[34px] w-12 border border-line bg-surface p-0.5"
                      aria-label="Colour swatch"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlocks((current) => current.filter((item) => item.key !== block.key))}
                    className="inline-flex h-[34px] items-center gap-1 text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-danger"
                  >
                    <Trash2 size={12} strokeWidth={1.7} /> Remove
                  </button>
                </div>

                <div className="mt-2 space-y-1.5">
                  {block.sizes.map((size, index) => (
                    <div key={`${block.key}-${index}`} className="flex items-center gap-2">
                      <input
                        value={size.label}
                        onChange={(event) => updateSize(block.key, index, { label: event.target.value })}
                        placeholder="Size"
                        className="input-boxed !w-24 !py-1 !text-[12px]"
                        aria-label="Size label"
                      />
                      <input
                        type="number"
                        min="0"
                        value={size.stock}
                        onChange={(event) => updateSize(block.key, index, { stock: Number(event.target.value) })}
                        placeholder="Stock"
                        className="input-boxed !w-20 !py-1 !text-[12px]"
                        aria-label="Stock"
                      />
                      <input
                        value={size.sku ?? ""}
                        onChange={(event) => updateSize(block.key, index, { sku: event.target.value })}
                        placeholder="SKU (auto)"
                        className="input-boxed !flex-1 !py-1 !text-[12px]"
                        aria-label="SKU"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateBlock(block.key, { sizes: block.sizes.filter((_, i) => i !== index) })
                        }
                        className="p-1 text-muted hover:text-danger"
                        aria-label="Remove size"
                      >
                        <Trash2 size={12} strokeWidth={1.7} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateBlock(block.key, { sizes: [...block.sizes, { label: "", stock: 0 }] })}
                    className="mt-1 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                  >
                    <Plus size={11} strokeWidth={1.8} /> Add size
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Materials & care</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="material" className="label">
                Composition
              </label>
              <input id="material" name="material" defaultValue={product?.material ?? ""} className="input-boxed" />
            </div>
            <div>
              <label htmlFor="care" className="label">
                Care instructions
              </label>
              <input id="care" name="care" defaultValue={product?.care ?? ""} className="input-boxed" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="tags" className="label">
                Tags (comma separated)
              </label>
              <input id="tags" name="tags" defaultValue={product?.tags.join(", ") ?? ""} className="input-boxed" />
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Media</h2>
          <div className="mt-3">
            <ImageUploader images={images} onChange={setImages} label="Product images" />
          </div>
        </section>

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Publishing</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select id="status" name="status" defaultValue={product?.status ?? "active"} className="select-boxed">
                <option value="active">Active — visible in the shop</option>
                <option value="draft">Draft — hidden</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Search & social</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="seoTitle" className="label">
                SEO title
              </label>
              <input id="seoTitle" name="seoTitle" defaultValue={product?.seoTitle ?? ""} className="input-boxed" />
            </div>
            <div>
              <label htmlFor="seoDescription" className="label">
                Meta description
              </label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                rows={3}
                defaultValue={product?.seoDescription ?? ""}
                className="input-boxed resize-none"
              />
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 flex flex-col gap-2 border border-line bg-canvas/95 p-3 backdrop-blur">
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? "Saving…" : product ? "Save changes" : "Create product"}
          </button>
          <Link href="/admin/products" className="btn btn-ghost btn-sm w-full">
            Back to catalogue
          </Link>
        </div>
      </div>
    </form>
  );
}
