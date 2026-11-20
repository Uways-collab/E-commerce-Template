import "server-only";
import type { Order } from "@/lib/repositories/orders";
import type { StoreSettings } from "@/lib/settings";

/**
 * Payment integration layer.
 *
 * Principles:
 *  1. Secrets live in server-only environment variables. Nothing sensitive is
 *     ever sent to the browser.
 *  2. An order is only marked paid after the provider itself confirms the
 *     transaction — server-to-server verification (or a signature-verified
 *     webhook) whose amount and currency match the order exactly.
 *  3. Initialisation failures never fake success; the order stays unpaid and
 *     the shopper is given a clear next step.
 */

const TIMEOUT_MS = 15_000;

export type PaymentInitResult =
  | { ok: true; kind: "redirect"; url: string; reference?: string }
  | { ok: true; kind: "manual"; instructions: string }
  | { ok: false; message: string };

function amountMatches(actual: number, expected: number) {
  // Providers report in minor or major units; allow a 1-unit rounding delta.
  return Math.abs(actual - expected) <= 1;
}

/* -------------------------------------------------------------------------- */
/* Paystack                                                                   */
/* -------------------------------------------------------------------------- */

export async function initializePaystack({
  order,
  callbackUrl,
  currency,
}: {
  order: Order;
  callbackUrl: string;
  currency: string;
}): Promise<PaymentInitResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return {
      ok: false,
      message:
        "Card payments are not enabled on this store yet. Choose bank transfer or cash on delivery, or add PAYSTACK_SECRET_KEY to the server environment.",
    };
  }

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: order.email,
        amount: order.totalCents,
        currency,
        reference: `${order.orderNumber}-${Date.now().toString(36)}`,
        callback_url: callbackUrl,
        metadata: {
          order_number: order.orderNumber,
          customer_name: order.customerName,
          custom_fields: [
            { display_name: "Order", variable_name: "order", value: order.orderNumber },
          ],
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } }
      | null;

    if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
      return {
        ok: false,
        message: payload?.message ?? "Paystack could not start this payment. Please try again.",
      };
    }

    return {
      ok: true,
      kind: "redirect",
      url: payload.data.authorization_url,
      reference: payload.data.reference,
    };
  } catch {
    return {
      ok: false,
      message: "We could not reach Paystack. Check your connection and try again.",
    };
  }
}

export interface PaymentVerification {
  paid: boolean;
  message: string;
  reference: string | null;
  amount: number | null;
  /**
   * True when the provider could not give a definitive answer (not configured,
   * network error, 5xx) as opposed to a clear "this payment failed". Callers
   * must not mark an order as failed on an inconclusive result.
   */
  inconclusive?: boolean;
}

