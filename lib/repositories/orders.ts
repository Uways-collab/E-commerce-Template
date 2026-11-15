import "server-only";
import { db } from "@/lib/db";
import { newId, orderNumber, parseJson } from "@/lib/utils";
import type { Totals } from "@/lib/pricing";

export type OrderStatus =
  | "pending"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export interface OrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
}

export interface OrderEvent {
  at: string;
  label: string;
  note?: string;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  email: string;
  phone: string;
  customerName: string;
  shippingAddress: OrderAddress;
  deliveryMethod: string;
  deliveryLabel: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  couponCode: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  paymentReference: string | null;
  paymentNote: string | null;
  notes: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  timeline: OrderEvent[];
  stockReleased: boolean;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  items: OrderItem[];
}

type RawOrder = Record<string, unknown>;

function mapOrder(row: RawOrder, items: OrderItem[] = []): Order {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    userId: (row.user_id as string) ?? null,
    email: String(row.email),
    phone: String(row.phone),
    customerName: String(row.customer_name),
    shippingAddress: parseJson<OrderAddress>(row.shipping_address, {
      fullName: String(row.customer_name),
      phone: String(row.phone),
      line1: "",
      city: "",
      country: "",
    }),
    deliveryMethod: String(row.delivery_method),
    deliveryLabel: String(row.delivery_label),
    subtotalCents: Number(row.subtotal_cents),
    discountCents: Number(row.discount_cents),
    shippingCents: Number(row.shipping_cents),
    taxCents: Number(row.tax_cents),
    totalCents: Number(row.total_cents),
    currency: String(row.currency),
    couponCode: (row.coupon_code as string) ?? null,
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    paymentMethod: String(row.payment_method),
    paymentReference: (row.payment_reference as string) ?? null,
    paymentNote: (row.payment_note as string) ?? null,
    notes: (row.notes as string) ?? null,
    trackingNumber: (row.tracking_number as string) ?? null,
    trackingCarrier: (row.tracking_carrier as string) ?? null,
    timeline: parseJson<OrderEvent[]>(row.timeline, []),
    stockReleased: Boolean(row.stock_released),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    paidAt: (row.paid_at as string) ?? null,
    items,
  };
}

function mapItem(row: RawOrder): OrderItem {
  return {
    id: String(row.id),
    productId: (row.product_id as string) ?? null,
    variantId: (row.variant_id as string) ?? null,
    name: String(row.name),
    slug: String(row.slug),
    size: (row.size as string) ?? null,
    color: (row.color as string) ?? null,
    image: (row.image as string) ?? null,
    unitPriceCents: Number(row.unit_price_cents),
    quantity: Number(row.quantity),
    lineTotalCents: Number(row.line_total_cents),
  };
}

