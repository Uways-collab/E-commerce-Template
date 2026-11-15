import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { newId } from "@/lib/utils";

const COOKIE_NAME = "pph_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin" | "staff";
  phone: string | null;
}

/* -------------------------------------------------------------------------- */
/* Passwordhashes — scrypt with per-user salt                                 */
/* -------------------------------------------------------------------------- */

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== candidate.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/* -------------------------------------------------------------------------- */
/* Signed session tokens                                                      */
/* -------------------------------------------------------------------------- */

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    // Never silently fall back to a guessable secret in production.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set. Refusing to issue insecure sessions.");
    }
    return "development-only-insecure-secret-change-me";
  }
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86_400_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token: string): { uid: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) return null;
    return { uid: parsed.uid };
  } catch {
    return null;
  }
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded) return null;

  const row = db().get<{
    id: string;
    email: string;
    name: string;
    role: SessionUser["role"];
    phone: string | null;
  }>("SELECT id, email, name, role, phone FROM users WHERE id = ?", [decoded.uid]);

  if (!row) return null;
  return row;
});

export async function requireUser(next = "/account") {
  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    redirect("/admin/login");
  }
  return user;
}

export function isAdmin(user: SessionUser | null) {
  return Boolean(user && (user.role === "admin" || user.role === "staff"));
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export interface UserRecord extends SessionUser {
  password_hash: string;
  marketing_opt_in: number;
  created_at: string;
  last_login_at: string | null;
}

export function findUserByEmail(email: string): UserRecord | undefined {
  return db().get<UserRecord>("SELECT * FROM users WHERE lower(email) = lower(?)", [email.trim()]);
}

export function findUserById(id: string): UserRecord | undefined {
  return db().get<UserRecord>("SELECT * FROM users WHERE id = ?", [id]);
}

export function createUser(input: {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  role?: SessionUser["role"];
  marketingOptIn?: boolean;
  id?: string;
}): UserRecord {
  const id = input.id ?? newId("usr");
  db().run(
    `INSERT INTO users (id, email, password_hash, name, phone, role, marketing_opt_in)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.email.trim().toLowerCase(),
      hashPassword(input.password),
      input.name.trim(),
      input.phone?.trim() || null,
      input.role ?? "customer",
      input.marketingOptIn ? 1 : 0,
    ],
  );
  return findUserById(id)!;
}

export function touchLogin(userId: string) {
  db().run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [userId]);
}
