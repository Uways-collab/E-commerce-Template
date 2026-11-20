import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/lib/repositories/orders";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-warning/40 text-warning",
  processing: "border-ink/25 text-ink",
  packed: "border-ink/25 text-ink",
  shipped: "border-accent/40 text-accent",
  delivered: "border-success/40 text-success",
  cancelled: "border-danger/40 text-danger",
  refunded: "border-danger/40 text-danger",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export default function OrderStatusChip({
  status,
  paymentStatus,
}: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={cn("chip", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>
      {paymentStatus !== "paid" && (
        <span className={cn("chip", paymentStatus === "failed" ? "border-danger/40 text-danger" : "text-muted")}>
          {PAYMENT_LABELS[paymentStatus]}
        </span>
      )}
    </span>
  );
}
