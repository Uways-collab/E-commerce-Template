import "server-only";
import { cookies } from "next/headers";
import { open, seal } from "@/lib/sign";

const COOKIE = "pph_orders";
const MAX = 8;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

interface OrderAccessPayload extends Record<string, unknown> {
  orders: string[];
  exp: number;
}

async function readPayload(): Promise<OrderAccessPayload | null> {
  const jar = await cookies();
  const payload = open<OrderAccessPayload>(jar.get(COOKIE)?.value);
  if (!payload || !Array.isArray(payload.orders)) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

function writePayload(jar: Awaited<ReturnType<typeof cookies>>, orders: string[]) {
  jar.set(
    COOKIE,
    seal({ orders: orders.slice(0, MAX), exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  );
}

/**
 * Guest order confirmation is a capability: the order number is random and
 * this HMAC-signed cookie proves *this browser* actually placed the order.
 * The signature stops a visitor from editing the cookie to add other people's
 * order numbers.
 */
export async function rememberOrder(orderNumber: string) {
  const jar = await cookies();
  const current = await readPayload();
  const list = current?.orders ?? [];
  writePayload(jar, [orderNumber, ...list.filter((entry) => entry !== orderNumber)]);
}

export async function hasOrderAccess(orderNumber: string) {
  const payload = await readPayload();
  return Boolean(payload?.orders.includes(orderNumber));
}

/** Used by the order lookup flow once ownership is proven by email. */
export async function grantOrderAccess(orderNumbers: string[]) {
  const jar = await cookies();
  const current = await readPayload();
  const merged = [...new Set([...orderNumbers, ...(current?.orders ?? [])])].slice(0, MAX);
  writePayload(jar, merged);
}
