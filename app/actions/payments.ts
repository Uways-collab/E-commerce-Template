"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getOrderByNumber, setPaymentReference } from "@/lib/repositories/orders";
import { initializeFlutterwave, initializePaystack } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";
import { hasOrderAccess } from "@/lib/order-access";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Re-open a provider payment session for an order that is still unpaid.
 * Authorised for the signed-in owner or the browser holding the capability
 * cookie for that order — a server action is directly invokable, so the page
 * guard alone is not enough.
 */
export async function retryPaymentAction(formData: FormData) {
  const orderNumber = String(formData.get("order") ?? "");
  const order = getOrderByNumber(orderNumber);
  if (!order || order.paymentStatus === "paid" || order.status === "cancelled") {
    redirect(order ? `/checkout/confirmation/${orderNumber}` : "/shop");
  }

  const user = await getSessionUser();
  const isOwner = Boolean(user && order.userId && order.userId === user.id);
  const capability = await hasOrderAccess(order.orderNumber);
  if (!isOwner && !capability) redirect("/account/orders");

  const base = await origin();
  const callback = `${base}/checkout/verify?provider=${order.paymentMethod}&order=${encodeURIComponent(order.orderNumber)}`;

  if (order.paymentMethod === "paystack") {
    const result = await initializePaystack({ order, callbackUrl: callback, currency: order.currency });
    if (result.ok && result.kind === "redirect") {
      setPaymentReference(order.id, result.reference ?? order.orderNumber);
      redirect(result.url);
    }
  }

  if (order.paymentMethod === "flutterwave") {
    const result = await initializeFlutterwave({ order, redirectUrl: callback, currency: order.currency });
    if (result.ok && result.kind === "redirect") {
      setPaymentReference(order.id, order.orderNumber);
      redirect(result.url);
    }
  }

  if (order.paymentMethod === "bank_transfer" || order.paymentMethod === "cod") {
    redirect(`/checkout/confirmation/${order.orderNumber}`);
  }

  redirect(`/checkout/confirmation/${order.orderNumber}?payment=failed`);
}
