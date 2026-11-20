"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavGroup {
  label: string;
  items: { label: string; href: string; badge?: number }[];
}

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav aria-label="Admin" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[9px] font-medium uppercase tracking-[0.18em] text-canvas/40">
            {group.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-sm px-3 py-2 text-[12.5px] transition-colors",
                    isActive(item.href)
                      ? "bg-canvas/10 text-canvas"
                      : "text-canvas/65 hover:bg-canvas/[0.06] hover:text-canvas",
                  )}
                >
                  <span>{item.label}</span>
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span className="rounded-full bg-canvas/15 px-1.5 py-0.5 text-[9.5px] tabular-nums text-canvas">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminMobileNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const items = groups.flatMap((group) => group.items);

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line bg-ink px-3 py-2 no-scrollbar lg:hidden">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[11px] transition-colors",
              active ? "bg-canvas/15 text-canvas" : "text-canvas/60",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
