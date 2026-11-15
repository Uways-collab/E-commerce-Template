"use client";

import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export default function FlashHost() {
  const { flash } = useCart();
  if (!flash) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 px-4 sm:left-6 sm:translate-x-0">
      <div
        className={cn(
          "pointer-events-auto flex animate-fade-up items-center gap-3 border px-4 py-3 text-[13px] shadow-panel",
          flash.tone === "error"
            ? "border-danger/30 bg-surface text-danger"
            : "border-ink/15 bg-ink text-canvas",
        )}
        role="status"
        aria-live="polite"
      >
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full",
            flash.tone === "error" ? "bg-danger/10" : "bg-canvas/15",
          )}
        >
          {flash.tone === "error" ? <X size={12} strokeWidth={2} /> : <Check size={12} strokeWidth={2} />}
        </span>
        <span>{flash.message}</span>
      </div>
    </div>
  );
}
