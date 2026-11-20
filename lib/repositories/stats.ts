import "server-only";
import { db } from "@/lib/db";
import { listOrders, type Order } from "@/lib/repositories/orders";

/** Revenue excludes cancelled and refunded orders. */
const REVENUE_WHERE = "payment_status = 'paid' AND status NOT IN ('cancelled','refunded')";

export interface DashboardStats {
  revenueCents: number;
  revenue30Cents: number;
  revenuePrev30Cents: number;
  ordersTotal: number;
  orders30: number;
  aovCents: number;
  customers: number;
  newCustomers30: number;
  pendingOrders: number;
  paidOrders: number;
  unitsSold: number;
  lowStockCount: number;
  outOfStockCount: number;
  subscribers: number;
  series: { date: string; revenueCents: number; orders: number }[];
  topProducts: { name: string; slug: string; image: string | null; units: number; revenueCents: number }[];
  statusBreakdown: { status: string; count: number }[];
  paymentBreakdown: { method: string; count: number; revenueCents: number }[];
  recentOrders: Order[];
  lowStock: {
    productName: string;
    productSlug: string;
    sku: string;
    size: string | null;
    colorName: string | null;
    stock: number;
  }[];
}

export function dashboardStats(): DashboardStats {
  const one = (sql: string, params: (string | number)[] = []) =>
    Number(db().get<{ v: number }>(sql, params)?.v ?? 0);

  const revenueCents = one(`SELECT COALESCE(SUM(total_cents),0) AS v FROM orders WHERE ${REVENUE_WHERE}`);
  const revenue30Cents = one(
    `SELECT COALESCE(SUM(total_cents),0) AS v FROM orders WHERE ${REVENUE_WHERE} AND created_at >= datetime('now','-30 day')`,
  );
  const revenuePrev30Cents = one(
    `SELECT COALESCE(SUM(total_cents),0) AS v FROM orders
      WHERE ${REVENUE_WHERE} AND created_at >= datetime('now','-60 day') AND created_at < datetime('now','-30 day')`,
  );
  const ordersTotal = one("SELECT COUNT(*) AS v FROM orders");
  const orders30 = one("SELECT COUNT(*) AS v FROM orders WHERE created_at >= datetime('now','-30 day')");
  const paidOrders = one(`SELECT COUNT(*) AS v FROM orders WHERE ${REVENUE_WHERE}`);
  const unitsSold = one(
    `SELECT COALESCE(SUM(oi.quantity),0) AS v FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.${REVENUE_WHERE.replace(/status/g, "status")}`,
  );
  const customers = one("SELECT COUNT(*) AS v FROM users WHERE role = 'customer'");
  const newCustomers30 = one(
    "SELECT COUNT(*) AS v FROM users WHERE role = 'customer' AND created_at >= datetime('now','-30 day')",
  );
  const pendingOrders = one("SELECT COUNT(*) AS v FROM orders WHERE status IN ('pending','processing','packed')");
  const lowStockCount = one(
    "SELECT COUNT(*) AS v FROM variants v JOIN products p ON p.id = v.product_id WHERE v.stock > 0 AND v.stock <= 5 AND p.status = 'active'",
  );
  const outOfStockCount = one(
    "SELECT COUNT(*) AS v FROM variants v JOIN products p ON p.id = v.product_id WHERE v.stock = 0 AND p.status = 'active'",
  );
  const subscribers = one("SELECT COUNT(*) AS v FROM newsletter_subscribers");

  const series: DashboardStats["series"] = [];
  for (let index = 13; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10);
    const row = db().get<{ revenue: number; orders: number }>(
      `SELECT COALESCE(SUM(total_cents),0) AS revenue, COUNT(*) AS orders FROM orders
        WHERE ${REVENUE_WHERE} AND date(created_at) = ?`,
      [day],
    );
    series.push({
      date: day,
      revenueCents: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
    });
  }

  const topProducts = db()
    .all<{ name: string; slug: string; image: string | null; units: number; revenue: number }>(
      `SELECT p.name, p.slug, json_extract(p.images, '$[0]') AS image,
              SUM(oi.quantity) AS units, SUM(oi.line_total_cents) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
        WHERE o.payment_status = 'paid' AND o.status NOT IN ('cancelled','refunded')
        GROUP BY oi.product_id
        ORDER BY revenue DESC LIMIT 5`,
    )
    .map((row) => ({
      name: row.name,
      slug: row.slug,
      image: row.image,
      units: Number(row.units),
      revenueCents: Number(row.revenue),
    }));

  const statusBreakdown = db()
    .all<{ status: string; count: number }>("SELECT status, COUNT(*) AS count FROM orders GROUP BY status")
    .map((row) => ({ status: row.status, count: Number(row.count) }));

  const paymentBreakdown = db()
    .all<{ method: string; count: number; revenue: number }>(
      `SELECT payment_method AS method, COUNT(*) AS count, COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_cents ELSE 0 END),0) AS revenue
         FROM orders GROUP BY payment_method ORDER BY count DESC`,
    )
    .map((row) => ({ method: row.method, count: Number(row.count), revenueCents: Number(row.revenue) }));

  const lowStock = db()
    .all<{
      product_name: string;
      product_slug: string;
      sku: string;
      size: string | null;
      color_name: string | null;
      stock: number;
    }>(
      `SELECT p.name AS product_name, p.slug AS product_slug, v.sku, v.size, v.color_name, v.stock
         FROM variants v JOIN products p ON p.id = v.product_id
        WHERE v.stock <= 5 AND p.status = 'active'
        ORDER BY v.stock ASC, p.name ASC LIMIT 8`,
    )
    .map((row) => ({
      productName: row.product_name,
      productSlug: row.product_slug,
      sku: row.sku,
      size: row.size,
      colorName: row.color_name,
      stock: Number(row.stock),
    }));

  return {
    revenueCents,
    revenue30Cents,
    revenuePrev30Cents,
    ordersTotal,
    orders30,
    aovCents: paidOrders > 0 ? Math.round(revenueCents / paidOrders) : 0,
    customers,
    newCustomers30,
    pendingOrders,
    paidOrders,
    unitsSold,
    lowStockCount,
    outOfStockCount,
    subscribers,
    series,
    topProducts,
    statusBreakdown,
    paymentBreakdown,
    recentOrders: listOrders({ limit: 6 }).orders,
    lowStock,
  };
}
