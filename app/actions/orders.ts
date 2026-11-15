"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/repositories/orders";
import { addToCart } from "@/lib/cart";

/** Re-add every available line from a past order to the basket. */
export async function reorderAction(formData: FormData) {
  const user = await getSessionUser();
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const order = getOrderByNumber(orderNumber, user ? { userId: user.id } : {});
  if (!order) redirect("/account/orders");

  for (const item of order.items) {
    if (item.variantId) {
      await addToCart(item.variantId, item.quantity);
    }
  }
  redirect("/cart");
}