export async function verifyPaystack(reference: string, order: Order): Promise<PaymentVerification> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return { paid: false, message: "Paystack is not configured.", reference, amount: null, inconclusive: true };
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          status?: boolean;
          message?: string;
          data?: { status?: string; amount?: number; currency?: string; reference?: string };
        }
      | null;

    if (!response.ok || !payload?.status || !payload.data) {
      return {
        paid: false,
        message: payload?.message ?? "Paystack could not verify this transaction yet.",
        reference,
        amount: null,
        inconclusive: true,
      };
    }

    const data = payload.data;
    if (data.status !== "success") {
      return { paid: false, message: `Payment was not completed (status: ${data.status}).`, reference, amount: data.amount ?? null };
    }
    if (typeof data.amount !== "number" || !amountMatches(data.amount, order.totalCents)) {
      return {
        paid: false,
        message: "The amount paid does not match this order. No order has been marked as paid.",
        reference,
        amount: data.amount ?? null,
      };
    }
    if (data.currency && data.currency !== order.currency) {
      return { paid: false, message: "The payment currency does not match this order.", reference, amount: data.amount };
    }

    return { paid: true, message: "Payment verified by Paystack.", reference: data.reference ?? reference, amount: data.amount };
  } catch {
    return {
      paid: false,
      message: "Could not reach Paystack to verify this payment.",
      reference,
      amount: null,
      inconclusive: true,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Flutterwave                                                                */
/* -------------------------------------------------------------------------- */

export async function initializeFlutterwave({
  order,
  redirectUrl,
  currency,
}: {
  order: Order;
  redirectUrl: string;
  currency: string;
}): Promise<PaymentInitResult> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    return {
      ok: false,
      message:
        "Flutterwave is not enabled on this store yet. Choose bank transfer or cash on delivery, or add FLUTTERWAVE_SECRET_KEY to the server environment.",
    };
  }

  try {
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: order.orderNumber,
        amount: (order.totalCents / 100).toFixed(2),
        currency,
        redirect_url: redirectUrl,
        customer: {
          email: order.email,
          phonenumber: order.phone,
          name: order.customerName,
        },
        customizations: {
          title: "Order payment",
          description: `Payment for order ${order.orderNumber}`,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: string; message?: string; data?: { link?: string } }
      | null;

    if (!response.ok || payload?.status !== "success" || !payload.data?.link) {
      return { ok: false, message: payload?.message ?? "Flutterwave could not start this payment." };
    }

    return { ok: true, kind: "redirect", url: payload.data.link };
  } catch {
    return { ok: false, message: "We could not reach Flutterwave. Check your connection and try again." };
  }
}

export async function verifyFlutterwave(
  transactionId: string,
  order: Order,
  expectedReference?: string | null,
): Promise<PaymentVerification> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    return { paid: false, message: "Flutterwave is not configured.", reference: transactionId, amount: null, inconclusive: true };
  }

  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | {
          status?: string;
          message?: string;
          data?: { status?: string; amount?: number; currency?: string; tx_ref?: string; id?: number };
        }
      | null;

    if (!response.ok || payload?.status !== "success" || !payload.data) {
      return {
        paid: false,
        message: payload?.message ?? "Flutterwave could not verify this transaction yet.",
        reference: transactionId,
        amount: null,
        inconclusive: true,
      };
    }

    const data = payload.data;
    const reference = data.tx_ref ?? expectedReference ?? null;

    if (data.status !== "successful") {
      return { paid: false, message: `Payment was not completed (status: ${data.status}).`, reference, amount: data.amount ?? null };
    }
    if (typeof data.amount !== "number" || !amountMatches(Math.round(data.amount * 100), order.totalCents)) {
      return {
        paid: false,
        message: "The amount paid does not match this order. No order has been marked as paid.",
        reference,
        amount: data.amount ?? null,
      };
    }
    if (data.currency && data.currency !== order.currency) {
      return { paid: false, message: "The payment currency does not match this order.", reference, amount: data.amount };
    }
    if (data.tx_ref && data.tx_ref !== order.orderNumber) {
      return { paid: false, message: "This transaction belongs to a different order.", reference, amount: data.amount };
    }

    return { paid: true, message: "Payment verified by Flutterwave.", reference, amount: data.amount };
  } catch {
    return {
      paid: false,
      message: "Could not reach Flutterwave to verify this payment.",
      reference: transactionId,
      amount: null,
      inconclusive: true,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Manual methods                                                             */
/* -------------------------------------------------------------------------- */

export function bankTransferInstructions(settings: StoreSettings, order: Order) {
  const bank = settings.commerce.payments.bankTransfer;
  return {
    bankName: bank.bankName,
    accountName: bank.accountName,
    accountNumber: bank.accountNumber,
    reference: order.orderNumber,
    amount: order.totalCents,
    instructions: bank.instructions,
  };
}

export function codNote(settings: StoreSettings) {
  return settings.commerce.payments.codNote;
}

/** Available payment methods that can actually be offered right now. */
export function availablePaymentMethods(settings: StoreSettings) {
  return settings.commerce.payments.enabled.filter((method) => {
    if (method === "paystack") return Boolean(process.env.PAYSTACK_SECRET_KEY);
    if (method === "flutterwave") return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
    return true;
  });
}
