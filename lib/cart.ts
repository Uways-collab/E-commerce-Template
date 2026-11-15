import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getVariantById, type Product, type Variant } from "@/lib/repositories/catalog";
import { getSettings } from "@/lib/settings";
import {
  activeDeliveryMethods,
  computeTotals,
  evaluateCoupon,
  resolveDeliveryMethod,
  type CouponRecord,
  type Totals,
} from "@/lib/pricing";
import { newId } from "@/lib/utils";

export const CART_COOKIE = "pph_cart";
export const COUPON_COOKIE = "pph_coupon";
const MAX_LINES = 30;

interface CartCookieLine {
  v: string;
  q: number;
}

function parseCart(value: string | undefined): CartCookieLine[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line) => line && typeof line.v === "string" && Number.isFinite(Number(line.q)))
      .map((line) => ({ v: String(line.v), q: Math.max(1, Math.min(99, Math.floor(Number(line.q)))) }))
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export async function readCartCookie(): Promise<CartCookieLine[]> {
  const jar = await cookies();
  return parseCart(jar.get(CART_COOKIE)?.value);
}

async function writeCartCookie(lines: CartCookieLine[]) {
  const jar = await cookies();
  const value = JSON.stringify(lines.slice(0, MAX_LINES));
  jar.set(CART_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export interface CartLine {
  variantId: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  stock: number;
  available: boolean;
  product: Product;
  variant: Variant;
}

export interface Cart {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  totals: Totals;
  deliveryMethodId: string;
  couponCode: string | null;
  couponError: string | null;
  removed: { name: string; reason: string }[];
  deliveryOptions: ReturnType<typeof activeDeliveryMethods>;
}

export async function getCouponByCode(code: string): Promise<CouponRecord | null> {
  return (
    db().get<CouponRecord>("SELECT * FROM coupons WHERE upper(code) = upper(?)", [code.trim()]) ?? null
  );
}

export async function readCouponCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COUPON_COOKIE)?.value ?? null;
}

export async function writeCouponCookie(code: string | null) {
  const jar = await cookies();
  if (!code) {
    // `cookies().delete()` only emits a past `Expires` header; some clients
    // (and libcurl) keep the cookie unless `Max-Age=0` is present too.
    jar.set(COUPON_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return;
  }
  jar.set(COUPON_COOKIE, code.toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

/** Resolve the cookie cart against live catalogue data and price it. */
export async function getCart(deliveryMethodId?: string | null): Promise<Cart> {
  const settings = await getSettings();
  const raw = await readCartCookie();
  const removed: Cart["removed"] = [];
  const lines: CartLine[] = [];

  for (const line of raw) {
    const resolved = getVariantById(line.v);
    if (!resolved || resolved.product.status !== "active" || !resolved.isActive) {
      removed.push({ name: "An item", reason: "no longer available" });
      continue;
    }
    const maxQty = Math.min(settings.commerce.maxQuantityPerLine, Math.max(0, resolved.stock));
    if (maxQty <= 0) {
      removed.push({ name: resolved.product.name, reason: "sold out" });
      continue;
    }
    const quantity = Math.min(line.q, maxQty);
    if (quantity < line.q) {
      removed.push({ name: resolved.product.name, reason: `only ${maxQty} left — quantity adjusted` });
    }
    lines.push({
      variantId: resolved.id,
      quantity,
      unitPriceCents: resolved.unitPriceCents,
      lineTotalCents: resolved.unitPriceCents * quantity,
      size: resolved.size,
      colorName: resolved.colorName,
      colorHex: resolved.colorHex,
      stock: resolved.stock,
      available: true,
      product: resolved.product,
      variant: resolved,
    });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  const couponCode = await readCouponCookie();
  let coupon: CouponRecord | null = null;
  let couponError: string | null = null;
  if (couponCode) {
    coupon = await getCouponByCode(couponCode);
    const check = evaluateCoupon(coupon, subtotalCents);
    if (!check.ok) {
      couponError = check.reason;
      coupon = null;
    }
  }

  const deliveryOptions = activeDeliveryMethods(settings);
  const method = resolveDeliveryMethod(settings, deliveryMethodId);

  const totals = computeTotals({ settings, subtotalCents, coupon, deliveryMethod: method });

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents,
    totals,
    deliveryMethodId: method?.id ?? "none",
    couponCode: coupon ? coupon.code : couponCode,
    couponError,
    removed,
    deliveryOptions,
  };
}

export async function addToCart(variantId: string, quantity = 1): Promise<{ ok: boolean; message: string }> {
  const resolved = getVariantById(variantId);
  if (!resolved) return { ok: false, message: "That option is no longer available." };
  if (resolved.stock <= 0) return { ok: false, message: `${resolved.product.name} is sold out in that option.` };

  const settings = await getSettings();
  const lines = await readCartCookie();
  const existing = lines.find((line) => line.v === variantId);
  const cap = Math.min(settings.commerce.maxQuantityPerLine, resolved.stock);
  const before = existing?.q ?? 0;
  const requested = Math.max(1, Math.trunc(quantity));

  if (before >= cap) {
    return { ok: false, message: `Only ${cap} available in that option.` };
  }

  const after = Math.min(cap, before + requested);
  if (existing) {
    existing.q = after;
  } else {
    lines.push({ v: variantId, q: after });
  }

  await writeCartCookie(lines);

  const added = after - before;
  return {
    ok: true,
    message:
      added < requested
        ? `Only ${cap} available in that option — added ${added} to your basket.`
        : `Added ${resolved.product.name} to your basket.`,
  };
}

export async function removeCartLine(variantId: string) {
  const lines = (await readCartCookie()).filter((line) => line.v !== variantId);
  await writeCartCookie(lines);
  return getCart();
}

export async function setCartQuantity(variantId: string, quantity: number) {
  const settings = await getSettings();
  const resolved = getVariantById(variantId);
  const cap = Math.min(settings.commerce.maxQuantityPerLine, resolved ? resolved.stock : 0);
  const lines = (await readCartCookie())
    .map((line) => (line.v === variantId ? { ...line, q: Math.min(Math.max(0, quantity), cap) } : line))
    .filter((line) => line.q > 0);
  await writeCartCookie(lines);
  return getCart();
}

export async function clearCart() {
  await writeCartCookie([]);
  await writeCouponCookie(null);
}

/** Merge a guest cart into storage after login is not needed (cart is cookie
 *  based and survives auth), but checkout uses this to snapshot the basket. */
export function cartFingerprint(lines: CartLine[]) {
  return lines.map((line) => `${line.variantId}:${line.quantity}`).join("|");
}

export function cartToken() {
  return newId("cart");
}
