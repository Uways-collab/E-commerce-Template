"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  deleteBanner,
  deleteCoupon,
  deleteReview,
  saveBanner,
  saveCoupon,
  setReviewPublished,
  toggleCoupon,
  type Banner,
} from "@/lib/repositories/marketing";
import { db } from "@/lib/db";

export interface AdminState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/* Coupons ------------------------------------------------------------------ */

export async function saveCouponAction(_prev: AdminState | null, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const kind = String(formData.get("kind") ?? "percent") as "percent" | "fixed" | "free_shipping";
  const rawValue = Number(formData.get("value") ?? 0);

  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
    return { error: "Codes must be 3–24 characters, letters, numbers, dash or underscore." };
  }
  if (kind === "percent" && (rawValue <= 0 || rawValue > 100)) {
    return { error: "Percentage discounts must be between 1 and 100." };
  }
  if (kind === "fixed" && rawValue <= 0) {
    return { error: "Fixed discounts must be greater than zero." };
  }

  const value = kind === "fixed" ? Math.round(rawValue * 100) : Math.round(rawValue);

  saveCoupon({
    id: String(formData.get("id") ?? "") || undefined,
    code,
    description: String(formData.get("description") ?? "") || null,
    kind,
    value,
    minSubtotalCents: Math.round(Number(formData.get("minSubtotal") ?? 0) * 100),
    maxUses: formData.get("maxUses") ? Number(formData.get("maxUses")) : null,
    startsAt: String(formData.get("startsAt") ?? "") || null,
    expiresAt: String(formData.get("expiresAt") ?? "") || null,
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/admin/coupons");
  return { ok: true, message: `${code} saved.` };
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteCoupon(id);
  revalidatePath("/admin/coupons");
}

export async function toggleCouponAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (id) toggleCoupon(id, next);
  revalidatePath("/admin/coupons");
}

/* Banners ------------------------------------------------------------------ */

export async function saveBannerAction(_prev: AdminState | null, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { error: "Enter a banner title." };

  saveBanner({
    id: String(formData.get("id") ?? "") || undefined,
    title,
    eyebrow: String(formData.get("eyebrow") ?? "") || null,
    subtitle: String(formData.get("subtitle") ?? "") || null,
    image: String(formData.get("image") ?? "") || null,
    href: String(formData.get("href") ?? "") || null,
    ctaLabel: String(formData.get("ctaLabel") ?? "") || null,
    placement: (String(formData.get("placement") ?? "promo") as Banner["placement"]) ?? "promo",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/admin/banners");
  revalidatePath("/shop");
  return { ok: true, message: "Banner saved." };
}

export async function deleteBannerAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) deleteBanner(id);
  revalidatePath("/admin/banners");
  revalidatePath("/shop");
}

/* Reviews ------------------------------------------------------------------ */

export async function moderateReviewAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id) return;
  if (action === "publish") setReviewPublished(id, true);
  if (action === "hide") setReviewPublished(id, false);
  if (action === "delete") deleteReview(id);
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
}

/* Contact messages --------------------------------------------------------- */

export async function updateMessageStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new");
  if (!id) return;
  db().run("UPDATE contact_messages SET status = ? WHERE id = ?", [status, id]);
  revalidatePath("/admin/messages");
}

export async function deleteMessageAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) db().run("DELETE FROM contact_messages WHERE id = ?", [id]);
  revalidatePath("/admin/messages");
}