function attachItems(orders: Order[]): Order[] {
  if (!orders.length) return orders;
  const ids = orders.map((order) => order.id);
  const items = db().all<RawOrder>(
    `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const grouped = new Map<string, OrderItem[]>();
  for (const item of items) {
    const list = grouped.get(String(item.order_id)) ?? [];
    list.push(mapItem(item));
    grouped.set(String(item.order_id), list);
  }
  return orders.map((order) => ({ ...order, items: grouped.get(order.id) ?? [] }));
}

export interface CreateOrderInput {
  userId?: string | null;
  email: string;
  phone: string;
  customerName: string;
  shippingAddress: OrderAddress;
  deliveryMethod: string;
  deliveryLabel: string;
  totals: Totals;
  currency: string;
  couponCode?: string | null;
  paymentMethod: string;
  notes?: string | null;
  items: {
    productId: string;
    variantId: string;
    name: string;
    slug: string;
    size: string | null;
    color: string | null;
    image: string | null;
    unitPriceCents: number;
    quantity: number;
  }[];
  initialPaymentStatus: PaymentStatus;
  paymentReference?: string | null;
}

export class StockError extends Error {
  constructor(public readonly productName: string) {
    super(`Not enough stock for ${productName}`);
    this.name = "StockError";
  }
}

/**
 * Creates an order inside a single transaction: re-checks stock, decrements
 * inventory, writes order items, records the timeline and redeems the coupon.
 */
export function createOrder(input: CreateOrderInput): Order {
  const id = newId("ord");
  const number = orderNumber();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  db().transaction(() => {
    for (const item of input.items) {
      const variant = db().get<{ stock: number; product_id: string }>(
        "SELECT stock, product_id FROM variants WHERE id = ?",
        [item.variantId],
      );
      if (!variant || variant.stock < item.quantity) {
        throw new StockError(item.name);
      }
    }

    db().run(
      `INSERT INTO orders (id, order_number, user_id, email, phone, customer_name, shipping_address,
         delivery_method, delivery_label, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
         currency, coupon_code, status, payment_status, payment_method, payment_reference, notes, timeline,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        number,
        input.userId ?? null,
        input.email,
        input.phone,
        input.customerName,
        JSON.stringify(input.shippingAddress),
        input.deliveryMethod,
        input.deliveryLabel,
        input.totals.subtotalCents,
        input.totals.discountCents,
        input.totals.shippingCents,
        input.totals.taxCents,
        input.totals.totalCents,
        input.currency,
        input.couponCode ?? null,
        input.initialPaymentStatus,
        input.paymentMethod,
        input.paymentReference ?? null,
        input.notes ?? null,
        JSON.stringify([
          {
            at: now,
            label: "Order placed",
            note: `Awaiting ${input.paymentMethod === "cod" ? "delivery" : "payment"} confirmation`,
          },
        ] as OrderEvent[]),
        now,
        now,
      ],
    );

    for (const item of input.items) {
      db().run(
        `INSERT INTO order_items (id, order_id, product_id, variant_id, name, slug, size, color, image,
           unit_price_cents, quantity, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId("oit"),
          id,
          item.productId,
          item.variantId,
          item.name,
          item.slug,
          item.size,
          item.color,
          item.image,
          item.unitPriceCents,
          item.quantity,
          item.unitPriceCents * item.quantity,
        ],
      );

      db().run("UPDATE variants SET stock = stock - ? WHERE id = ?", [item.quantity, item.variantId]);
      db().run(
        `INSERT INTO inventory_logs (id, variant_id, product_id, delta, reason, order_id)
         VALUES (?, ?, ?, ?, 'order_placed', ?)`,
        [newId("inv"), item.variantId, item.productId, -item.quantity, id],
      );
    }

    if (input.couponCode) {
      db().run("UPDATE coupons SET used_count = used_count + 1 WHERE upper(code) = upper(?)", [
        input.couponCode,
      ]);
    }
  });

  return getOrderById(id)!;
}

export function getOrderById(id: string): Order | null {
  const row = db().get<RawOrder>("SELECT * FROM orders WHERE id = ?", [id]);
  if (!row) return null;
  return attachItems([mapOrder(row)])[0];
}

export function getOrderByNumber(number: string, options: { userId?: string | null; email?: string } = {}): Order | null {
  const row = db().get<RawOrder>("SELECT * FROM orders WHERE upper(order_number) = upper(?)", [number]);
  if (!row) return null;
  const order = attachItems([mapOrder(row)])[0];
  if (options.userId && order.userId !== options.userId) return null;
  if (options.email && order.email.toLowerCase() !== options.email.toLowerCase()) return null;
  return order;
}

export interface OrderFilters {
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
  q?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export function listOrders(filters: OrderFilters = {}): { orders: Order[]; total: number } {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status && filters.status !== "all") {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    where.push("payment_status = ?");
    params.push(filters.paymentStatus);
  }
  if (filters.userId) {
    where.push("user_id = ?");
    params.push(filters.userId);
  }
  if (filters.q) {
    where.push("(lower(order_number) LIKE ? OR lower(email) LIKE ? OR lower(customer_name) LIKE ?)");
    const like = `%${filters.q.toLowerCase()}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const rows = db().all<RawOrder>(
    `SELECT * FROM orders ${clause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const total = db().get<{ n: number }>(`SELECT COUNT(*) AS n FROM orders ${clause}`, params);

  return { orders: attachItems(rows.map((row) => mapOrder(row))), total: Number(total?.n ?? 0) };
}

function appendTimeline(order: Order, label: string, note?: string) {
  const timeline: OrderEvent[] = [
    ...order.timeline,
    { at: new Date().toISOString().replace("T", " ").slice(0, 19), label, note },
  ];
  return timeline;
}

export function updateOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  const order = getOrderById(orderId);
  if (!order) return null;

  db().transaction(() => {
    db().run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, orderId]);
    const labels: Record<OrderStatus, string> = {
      pending: "Awaiting payment",
      processing: "Preparing your order",
      packed: "Packed",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Order cancelled",
      refunded: "Order refunded",
    };
    db().run("UPDATE orders SET timeline = ? WHERE id = ?", [
      JSON.stringify(appendTimeline(order, labels[status], note)),
      orderId,
    ]);

    // Cancellations and refunds return stock to the catalogue exactly once.
    if ((status === "cancelled" || status === "refunded") && !order.stockReleased) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        db().run("UPDATE variants SET stock = stock + ? WHERE id = ?", [item.quantity, item.variantId]);
        db().run(
          `INSERT INTO inventory_logs (id, variant_id, product_id, delta, reason, order_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [newId("inv"), item.variantId, item.productId, item.quantity, `order_${status}`, orderId],
        );
      }
      db().run("UPDATE orders SET stock_released = 1 WHERE id = ?", [orderId]);
    }
  });

  return getOrderById(orderId);
}

