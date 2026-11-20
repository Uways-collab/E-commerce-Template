"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, X } from "lucide-react";
import { applyCouponAction, removeCouponAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";

export default function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const router = useRouter();
  const { refresh, notify } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between border border-success/30 bg-success/[0.05] px-3 py-2.5">
        <span className="flex items-center gap-2 text-[12px] text-success">
          <Tag size={13} strokeWidth={1.6} /> {appliedCode} applied
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await removeCouponAction();
              await refresh();
              router.refresh();
              notify("Discount removed.");
            })
          }
          className="text-muted transition-colors hover:text-danger"
          aria-label="Remove discount code"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await applyCouponAction(code);
          if (result.ok) {
            setCode("");
            await refresh();
            router.refresh();
            notify(result.message);
          } else {
            setError(result.message);
          }
        });
      }}
    >
      <div className="flex items-center gap-2 border border-line bg-surface">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Discount code"
          className="w-full bg-transparent px-3 py-2.5 text-[12.5px] uppercase tracking-[0.06em] placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:outline-none"
          aria-label="Discount code"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="shrink-0 px-3 py-2.5 text-[10.5px] uppercase tracking-[0.12em] text-ink transition-colors hover:text-accent disabled:opacity-40"
        >
          {pending ? "…" : "Apply"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-danger">{error}</p>}
    </form>
  );
}
