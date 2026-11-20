"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addToCart,
  clearCart,
  getCart,
  getCouponByCode,
  readCouponCookie,
  removeCartLine,
  setCartQuantity,
  writeCouponCookie,
} from "@/lib/cart";
import { evaluateCoupon } from "@/lib/pricing";

export interface CartActionResult {
  ok: boolean;
  message: string;
  itemCount: number;
}

function refreshCartPaths() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function addToCartAction(variantId: string, quantity = 1): Promise<CartActionResult> {
  const result = await addToCart(variantId, quantity);
  const cart = await getCart();
  refreshCartPaths();
  return { ...result, itemCount: cart.itemCount };
}

export async function setQuantityAction(variantId: string, quantity: number): Promise<CartActionResult> {
  const cart = await setCartQuantity(variantId, quantity);
  refreshCartPaths();
  return {
    ok: true,
    message: quantity <= 0 ? "Removed from basket." : "Basket updated.",
    itemCount: cart.itemCount,
  };
}

export async function removeLineAction(variantId: string): Promise<CartActionResult> {
  const cart = await removeCartLine(variantId);
  refreshCartPaths();
  return { ok: true, message: "Removed from basket.", itemCount: cart.itemCount };
}

export async function applyCouponAction(code: string): Promise<{ ok: boolean; message: string }> {
  const clean = code.trim();
  if (!clean) return { ok: false, message: "Enter a discount code." };

  const coupon = await getCouponByCode(clean);
  const cart = await getCart();
  const check = evaluateCoupon(coupon, cart.subtotalCents);
  if (!check.ok) return { ok: false, message: check.reason };

  await writeCouponCookie(check.coupon.code);
  refreshCartPaths();
  return { ok: true, message: `${check.coupon.code} applied.` };
}

export async function removeCouponAction(): Promise<{ ok: boolean; message: string }> {
  await writeCouponCookie(null);
  refreshCartPaths();
  return { ok: true, message: "Discount removed." };
}

export async function getStoredCouponCode() {
  return readCouponCookie();
}

export async function clearCartAction(): Promise<CartActionResult> {
  await clearCart();
  refreshCartPaths();
  return { ok: true, message: "Basket emptied.", itemCount: 0 };
}

export async function buyNowAction(variantId: string, quantity = 1): Promise<CartActionResult> {
  const result = await addToCart(variantId, quantity);
  if (!result.ok) {
    const cart = await getCart();
    return { ...result, itemCount: cart.itemCount };
  }
  refreshCartPaths();
  redirect("/checkout");
  return { ok: true, message: "Redirecting to checkout.", itemCount: 0 };
}
