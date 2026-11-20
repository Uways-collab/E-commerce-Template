import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getOrderByNumber, markOrderPaid, markPaymentFailed } from "@/lib/repositories/orders";
import { verifyPaystack } from "@/lib/payments";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Paystack webhook. Signature verified against the raw request body; the
 * transaction is then re-verified with the provider so a spoofed payload can
 * never mark an order as paid.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Paystack is not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");

  if (!signature || !safeEqual(signature, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: { reference?: string; metadata?: { order_number?: string } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: event.event });
  }

  const reference = event.data?.reference;
  const orderNumber = event.data?.metadata?.order_number;
  if (!reference || !orderNumber) {
    return NextResponse.json({ error: "Missing order reference" }, { status: 400 });
  }

  const order = getOrderByNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ received: true, alreadyPaid: true });
  }

  const verification = await verifyPaystack(reference, order);
  if (verification.paid) {
    markOrderPaid(order.id, {
      reference: verification.reference,
      method: "paystack",
      note: "Confirmed by Paystack webhook",
    });
    return NextResponse.json({ received: true, paid: true });
  }

  markPaymentFailed(order.id, verification.message);
  return NextResponse.json({ received: true, paid: false, reason: verification.message });
}
