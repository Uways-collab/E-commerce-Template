"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  getOrderById,
  markOrderPaid,
  setPaymentReference,
  setTracking,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/repositories/orders";
import { ORDER_STATUSES, settlesPaymentOnDelivery, transitionError } from "@/lib/order-status";

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: "Order returned to awaiting payment.",
  processing: "Order marked as processing.",
  packed: "Order marked as packed.",
  shipped: "Order marked as shipped — the customer now sees tracking.",
  delivered: "Order marked as delivered.",
  cancelled: "Order cancelled — stock returned to the catalogue.",
  refunded: "Order refunded — stock returned to the catalogue.",
};

export interface AdminOrderState {
  ok?: boolean;
  message?: string;
  error?: string;
}

function refresh(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/account/orders");
}

export async function updateOrderStatusAction(
  _prev: AdminOrderState | null,
  formData: FormData,
): Promise<AdminOrderState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId || !ORDER_STATUSES.includes(status)) return { error: "Choose a valid status." };

  const order = getOrderById(orderId);
  if (!order) return { error: "That order no longer exists." };
  if (order.status === status) return { ok: true, message: `Order is already ${status}.` };

  // Fulfilment is a one-way street; invalid jumps are refused with a reason.
  const blocked = transitionError(order, status);
  if (blocked) return { error: blocked };

  updateOrderStatus(orderId, status, note || undefined);

  // Cash on delivery is settled at the doorstep, so delivering it also records
  // the payment — otherwise the order would ship "paid: false" forever.
  if (settlesPaymentOnDelivery(order, status)) {
    markOrderPaid(orderId, {
      reference: `COD-${order.orderNumber}`,
      note: note || "Cash collected on delivery",
    });
  }

  refresh(orderId);
  return { ok: true, message: STATUS_MESSAGES[status] };
}

/**
 * Manual payment reconciliation. This is deliberately explicit: an
 * administrator is confirming a real bank credit (or cash collection reference)
 * they have seen outside the system. Provider payments are verified through the
 * provider and can never be confirmed here.
 */
export async function recordManualPaymentAction(
  _prev: AdminOrderState | null,
  formData: FormData,
): Promise<AdminOrderState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const order = getOrderById(orderId);
  if (!order) return { error: "That order no longer exists." };
  if (order.paymentStatus === "paid") return { error: "This order is already marked as paid." };
  if (!reference) return { error: "Enter the bank or receipt reference you verified." };

  if (["paystack", "flutterwave"].includes(order.paymentMethod)) {
    refresh(orderId);
    return {
      error:
        "Provider payments cannot be confirmed manually. Paystack and Flutterwave orders are marked paid only by a verified provider callback.",
    };
  }

  setPaymentReference(orderId, reference);
  markOrderPaid(orderId, {
    reference,
    note: note || "Payment confirmed manually against bank statement",
  });
  refresh(orderId);
  return { ok: true, message: `Payment recorded — order marked paid against ${reference}.` };
}

export async function setTrackingAction(
  _prev: AdminOrderState | null,
  formData: FormData,
): Promise<AdminOrderState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const carrier = String(formData.get("carrier") ?? "").trim();
  if (!orderId) return { error: "Missing order." };
  if (!trackingNumber) return { error: "Enter a tracking number." };

  setTracking(orderId, trackingNumber, carrier || "Courier");
  refresh(orderId);
  return { ok: true, message: "Tracking saved — the customer sees it in their account." };
}
