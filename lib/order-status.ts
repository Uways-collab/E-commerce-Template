import type { OrderStatus, PaymentStatus } from "@/lib/repositories/orders";

/**
 * Order lifecycle rules.
 *
 * Fulfilment only moves forward (pending → processing → packed → shipped →
 * delivered) and endings are terminal: a shipped or delivered order is never
 * "cancelled" (that is a refund), and a cancelled/refunded order cannot be
 * revived. Reviving a cancelled order would also re-sell stock that was already
 * returned to the catalogue, so the rule doubles as an inventory guard.
 */

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export interface TransitionSubject {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
}

/** Statuses an admin may move this order to (never includes the current one). */
export function allowedStatuses(order: TransitionSubject): OrderStatus[] {
  return ALLOWED[order.status] ?? [];
}

/**
 * Returns a human-readable reason the transition is refused, or `null` when it
 * is allowed.
 */
export function transitionError(order: TransitionSubject, next: OrderStatus): string | null {
  if (!ORDER_STATUSES.includes(next)) return "Choose a valid status.";
  if (next === order.status) return `This order is already ${ORDER_STATUS_LABELS[next].toLowerCase()}.`;

  const allowed = allowedStatuses(order);
  if (!allowed.includes(next)) {
    return `An order that is ${ORDER_STATUS_LABELS[order.status].toLowerCase()} cannot be marked ${
      ORDER_STATUS_LABELS[next].toLowerCase()
    }.`;
  }

  const paid = order.paymentStatus === "paid";
  const cashOnDelivery = order.paymentMethod === "cod";

  // Never ship or deliver stock we have not been paid for, except cash on
  // delivery (the courier collects on the doorstep).
  if ((next === "shipped" || next === "delivered") && !paid && !cashOnDelivery) {
    return "Confirm the payment first — this order has not been paid.";
  }

  if (next === "refunded" && !paid) {
    return "Only a paid order can be refunded.";
  }

  return null;
}

/** True when delivering this order should also record payment (cash on delivery). */
export function settlesPaymentOnDelivery(order: TransitionSubject, next: OrderStatus): boolean {
  return next === "delivered" && order.paymentStatus !== "paid" && order.paymentMethod === "cod";
}
