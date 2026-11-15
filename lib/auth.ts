import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { newId } from "@/lib/utils";
import { open, seal } from "@/lib/sign";

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

/**
 * Tokens carry the account's `session_version`. Bumping that column invalidates
 * every token issued before the bump — used on password change and on
 * "sign out of all devices".
 */
interface SessionToken extends Record<string, unknown> {
  uid: string;
  exp: number;
  ver: number;
}

function encodeToken(userId: string, version: number): string {
  return seal({ uid: userId, ver: version, exp: Date.now() + SESSION_DAYS * 86_400_000 });
}

function decodeToken(token: string): { uid: string; ver: number } | null {
  const parsed = open<SessionToken>(token);
  if (!parsed?.uid || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
  return { uid: parsed.uid, ver: Number(parsed.ver ?? 0) };
}

export async function startSession(userId: string) {
  const record = db().get<{ session_version: number }>(
    "SELECT session_version FROM users WHERE id = ?",
    [userId],
  );
  if (!record) return;
  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeToken(userId, Number(record.session_version ?? 0)), {
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
    session_version: number;
  }>("SELECT id, email, name, role, phone, session_version FROM users WHERE id = ?", [decoded.uid]);

  if (!row) return null;
  // A password change (or an explicit sign-out-everywhere) bumps this version.
  if (Number(row.session_version ?? 0) !== decoded.ver) return null;

  const { session_version: _version, ...user } = row;
  return user;
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

/** Invalidate every session token issued for this account so far. */
export function bumpSessionVersion(userId: string) {
  db().run("UPDATE users SET session_version = session_version + 1 WHERE id = ?", [userId]);
}

export function touchLogin(userId: string) {
  db().run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [userId]);
}
