"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createUser,
  endSession,
  findUserByEmail,
  getSessionUser,
  startSession,
  touchLogin,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { newId } from "@/lib/utils";
import { subscribeNewsletter } from "@/lib/repositories/marketing";

export interface AuthState {
  error?: string;
  message?: string;
}

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const value = String(next ?? "");
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

export async function loginAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const limit = rateLimit(`login:${email}`, 8, 15 * 60_000);
  if (!limit.allowed) {
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    // Deliberately identical message for unknown email and wrong password.
    return { error: "Those details don’t match an account. Please try again." };
  }

  resetRateLimit(`login:${email}`);
  touchLogin(user.id);
  await startSession(user.id);

  const fallback = user.role === "admin" || user.role === "staff" ? "/admin" : "/account";
  redirect(safeNext(next, fallback));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(32).optional().default(""),
  password: z.string().min(8, "Use at least 8 characters.").max(120),
});

export async function registerAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const { name, email, phone, password } = parsed.data;
  const limit = rateLimit(`register:${email.toLowerCase()}`, 5, 30 * 60_000);
  if (!limit.allowed) return { error: "Too many attempts. Please try again later." };

  if (findUserByEmail(email)) {
    return { error: "An account already exists with that email. Try signing in instead." };
  }

  const user = createUser({
    name,
    email,
    phone: phone || null,
    password,
    marketingOptIn: formData.get("marketingOptIn") === "true",
  });

  if (formData.get("marketingOptIn") === "true") {
    subscribeNewsletter(email, "account");
  }

  await startSession(user.id);
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function updateProfileAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const marketing = formData.get("marketingOptIn") === "true";

  if (name.length < 2) return { error: "Enter your full name." };

  db().run("UPDATE users SET name = ?, phone = ?, marketing_opt_in = ? WHERE id = ?", [
    name,
    phone || null,
    marketing ? 1 : 0,
    user.id,
  ]);

  if (marketing) subscribeNewsletter(user.email, "account");

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { message: "Profile updated." };
}

export async function changePasswordAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const session = await getSessionUser();
  if (!session) return { error: "Please sign in again." };

  const user = findUserByEmail(session.email);
  if (!user) return { error: "Account not found." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");

  if (!verifyPassword(current, user.password_hash)) {
    return { error: "Your current password is incorrect." };
  }
  if (next.length < 8) return { error: "The new password must be at least 8 characters." };

  const { hashPassword } = await import("@/lib/auth");
  db().run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(next), user.id]);
  return { message: "Password changed." };
}

const addressSchema = z.object({
  label_: z.string().trim().max(40).optional().default("Home"),
  fullName: z.string().trim().min(2, "Enter the recipient name."),
  phone: z.string().trim().min(7, "Enter a phone number."),
  line1: z.string().trim().min(3, "Enter the street address."),
  line2: z.string().trim().optional().default(""),
  city: z.string().trim().min(2, "Enter the city."),
  state: z.string().trim().optional().default(""),
  postalCode: z.string().trim().optional().default(""),
  country: z.string().trim().min(2, "Enter the country."),
});

export async function saveAddressAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = addressSchema.safeParse({
    label_: formData.get("label"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? "",
    city: formData.get("city"),
    state: formData.get("state") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the address." };

  const input = parsed.data;
  const id = String(formData.get("addressId") ?? "") || null;
  const makeDefault = formData.get("isDefault") === "true";

  if (makeDefault) {
    db().run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [user.id]);
  }

  if (id) {
    db().run(
      `UPDATE addresses SET label = ?, full_name = ?, phone = ?, line1 = ?, line2 = ?, city = ?, state = ?,
         postal_code = ?, country = ?, is_default = CASE WHEN ? = 1 THEN 1 ELSE is_default END
       WHERE id = ? AND user_id = ?`,
      [
        input.label_ || "Home",
        input.fullName,
        input.phone,
        input.line1,
        input.line2 || null,
        input.city,
        input.state || null,
        input.postalCode || null,
        input.country,
        makeDefault ? 1 : 0,
        id,
        user.id,
      ],
    );
  } else {
    const count = db().get<{ n: number }>("SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?", [user.id]);
    db().run(
      `INSERT INTO addresses (id, user_id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId("adr"),
        user.id,
        input.label_ || "Home",
        input.fullName,
        input.phone,
        input.line1,
        input.line2 || null,
        input.city,
        input.state || null,
        input.postalCode || null,
        input.country,
        makeDefault || Number(count?.n ?? 0) === 0 ? 1 : 0,
      ],
    );
  }

  revalidatePath("/account/addresses");
  return { message: "Address saved." };
}

export async function deleteAddressAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get("addressId") ?? "");
  db().run("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, user.id]);
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get("addressId") ?? "");
  db().transaction(() => {
    db().run("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [user.id]);
    db().run("UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?", [id, user.id]);
  });
  revalidatePath("/account/addresses");
}
