"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterCategory {
  slug: string;
  name: string;
  count: number;
}

export interface FilterCollection {
  name: string;
  count: number;
}

export interface PriceBand {
  label: string;
  min?: number;
  max?: number;
}

function buildQuery(current: URLSearchParams, updates: Record<string, string | null | undefined>) {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (!value) params.delete(key);
    else params.set(key, value);
  }
  params.delete("page");
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

export function SortSelect({ value, options }: { value: string; options: { label: string; value: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted">
      <span className="hidden sm:inline">Sort</span>
      <select
        value={value}
        onChange={(event) => {
          const next = buildQuery(params, { sort: event.target.value });
          startTransition(() => router.push(next, { scroll: false }));
        }}
        className="select-boxed !w-auto !py-2 !pl-3 !pr-9 !text-[12px] normal-case tracking-normal"
        aria-label="Sort products"
        disabled={pending}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ShopFilters({
  categories,
  collections,
  priceBands,
  activeCategory,
  activeCollection,
  activePrice,
  inStockOnly,
  onSale,
  total,
  query,
}: {
  categories: FilterCategory[];
  collections: FilterCollection[];
  priceBands: PriceBand[];
  activeCategory?: string;
  activeCollection?: string;
  activePrice?: string;
  inStockOnly: boolean;
  onSale: boolean;
  total: number;
  query?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(query ?? "");
  const [pending, startTransition] = useTransition();

  const go = (updates: Record<string, string | null | undefined>) => {
    startTransition(() => router.push(buildQuery(params, updates), { scroll: false }));
  };

  useEffect(() => {
    setSearch(query ?? "");
  }, [query]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeCount = [activeCategory, activeCollection, activePrice, inStockOnly ? "1" : "", onSale ? "1" : ""].filter(
    Boolean,
  ).length;

  const filterBody = (
    <div className="space-y-8">
      <div>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink">Search</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: search.trim() || null });
            setOpen(false);
          }}
          className="mt-3 flex items-center border-b border-line"
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Linen, silk, tote…"
            className="w-full bg-transparent py-2 text-[13px] placeholder:text-muted/60 focus:outline-none"
            aria-label="Search products"
          />
          <button type="submit" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
            Go
          </button>
        </form>
      </div>

      <fieldset>
        <legend className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink">Category</legend>
        <ul className="mt-3 space-y-1.5">
          <li>
            <button
              type="button"
              onClick={() => go({ category: null })}
              className={cn(
                "flex w-full items-center justify-between py-1 text-left text-[13px] transition-colors",
                !activeCategory ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              <span className={cn(!activeCategory && "underline decoration-accent decoration-1 underline-offset-4")}>
                All pieces
              </span>
              <span className="text-[11px] tabular-nums text-muted">{total}</span>
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <button
                type="button"
                onClick={() => {
                  go({ category: activeCategory === category.slug ? null : category.slug });
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between py-1 text-left text-[13px] transition-colors",
                  activeCategory === category.slug ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    activeCategory === category.slug &&
                      "underline decoration-accent decoration-1 underline-offset-4",
                  )}
                >
                  {category.name}
                </span>
                <span className="text-[11px] tabular-nums text-muted">{category.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink">Price</legend>
        <ul className="mt-3 space-y-1.5">
          {priceBands.map((band) => {
            const value = `${band.min ?? ""}-${band.max ?? ""}`;
            const active = activePrice === value;
            return (
              <li key={band.label}>
                <button
                  type="button"
                  onClick={() => {
                    go({ price: active ? null : value });
                    setOpen(false);
                  }}
                  className={cn(
                    "py-1 text-[13px] transition-colors",
                    active ? "text-ink underline decoration-accent decoration-1 underline-offset-4" : "text-muted hover:text-ink",
                  )}
                >
                  {band.label}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {collections.length > 0 && (
        <fieldset>
          <legend className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink">Collection</legend>
          <ul className="mt-3 space-y-1.5">
            {collections.map((collection) => {
              const active = activeCollection === collection.name;
              return (
                <li key={collection.name}>
                  <button
                    type="button"
                    onClick={() => {
                      go({ collection: active ? null : collection.name });
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between py-1 text-left text-[13px] transition-colors",
                      active ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    <span className={cn(active && "underline decoration-accent decoration-1 underline-offset-4")}>
                      {collection.name}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted">{collection.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset className="space-y-2.5">
        <legend className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink">Availability</legend>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => go({ stock: event.target.checked ? "in" : null })}
            className="checkbox"
          />
          In stock only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(event) => go({ sale: event.target.checked ? "true" : null })}
            className="checkbox"
          />
          On sale
        </label>
      </fieldset>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/shop"))}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-accent"
        >
          <X size={12} strokeWidth={1.8} /> Clear filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]"
        >
          <SlidersHorizontal size={14} strokeWidth={1.5} />
          Filters {activeCount > 0 && `(${activeCount})`}
        </button>
        <span className="text-[11px] text-muted">{total} pieces</span>
      </div>

      <aside className={cn("hidden lg:block", pending && "opacity-60")} aria-label="Product filters">
        {filterBody}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[86%] max-w-sm animate-slide-in overflow-y-auto bg-canvas p-5">
            <div className="mb-6 flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-display text-[20px]">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            {filterBody}
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary mt-8 w-full">
              Show {total} results
            </button>
          </div>
        </div>
      )}
    </>
  );
}
