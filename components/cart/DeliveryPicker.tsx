"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn, formatMoney } from "@/lib/utils";
import type { DeliveryMethod } from "@/lib/settings";

export default function DeliveryPicker({
  methods,
  activeId,
  currency,
  locale,
  name = "delivery",
  variant = "cards",
  onChange,
}: {
  methods: DeliveryMethod[];
  activeId: string;
  currency: string;
  locale: string;
  name?: string;
  variant?: "cards" | "list";
  onChange?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("space-y-2", pending && "opacity-70")}>
      {methods.map((method) => {
        const active = activeId === method.id;
        return (
          <label
            key={method.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 border px-3.5 py-3 transition-colors",
              active ? "border-ink bg-ink/[0.02]" : "border-line hover:border-ink/40",
              variant === "list" && "items-center",
            )}
          >
            <input
              type="radio"
              name={name}
              value={method.id}
              checked={active}
              onChange={() => {
                onChange?.(method.id);
                if (!onChange) {
                  startTransition(() => {
                    router.push(`/cart?delivery=${method.id}`, { scroll: false });
                  });
                }
              }}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-ink"
            />
            <span className="flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] font-medium">{method.label}</span>
                <span className="shrink-0 text-[12px] tabular-nums">
                  {method.priceCents === 0
                    ? "Free"
                    : formatMoney(method.priceCents, currency, locale)}
                </span>
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                {method.description} · {method.minDays}–{method.maxDays} days
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
