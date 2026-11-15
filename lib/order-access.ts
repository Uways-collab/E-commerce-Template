import "server-only";
import { cookies } from "next/headers";

const COOKIE = "pph_orders";
const MAX = 8;

/**
 * Guest order confirmation is a capability URL: the order number is random and
 * only browsers that actually placed the order (or the signed-in owner) can
 * open the confirmation and tracking screen.
 */
export async function rememberOrder(orderNumber: string) {
  const jar = await cookies();
  const current = jar.get(COOKIE)?.value;
  let list: string[] = [];
  if (current) {
    try {
      const parsed = JSON.parse(current);
      if (Array.isArray(parsed)) list = parsed.filter((item): item is string => typeof item === "string");
    } catch {
      list = [];
    }
  }
  const next = [orderNumber, ...list.filter((item) => item !== orderNumber)].slice(0, MAX);
  jar.set(COOKIE, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function hasOrderAccess(orderNumber: string) {
  const jar = await cookies();
  const current = jar.get(COOKIE)?.value;
  if (!current) return false;
  try {
    const parsed = JSON.parse(current);
    return Array.isArray(parsed) && parsed.includes(orderNumber);
  } catch {
    return false;
  }
}
