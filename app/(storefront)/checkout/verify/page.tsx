import { notFound, redirect } from "next/navigation";
import { getOrderByNumber, markOrderPaid, markPaymentFailed } from "@/lib/repositories/orders";
import { verifyFlutterwave, verifyPaystack } from "@/lib/payments";

export const metadata = { title: "Verifying payment", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | undefined>>;

/**
 * Provider return URL. The shopper's browser lands here after paying, but the
 * browser is never trusted: the transaction is verified server-to-server with
 * the provider (correct amount + currency) before the order is marked paid.
 */
export default async function VerifyPaymentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderNumber = params.order;
  if (!orderNumber) notFound();

  const order = getOrderByNumber(orderNumber);
  if (!order) notFound();

  const provider = params.provider ?? order.paymentMethod;

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
    markPaymentFailed(order.id, verification.message);
    redirect(`/checkout/confirmation/${order.orderNumber}?payment=failed`);
  }

  if (provider === "flutterwave") {
    const transactionId = params.transaction_id;
    if (params.status && params.status !== "successful") {
      markPaymentFailed(order.id, `Flutterwave reported status: ${params.status}`);
      redirect(`/checkout/confirmation/${order.orderNumber}?payment=failed`);
    }
    if (!transactionId) {
      markPaymentFailed(order.id, "Flutterwave did not return a transaction reference.");
      redirect(`/checkout/confirmation/${order.orderNumber}?payment=failed`);
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
    markPaymentFailed(order.id, verification.message);
    redirect(`/checkout/confirmation/${order.orderNumber}?payment=failed`);
  }

  redirect(`/checkout/confirmation/${order.orderNumber}`);
}
