import "server-only";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { buildAdminNav } from "@/components/admin/AdminShell";

/** Shared context for every admin screen: auth, store config and nav badges. */
export async function adminContext() {
  const user = await requireAdmin();
  const settings = await getSettings();

  const pendingOrders = Number(
    db().get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM orders WHERE status IN ('pending','processing','packed')",
    )?.n ?? 0,
  );
  const newMessages = Number(
    db().get<{ n: number }>("SELECT COUNT(*) AS n FROM contact_messages WHERE status = 'new'")?.n ?? 0,
  );
  const lowStock = Number(
    db().get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM variants v JOIN products p ON p.id = v.product_id WHERE v.stock <= 5 AND p.status = 'active'",
    )?.n ?? 0,
  );

  return {
    user,
    settings,
    counts: { orders: pendingOrders, messages: newMessages, lowStock },
    groups: buildAdminNav({ orders: pendingOrders, messages: newMessages, lowStock }),
  };
}
