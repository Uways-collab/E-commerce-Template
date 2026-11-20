import { describe, expect, it } from "vitest";
import { allowedStatuses, settlesPaymentOnDelivery, transitionError } from "@/lib/order-status";
import type { OrderStatus, PaymentStatus } from "@/lib/repositories/orders";

function order(status: OrderStatus, paymentStatus: PaymentStatus = "paid", paymentMethod = "bank_transfer") {
  return { status, paymentStatus, paymentMethod };
}

describe("order lifecycle", () => {
  it("moves forward through fulfilment", () => {
    expect(transitionError(order("pending"), "processing")).toBeNull();
    expect(transitionError(order("processing"), "packed")).toBeNull();
    expect(transitionError(order("packed"), "shipped")).toBeNull();
    expect(transitionError(order("shipped"), "delivered")).toBeNull();
    expect(transitionError(order("delivered"), "refunded")).toBeNull();
  });

  it("refuses to travel backwards", () => {
    expect(transitionError(order("delivered"), "pending")).toMatch(/cannot be marked/i);
    expect(transitionError(order("shipped"), "processing")).toMatch(/cannot be marked/i);
    expect(transitionError(order("packed"), "pending")).toMatch(/cannot be marked/i);
  });

  it("refuses to revive a cancelled or refunded order", () => {
    expect(allowedStatuses(order("cancelled"))).toEqual(["refunded"]);
    expect(allowedStatuses(order("refunded"))).toEqual([]);
    expect(transitionError(order("cancelled"), "shipped")).toMatch(/cannot be marked/i);
    expect(transitionError(order("refunded"), "processing")).toMatch(/cannot be marked/i);
  });

  it("requires payment before shipping, except cash on delivery", () => {
    expect(transitionError(order("packed", "unpaid"), "shipped")).toMatch(/confirm the payment/i);
    expect(transitionError(order("packed", "failed"), "shipped")).toMatch(/confirm the payment/i);
    expect(transitionError(order("packed", "unpaid", "cod"), "shipped")).toBeNull();
    expect(transitionError(order("shipped", "unpaid", "cod"), "delivered")).toBeNull();
  });

  it("only refunds paid orders", () => {
    expect(transitionError(order("delivered", "unpaid"), "refunded")).toMatch(/only a paid order/i);
    expect(transitionError(order("delivered", "paid"), "refunded")).toBeNull();
  });

  it("treats same-status updates as refused no-ops", () => {
    expect(transitionError(order("processing"), "processing")).toMatch(/already/i);
  });

  it("rejects unknown status strings", () => {
    expect(transitionError(order("processing"), "teleported" as OrderStatus)).toMatch(/valid status/i);
  });

  it("settles cash on delivery when it is handed over", () => {
    expect(settlesPaymentOnDelivery(order("shipped", "unpaid", "cod"), "delivered")).toBe(true);
    expect(settlesPaymentOnDelivery(order("shipped", "paid", "cod"), "delivered")).toBe(false);
    expect(settlesPaymentOnDelivery(order("packed", "unpaid"), "shipped")).toBe(false);
  });
});
