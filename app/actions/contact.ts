"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { newId } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export interface ContactState {
  ok: boolean;
  message: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(32).optional().default(""),
  subject: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(2000),
});

export async function submitContactAction(_prev: ContactState | null, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const limit = rateLimit(`contact:${parsed.data.email.toLowerCase()}`, 3, 30 * 60_000);
  if (!limit.allowed) {
    return { ok: false, message: "You’ve just sent us a message. We’ll reply by email shortly." };
  }

  db().run(
    `INSERT INTO contact_messages (id, name, email, phone, subject, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      newId("msg"),
      parsed.data.name,
      parsed.data.email,
      parsed.data.phone || null,
      parsed.data.subject || null,
      parsed.data.message,
    ],
  );

  return { ok: true, message: "Thank you — your message is with client care. We reply within one business day." };
}
