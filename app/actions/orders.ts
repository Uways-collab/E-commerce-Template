"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/repositories/orders";
import { addToCart } from "@/lib/cart";

/**
 * Re-add every available line from a past order to the basket.
 * Ownership is enforced here, not only on the page: server actions are
 * directly invokable, so the order must belong to the signed-in customer.
 */
export async function reorderAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent("/account/orders")}`);

  const orderNumber = String(formData.get("orderNumber") ?? "");
  const order = getOrderByNumber(orderNumber, { userId: user.id });
  if (!order) redirect("/account/orders");
  if (order.status === "cancelled" || order.status === "refunded") redirect("/account/orders");

  for (const item of order.items) {
    if (item.variantId) {
      await addToCart(item.variantId, item.quantity);
    }
  }
  redirect("/cart");
}
