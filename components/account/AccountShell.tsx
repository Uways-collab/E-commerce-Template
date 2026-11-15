import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";

const NAV = [
  { label: "Overview", href: "/account" },
  { label: "Orders & tracking", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Profile", href: "/account/profile" },
];

export default function AccountShell({
  user,
  active,
  title,
  description,
  children,
  action,
}: {
  user: SessionUser;
  active: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-shell py-10">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <aside>
          <p className="eyebrow">Account</p>
          <p className="mt-2 font-display text-[24px] leading-tight">{user.name}</p>
          <p className="text-[12px] text-muted">{user.email}</p>

          <nav aria-label="Account" className="mt-6 border-t border-line">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active === item.href ? "page" : undefined}
                className={`flex items-center justify-between border-b border-line py-3 text-[12.5px] transition-colors ${
                  active === item.href ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
                {active === item.href && <span className="h-1 w-1 rounded-full bg-accent" />}
              </Link>
            ))}
            {isAdmin(user) && (
              <Link
                href="/admin"
                className="flex items-center justify-between border-b border-line py-3 text-[12.5px] text-accent"
              >
                Admin dashboard
              </Link>
            )}
          </nav>

          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
            >
              <LogOut size={13} strokeWidth={1.6} /> Sign out
            </button>
          </form>
        </aside>

        <div>
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-none">{title}</h1>
              {description && <p className="mt-2 max-w-lg text-[12.5px] text-muted">{description}</p>}
            </div>
            {action}
          </header>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
