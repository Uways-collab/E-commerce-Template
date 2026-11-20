"use server";

import { revalidatePath } from "next/cache";
import { subscribeNewsletter } from "@/lib/repositories/marketing";
import { rateLimit } from "@/lib/rate-limit";

export interface NewsletterState {
  ok: boolean;
  message: string;
}

export async function subscribeAction(_prev: NewsletterState | null, formData: FormData): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "");
  const source = String(formData.get("source") ?? "footer");
  const limit = rateLimit(`newsletter:${email.toLowerCase()}`, 5, 60_000);
  if (!limit.allowed) {
    return { ok: false, message: "Too many attempts. Please try again in a minute." };
  }
  const result = subscribeNewsletter(email, source);
  if (result.ok) revalidatePath("/admin/subscribers");
  return result;
}
