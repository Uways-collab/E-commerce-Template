"use client";

import { useActionState, useState } from "react";
import { saveBannerAction, type AdminState } from "@/app/actions/admin-marketing";
import ImageUploader from "@/components/admin/ImageUploader";
import type { Banner } from "@/lib/repositories/marketing";

const initial: AdminState | null = null;

export default function BannerForm({ banner }: { banner?: Banner }) {
  const [state, formAction, pending] = useActionState(saveBannerAction, initial);
  const [images, setImages] = useState<string[]>(banner?.image ? [banner.image] : []);

  return (
    <form action={formAction} className="border border-line bg-surface p-4">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">
        {banner ? `Edit banner` : "New banner"}
      </h2>
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <input type="hidden" name="image" value={images[0] ?? ""} />

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="title" className="label">
            Title
          </label>
          <input id="title" name="title" required defaultValue={banner?.title} className="input-boxed" />
        </div>
        <div>
          <label htmlFor="eyebrow" className="label">
            Eyebrow
          </label>
          <input id="eyebrow" name="eyebrow" defaultValue={banner?.eyebrow ?? ""} className="input-boxed" />
        </div>
        <div>
          <label htmlFor="subtitle" className="label">
            Subtitle
          </label>
          <textarea
            id="subtitle"
            name="subtitle"
            rows={2}
            defaultValue={banner?.subtitle ?? ""}
            className="input-boxed resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="href" className="label">
              Link
            </label>
            <input id="href" name="href" defaultValue={banner?.href ?? ""} className="input-boxed" placeholder="/shop" />
          </div>
          <div>
            <label htmlFor="ctaLabel" className="label">
              CTA label
            </label>
            <input id="ctaLabel" name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} className="input-boxed" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="placement" className="label">
              Placement
            </label>
            <select id="placement" name="placement" defaultValue={banner?.placement ?? "promo"} className="select-boxed">
              <option value="promo">Shop promo strip</option>
              <option value="announcement">Announcement bar</option>
              <option value="hero">Hero</option>
              <option value="story">Story</option>
            </select>
          </div>
          <div>
            <label htmlFor="sortOrder" className="label">
              Sort order
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={banner?.sortOrder ?? 0}
              className="input-boxed"
            />
          </div>
        </div>
        <ImageUploader images={images} onChange={setImages} label="Banner image" />
        <label className="flex items-center gap-2 text-[12px]">
          <input type="checkbox" name="isActive" defaultChecked={banner ? banner.isActive : true} className="checkbox" />
          Active
        </label>
      </div>

      {state?.error && <p className="mt-2 text-[11.5px] text-danger">{state.error}</p>}
      {state?.message && <p className="mt-2 text-[11.5px] text-success">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-sm btn-primary mt-3 w-full">
        {pending ? "Saving…" : banner ? "Save banner" : "Create banner"}
      </button>
    </form>
  );
}
