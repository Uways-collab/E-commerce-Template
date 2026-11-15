"use client";

import { useActionState, useState } from "react";
import { saveCategoryAction, type AdminActionState } from "@/app/actions/admin-products";
import ImageUploader from "@/components/admin/ImageUploader";

const initial: AdminActionState | null = null;

export default function CategoryForm({
  category,
}: {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    sortOrder: number;
    isActive: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(saveCategoryAction, initial);
  const [images, setImages] = useState<string[]>(category?.image ? [category.image] : []);

  return (
    <form action={formAction} className="border border-line bg-surface p-4">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">
        {category ? `Edit ${category.name}` : "New category"}
      </h2>
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="image" value={images[0] ?? ""} />

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="cat-name" className="label">
            Name
          </label>
          <input id="cat-name" name="name" required defaultValue={category?.name} className="input-boxed" />
        </div>
        <div>
          <label htmlFor="cat-slug" className="label">
            Slug
          </label>
          <input id="cat-slug" name="slug" defaultValue={category?.slug} className="input-boxed" placeholder="auto" />
        </div>
        <div>
          <label htmlFor="cat-description" className="label">
            Description
          </label>
          <textarea
            id="cat-description"
            name="description"
            rows={2}
            defaultValue={category?.description ?? ""}
            className="input-boxed resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cat-order" className="label">
              Sort order
            </label>
            <input
              id="cat-order"
              name="sortOrder"
              type="number"
              defaultValue={category?.sortOrder ?? 0}
              className="input-boxed"
            />
          </div>
          <div>
            <label htmlFor="cat-active" className="label">
              Visible
            </label>
            <select id="cat-active" name="isActive" defaultValue={category ? String(category.isActive) : "true"} className="select-boxed">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <ImageUploader images={images} onChange={setImages} label="Tile image" help="Portrait crops look best (4:5)." />
      </div>

      {state?.error && <p className="mt-2 text-[11.5px] text-danger">{state.error}</p>}
      {state?.message && <p className="mt-2 text-[11.5px] text-success">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-sm btn-primary mt-3 w-full">
        {pending ? "Saving…" : category ? "Save category" : "Add category"}
      </button>
    </form>
  );
}
