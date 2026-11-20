"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { removeLineAction, setQuantityAction } from "@/app/actions/cart";
import { useCart } from "@/components/cart/CartProvider";

export function CartQuantity({
  variantId,
  quantity,
  stock,
}: {
  variantId: string;
  quantity: number;
  stock: number;
}) {
  const router = useRouter();
  const { refresh, setItemCount, notify } = useCart();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(quantity);

  const change = (next: number) => {
    setOptimistic(next);
    startTransition(async () => {
      const result = await setQuantityAction(variantId, next);
      setItemCount(result.itemCount);
      await refresh();
      router.refresh();
      if (!result.ok) notify(result.message, "error");
    });
  };

  return (
    <div className="inline-flex items-center border border-line">
      <button
        type="button"
        onClick={() => change(Math.max(1, optimistic - 1))}
        disabled={pending || optimistic <= 1}
        className="grid h-9 w-9 place-items-center transition-colors hover:bg-ink/5 disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        <Minus size={12} strokeWidth={1.6} />
      </button>
      <span className="w-8 text-center text-[12px] tabular-nums">{optimistic}</span>
      <button
        type="button"
        onClick={() => change(optimistic + 1)}
        disabled={pending || optimistic >= stock}
        className="grid h-9 w-9 place-items-center transition-colors hover:bg-ink/5 disabled:opacity-30"
        aria-label="Increase quantity"
      >
        <Plus size={12} strokeWidth={1.6} />
      </button>
    </div>
  );
}

export function RemoveLineButton({ variantId, name }: { variantId: string; name: string }) {
  const router = useRouter();
  const { refresh, setItemCount, notify } = useCart();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeLineAction(variantId);
          setItemCount(result.itemCount);
          await refresh();
          router.refresh();
          notify(`${name} removed.`);
        })
      }
      className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-danger disabled:opacity-40"
    >
      <X size={11} strokeWidth={1.8} /> Remove
    </button>
  );
}
