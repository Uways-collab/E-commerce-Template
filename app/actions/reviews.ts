"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { hasPurchased } from "@/lib/repositories/orders";
import { createReview } from "@/lib/repositories/marketing";
import { rateLimit } from "@/lib/rate-limit";

export interface ReviewState {
  ok: boolean;
  message: string;
}

const schema = z.object({
  productId: z.string().min(1),
  productSlug: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(90).optional().default(""),
  body: z.string().trim().min(10, "Please write at least 10 characters.").max(2000),
});

export async function submitReviewAction(_prev: ReviewState | null, formData: FormData): Promise<ReviewState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Please sign in to leave a review." };
  }

  const parsed = schema.safeParse({
    productId: formData.get("productId"),
    productSlug: formData.get("productSlug"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your review." };
  }

  const limit = rateLimit(`review:${user.id}`, 5, 60 * 60_000);
  if (!limit.allowed) {
    return { ok: false, message: "You’ve posted several reviews recently. Please try again later." };
  }

  createReview({
    productId: parsed.data.productId,
    userId: user.id,
    author: user.name,
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
    isVerified: hasPurchased(user.id, parsed.data.productId),
  });

  revalidatePath(`/products/${parsed.data.productSlug}`);
  return { ok: true, message: "Thank you — your review is published." };
}
