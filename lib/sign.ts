import "server-only";
import crypto from "node:crypto";

/**
 * Shared HMAC helpers for anything the client holds but must not be able to
 * forge: session tokens, the guest-order capability cookie, and future
 * single-use tokens.
 *
 * The signing secret is the same `AUTH_SECRET` used for sessions. In
 * production the app refuses to fall back to a known value.
 */

export function appSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set. Refusing to sign security tokens.");
    }
    return "development-only-insecure-secret-change-me";
  }
  return value;
}

function signature(payload: string): string {
  return crypto.createHmac("sha256", appSecret()).update(payload).digest("base64url");
}

/** Constant-time comparison that tolerates differing lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Encode `{...}` as `base64url(json).hmac`. */
export function seal( payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

/**
 * Sign and verify a throwaway token with the live secret.
 *
 * Used by `/api/health`: it is the only way to tell from the outside whether
 * session signing will work. A deployment with no `AUTH_SECRET` serves
 * anonymous pages happily and then 500s the moment someone signs in, so the
 * probe turns that into a failing health check instead of a support ticket.
 */
export function authSelfTest(): { ok: true } | { ok: false; error: string } {
  try {
    const token = seal({ probe: "health" });
    const decoded = open<{ probe: string }>(token);
    if (decoded?.probe !== "health") {
      return { ok: false, error: "Session tokens did not round-trip." };
    }

    const [payload] = token.split(".");
    if (open(`${payload}.AAAA`) !== null) {
      return { ok: false, error: "A tampered session token was accepted." };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error)?.message ?? "Token signing failed." };
  }
}

/** Verify and decode a sealed payload; returns null when tampered or malformed. */
export function open<T extends Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  if (!safeEqual(sig, signature(encoded))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString()) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
}
