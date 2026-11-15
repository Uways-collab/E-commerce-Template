"use client";

import { useTransition } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { addToCartAction } from "@/app/actions/cart";
import { cn } from "@/lib/utils";

export interface QuickAddOption {
  label: string;
  variantId: string | null;
  stock: number;
}

/**
 * Hover-to-add on product cards. Shows the real size options and writes through
 * the same server action as the product page, so stock rules and pricing are
 * always enforced server-side.
 */
export default function QuickAdd({ options }: { options: QuickAddOption[] }) {
  const { openCart, setItemCount, notify } = useCart();
  const [pending, startTransition] = useTransition();

  const handleAdd = (variantId: string | null, label: string) => {
    if (!variantId) {
      notify(`${label} is sold out.`, "error");
      return;
    }
    startTransition(async () => {
      const result = await addToCartAction(variantId, 1);
      if (result.ok) {
        setItemCount(result.itemCount);
        notify(result.message);
        openCart();
      } else {
        notify(result.message, "error");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          disabled={pending || !option.variantId}
          onClick={() => handleAdd(option.variantId, option.label)}
          className={cn(
            "min-w-[30px] border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors",
            option.variantId
              ? "border-ink/25 bg-canvas/95 text-ink hover:border-ink hover:bg-ink hover:text-canvas"
              : "cursor-not-allowed border-line bg-canvas/70 text-muted/50 line-through",
          )}
          aria-label={option.variantId ? `Add size ${option.label} to basket` : `${option.label} sold out`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