export function markOrderPaid(
  orderId: string,
  options: { reference?: string | null; note?: string; method?: string },
) {
  const order = getOrderById(orderId);
  if (!order) return null;
  if (order.paymentStatus === "paid") return order;

  db().transaction(() => {
    db().run(
      `UPDATE orders SET payment_status = 'paid', paid_at = datetime('now'), updated_at = datetime('now'),
         status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
         payment_reference = COALESCE(?, payment_reference),
         payment_note = COALESCE(?, payment_note),
         payment_method = COALESCE(?, payment_method)
       WHERE id = ?`,
      [options.reference ?? null, options.note ?? null, options.method ?? null, orderId],
    );
    db().run("UPDATE orders SET timeline = ? WHERE id = ?", [
      JSON.stringify(
        appendTimeline(
          order,
          "Payment confirmed",
          options.note ?? (options.reference ? `Reference ${options.reference}` : undefined),
        ),
      ),
      orderId,
    ]);
  });

  return getOrderById(orderId);
}

export function markPaymentFailed(orderId: string, note: string) {
  const order = getOrderById(orderId);
  if (!order) return null;
  db().run(
    "UPDATE orders SET payment_status = 'failed', payment_note = ?, updated_at = datetime('now') WHERE id = ?",
    [note, orderId],
  );
  db().run("UPDATE orders SET timeline = ? WHERE id = ?", [
    JSON.stringify(appendTimeline(order, "Payment failed", note)),
    orderId,
  ]);
  return getOrderById(orderId);
}

export function setPaymentReference(orderId: string, reference: string) {
  db().run("UPDATE orders SET payment_reference = ?, payment_status = 'pending', updated_at = datetime('now') WHERE id = ?", [
    reference,
    orderId,
  ]);
}

export function setTracking(orderId: string, trackingNumber: string, carrier: string) {
  const order = getOrderById(orderId);
  if (!order) return null;
  db().run(
    "UPDATE orders SET tracking_number = ?, tracking_carrier = ?, updated_at = datetime('now') WHERE id = ?",
    [trackingNumber, carrier, orderId],
  );
  db().run("UPDATE orders SET timeline = ? WHERE id = ?", [
    JSON.stringify(appendTimeline(order, "Tracking added", `${carrier} · ${trackingNumber}`)),
    orderId,
  ]);
  return getOrderById(orderId);
}

export function countOrdersForEmail(email: string) {
  const row = db().get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE lower(email) = lower(?)", [email]);
  return Number(row?.n ?? 0);
}

export function hasPurchased(userId: string, productId: string) {
  const row = db().get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.payment_status = 'paid'`,
    [userId, productId],
  );
  return Number(row?.n ?? 0) > 0;
}
