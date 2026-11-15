"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { getCart } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { rememberOrder } from "@/lib/order-access";
import { createOrder, setPaymentReference, StockError, type Order } from "@/lib/repositories/orders";
import { availablePaymentMethods, initializeFlutterwave, initializePaystack } from "@/lib/payments";

export interface CheckoutState {
  error?: string;
  fieldErrors?: Record<string, string>;
  orderNumber?: string;
}

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a delivery phone number.").max(32),
  fullName: z.string().trim().min(2, "Enter the recipient’s full name.").max(120),
  line1: z.string().trim().min(3, "Enter the street address.").max(180),
  line2: z.string().trim().max(180).optional().default(""),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().trim().max(80).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  country: z.string().trim().min(2, "Enter the country.").max(80),
  deliveryMethod: z.string().min(1, "Choose a delivery method."),
  paymentMethod: z.enum(["paystack", "flutterwave", "bank_transfer", "cod"]),
  notes: z.string().trim().max(600).optional().default(""),
  marketingOptIn: z.string().optional(),
});

async function resolveOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function paymentCallback(order: Order, provider: "paystack" | "flutterwave", origin: string) {
  return `${origin}/checkout/verify?provider=${provider}&order=${encodeURIComponent(order.orderNumber)}`;
}

/**
 * Creates the order, then hands off to the chosen payment method.
 * No order is ever marked paid here — only verified provider callbacks or a
 * signed webhook can do that.
 */
export async function placeOrderAction(_prev: CheckoutState | null, formData: FormData): Promise<CheckoutState> {
  const settings = await getSettings();

  const parsed = schema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? "",
    city: formData.get("city"),
    state: formData.get("state") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country"),
    deliveryMethod: formData.get("deliveryMethod"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") ?? "",
    marketingOptIn: formData.get("marketingOptIn") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;
  const limit = rateLimit(`checkout:${input.email.toLowerCase()}`, 8, 10 * 60_000);
  if (!limit.allowed) {
    return { error: "Too many checkout attempts. Please wait a few minutes and try again." };
  }

  if (!availablePaymentMethods(settings).includes(input.paymentMethod)) {
    return {
      error:
        "That payment method is not available right now. Choose another option — nothing has been charged.",
    };
  }

  const cart = await getCart(input.deliveryMethod);
  if (!cart.lines.length) {
    return { error: "Your basket is empty. Add a piece before checking out." };
  }
  if (cart.deliveryMethodId !== input.deliveryMethod) {
    return { error: "That delivery method is no longer available. Please reselect it." };
  }

  const user = await getSessionUser();
  const origin = await resolveOrigin();

  try {
    const order = createOrder({
      userId: user?.id ?? null,
      email: input.email,
      phone: input.phone,
      customerName: input.fullName,
      shippingAddress: {
        fullName: input.fullName,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.state || null,
        postalCode: input.postalCode || null,
        country: input.country,
      },
      deliveryMethod: cart.deliveryMethodId,
      deliveryLabel: cart.totals.deliveryLabel,
      totals: cart.totals,
      currency: settings.locale.currency,
      couponCode: cart.totals.appliedCoupon?.code ?? null,
      paymentMethod: input.paymentMethod,
      notes: input.notes || null,
      items: cart.lines.map((line) => ({
        productId: line.product.id,
        variantId: line.variantId,
        name: line.product.name,
        slug: line.product.slug,
        size: line.size,
        color: line.colorName,
        image: line.product.images[0] ?? null,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
      })),
      initialPaymentStatus: input.paymentMethod === "cod" ? "unpaid" : "pending",
    });

    await rememberOrder(order.orderNumber);
    const { clearCart } = await import("@/lib/cart");
    await clearCart();

    if (input.paymentMethod === "bank_transfer" || input.paymentMethod === "cod") {
      redirect(`/checkout/confirmation/${order.orderNumber}`);
    }

    if (input.paymentMethod === "paystack") {
      const result = await initializePaystack({
        order,
        callbackUrl: paymentCallback(order, "paystack", origin),
        currency: settings.locale.currency,
      });
      if (result.ok && result.kind === "redirect") {
        setPaymentReference(order.id, result.reference ?? order.orderNumber);
        redirect(result.url);
      }
      return {
        error: result.ok
          ? "Paystack did not return a payment link. Your order is saved — retry payment from the confirmation page."
          : result.message,
        orderNumber: order.orderNumber,
      };
    }

    if (input.paymentMethod === "flutterwave") {
      const result = await initializeFlutterwave({
        order,
        redirectUrl: paymentCallback(order, "flutterwave", origin),
        currency: settings.locale.currency,
      });
      if (result.ok && result.kind === "redirect") {
        setPaymentReference(order.id, result.reference ?? order.orderNumber);
        redirect(result.url);
      }
      return {
        error: result.ok
          ? "Flutterwave did not return a payment link. Your order is saved — retry payment from the confirmation page."
          : result.message,
        orderNumber: order.orderNumber,
      };
    }

    redirect(`/checkout/confirmation/${order.orderNumber}`);
  } catch (error) {
    if (error instanceof StockError) {
      return {
        error: `${error.productName} sold out while you were checking out. Adjust your basket and try again — you have not been charged.`,
      };
    }
    if (error && typeof error === "object" && "digest" in error) throw error; // redirect()
    console.error("checkout failed", error);
    return { error: "Something went wrong placing your order. Please try again." };
  }
}
