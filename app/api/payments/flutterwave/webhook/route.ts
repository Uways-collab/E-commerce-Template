import { NextResponse } from "next/server";
import { getOrderByNumber, markOrderPaid, markPaymentFailed } from "@/lib/repositories/orders";
import { safeEqual } from "@/lib/sign";
import { verifyFlutterwave } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Flutterwave webhook. The shared secret hash is compared with the
 * `verif-hash` header, then the transaction is re-verified server-to-server.
 */
export async function POST(request: Request) {
  const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!expectedHash) {
    return NextResponse.json({ error: "Webhook hash not configured" }, { status: 503 });
  }

  const providedHash = request.headers.get("verif-hash");
  if (!providedHash || !safeEqual(providedHash, expectedHash)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    data?: { id?: number; status?: string; tx_ref?: string };
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const transaction = payload.data;
  if (!transaction?.tx_ref || !transaction.id) {
    return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });
  }
  if (transaction.status !== "successful") {
    return NextResponse.json({ received: true, ignored: transaction.status });
  }

  const order = getOrderByNumber(transaction.tx_ref);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ received: true, alreadyPaid: true });
  }

  const verification = await verifyFlutterwave(String(transaction.id), order, transaction.tx_ref);
  if (verification.paid) {
    markOrderPaid(order.id, {
      reference: String(transaction.id),
      method: "flutterwave",
      note: "Confirmed by Flutterwave webhook",
    });
    return NextResponse.json({ received: true, paid: true });
  }

  markPaymentFailed(order.id, verification.message);
  return NextResponse.json({ received: true, paid: false, reason: verification.message });
}
