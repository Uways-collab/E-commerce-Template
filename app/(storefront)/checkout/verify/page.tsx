import { notFound, redirect } from "next/navigation";
import { getOrderByNumber, markOrderPaid, markPaymentFailed } from "@/lib/repositories/orders";
import { verifyFlutterwave, verifyPaystack } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";
import { hasOrderAccess } from "@/lib/order-access";

export const metadata = { title: "Verifying payment", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | undefined>>;

/**
 * Provider return URL. The shopper's browser lands here after paying, but the
 * browser is never trusted: the transaction is verified server-to-server with
 * the provider (correct amount + currency) before the order is marked paid.
 *
 * Two further guards matter because this page mutates an order:
 *  1. the visitor must already hold the order (ownership or the capability
 *     cookie set when the order was placed);
 *  2. the provider must match the order's own payment method — the query string
 *     cannot pick a different provider.
 */
export default async function VerifyPaymentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderNumber = params.order;
  if (!orderNumber) notFound();

  const order = getOrderByNumber(orderNumber);
  if (!order) notFound();

  const [user, capability] = await Promise.all([getSessionUser(), hasOrderAccess(order.orderNumber)]);
  const isOwner = Boolean(user && order.userId && order.userId === user.id);
  if (!isOwner && !capability) notFound();

  const provider = params.provider ?? order.paymentMethod;
  if (provider !== order.paymentMethod) notFound();

  if (provider === "paystack") {
    const reference = params.reference ?? order.paymentReference ?? order.orderNumber;
    const verification = await verifyPaystack(reference, order);
    if (verification.paid) {
      markOrderPaid(order.id, {
        reference: verification.reference,
        method: "paystack",
        note: "Verified server-side with Paystack",
      });
      redirect(`/checkout/confirmation/${order.orderNumber}?payment=paid`);
    }
    // A network blip must not brand the order as failed — only a definitive
    // "no" from the provider does.
    if (!verification.inconclusive) markPaymentFailed(order.id, verification.message);
    redirect(
      `/checkout/confirmation/${order.orderNumber}?payment=${verification.inconclusive ? "unconfirmed" : "failed"}`,
    );
  }

  if (provider === "flutterwave") {
    const transactionId = params.transaction_id;
    if (params.status && params.status !== "successful") {
      markPaymentFailed(order.id, `Flutterwave reported status: ${params.status}`);
      redirect(`/checkout/confirmation/${order.orderNumber}?payment=failed`);
    }
    if (!transactionId) {
      redirect(`/checkout/confirmation/${order.orderNumber}?payment=unconfirmed`);
    }
    const verification = await verifyFlutterwave(transactionId, order, params.tx_ref ?? null);
    if (verification.paid) {
      markOrderPaid(order.id, {
        reference: String(transactionId),
        method: "flutterwave",
        note: "Verified server-side with Flutterwave",
      });
      redirect(`/checkout/confirmation/${order.orderNumber}?payment=paid`);
    }
    if (!verification.inconclusive) markPaymentFailed(order.id, verification.message);
    redirect(
      `/checkout/confirmation/${order.orderNumber}?payment=${verification.inconclusive ? "unconfirmed" : "failed"}`,
    );
  }

  redirect(`/checkout/confirmation/${order.orderNumber}`);
}
