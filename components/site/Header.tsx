"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/CartProvider";

export interface HeaderNavLink {
  label: string;
  href: string;
}

export default function Header({
  brandName,
  logoUrl,
  nav,
  secondaryNav,
  accountName,
  isAdmin,
  supportEmail,
  supportPhone,
}: {
  brandName: string;
  logoUrl: string;
  nav: HeaderNavLink[];
  secondaryNav: HeaderNavLink[];
  accountName: string | null;
  isAdmin: boolean;
  supportEmail: string;
  supportPhone: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => searchInput.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchValue.trim();
    setSearchOpen(false);
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  };

  const brand = logoUrl ? (
    <Image src={logoUrl} alt={brandName} width={160} height={40} className="h-8 w-auto object-contain" priority />
  ) : (
    <span className="font-display text-[24px] leading-none tracking-[-0.02em] md:text-[28px]">
      {brandName}
    </span>
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 bg-canvas/90 backdrop-blur-md transition-all duration-500 ease-editorial",
          scrolled ? "border-b border-line shadow-[0_12px_24px_-24px_rgba(25,24,19,0.4)]" : "border-b border-transparent",
        )}
      >
        <div className="page-shell">
          <div
            className={cn(
              "relative flex items-center justify-between gap-4 transition-all duration-500 ease-editorial",
              scrolled ? "h-14 md:h-[68px]" : "h-16 md:h-20",
            )}
          >
            {/* Left — navigation */}
            <div className="flex flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="-ml-2 inline-flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-accent lg:hidden"
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                <Menu size={20} strokeWidth={1.5} />
              </button>
              <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
                {nav.map((link) => {
                  const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href.split("?")[0]));
                  return (
                    <Link
                      key={`${link.label}-${link.href}`}
                      href={link.href}
                      className={cn(
                        "link-underline text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
                        active ? "text-ink after:scale-x-100" : "text-ink/75 hover:text-ink",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Centre — wordmark */}
            <Link
              href="/"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
              aria-label={`${brandName} — home`}
            >
              {brand}
            </Link>

            {/* Right — actions */}
            <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-accent"
                aria-label="Search products"
              >
                <Search size={19} strokeWidth={1.5} />
              </button>
              <Link
                href={accountName ? "/account" : "/account/login"}
                className="hidden h-10 w-10 items-center justify-center text-ink transition-colors hover:text-accent sm:inline-flex"
                aria-label={accountName ? "Your account" : "Sign in"}
              >
                <User size={19} strokeWidth={1.5} />
              </Link>
              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex h-10 items-center justify-center gap-2 pl-2 pr-1 text-ink transition-colors hover:text-accent"
                aria-label={`Open basket, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              >
                <ShoppingBag size={19} strokeWidth={1.5} />
                <span
                  className={cn(
                    "grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-medium tabular-nums transition-colors",
                    itemCount > 0 ? "bg-ink text-canvas" : "bg-line/70 text-muted",
                  )}
                >
                  {itemCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-2xl animate-scale-in border border-line bg-surface p-5 shadow-lift sm:p-7">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Search the store</p>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-muted transition-colors hover:text-ink"
                aria-label="Close search"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={submitSearch} className="mt-4 flex items-center gap-3 border-b border-line pb-3">
              <Search size={20} strokeWidth={1.5} className="text-muted" />
              <input
                ref={searchInput}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search for linen, silk, tote…"
                className="w-full bg-transparent text-[17px] text-ink placeholder:text-muted/60 focus:outline-none"
                aria-label="Search products"
              />
              <button type="submit" className="btn btn-sm btn-primary">
                Search
              </button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Linen", "Silk", "Knitwear", "New in"].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/shop?q=${encodeURIComponent(term)}`);
                  }}
                  className="chip transition-colors hover:border-ink hover:text-ink"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-canvas lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-line px-5">
            <span className="font-display text-[22px]">{brandName}</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center text-ink"
              aria-label="Close menu"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-8">
            <ul className="space-y-1">
              {nav.map((link, index) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="flex items-baseline justify-between border-b border-line/70 py-3.5 font-display text-[26px] leading-none"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>{link.label}</span>
                    <span className="text-[10px] font-sans uppercase tracking-eyebrow text-muted">
                      0{index + 1}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-8 space-y-3">
              {secondaryNav.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="text-[13px] text-muted" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link href="/admin" className="text-[13px] text-accent" onClick={() => setMenuOpen(false)}>
                    Admin dashboard
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          <div className="border-t border-line px-5 py-5 text-[12px] text-muted">
            <p>{supportEmail}</p>
            <p className="mt-1">{supportPhone}</p>
            <Link
              href={accountName ? "/account" : "/account/login"}
              className="btn btn-sm btn-outline mt-4 w-full"
              onClick={() => setMenuOpen(false)}
            >
              {accountName ? `Hi, ${accountName.split(" ")[0]}` : "Sign in / Register"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
