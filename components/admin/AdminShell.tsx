import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { AdminMobileNav, AdminNav, type NavGroup } from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function buildAdminNav(counts: {
  orders?: number;
  messages?: number;
  lowStock?: number;
}): NavGroup[] {
  return [
    { label: "Overview", items: [{ label: "Dashboard", href: "/admin" }] },
    {
      label: "Sell",
      items: [
        { label: "Orders", href: "/admin/orders", badge: counts.orders },
        { label: "Products", href: "/admin/products" },
        { label: "Categories", href: "/admin/categories" },
        { label: "Inventory", href: "/admin/inventory", badge: counts.lowStock },
      ],
    },
    {
      label: "Customers",
      items: [
        { label: "Customers", href: "/admin/customers" },
        { label: "Reviews", href: "/admin/reviews" },
        { label: "Messages", href: "/admin/messages", badge: counts.messages },
        { label: "Subscribers", href: "/admin/subscribers" },
      ],
    },
    {
      label: "Marketing",
      items: [
        { label: "Coupons", href: "/admin/coupons" },
        { label: "Banners", href: "/admin/banners" },
      ],
    },
    {
      label: "Store",
      items: [
        { label: "Store settings", href: "/admin/settings" },
        { label: "Configurator", href: "/admin/configurator" },
      ],
    },
  ];
}

export default function AdminShell({
  user,
  groups,
  storeName,
  title,
  description,
  action,
  children,
}: {
  user: SessionUser;
  groups: NavGroup[];
  storeName: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-ink lg:flex lg:flex-col">
        <div className="border-b border-canvas/10 px-5 py-5">
          <Link href="/admin" className="font-display text-[21px] leading-none text-canvas">
            {storeName}
          </Link>
          <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-canvas/40">Operations</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-5">
          <AdminNav groups={groups} />
        </div>
        <div className="border-t border-canvas/10 px-5 py-4">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-canvas/60 transition-colors hover:text-canvas"
          >
            View storefront <ArrowUpRight size={11} strokeWidth={1.7} />
          </Link>
          <p className="mt-3 truncate text-[11px] text-canvas/50">{user.email}</p>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-canvas/50 transition-colors hover:text-canvas"
            >
              <LogOut size={11} strokeWidth={1.7} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-ink px-4 py-3">
            <Link href="/admin" className="font-display text-[18px] text-canvas">
              {storeName}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-[10.5px] uppercase tracking-[0.12em] text-canvas/60">
                Sign out
              </button>
            </form>
          </div>
          <AdminMobileNav groups={groups} />
        </div>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Admin</p>
              <h1 className="mt-1.5 font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-none">{title}</h1>
              {description && <p className="mt-2 max-w-2xl text-[12.5px] text-muted">{description}</p>}
            </div>
            {action}
          </header>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
