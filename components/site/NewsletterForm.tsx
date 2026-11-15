"use client";

import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { subscribeAction, type NewsletterState } from "@/app/actions/newsletter";
import { cn } from "@/lib/utils";

const initialState: NewsletterState | null = null;

export default function NewsletterForm({
  source,
  variant = "boxed",
  buttonLabel = "Subscribe",
}: {
  source: string;
  variant?: "inline" | "boxed";
  buttonLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(subscribeAction, initialState);

  if (state?.ok) {
    return (
      <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3.5">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-success/10 text-success">
          <Check size={13} strokeWidth={2} />
        </span>
        <p className="text-[13px] text-ink">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="source" value={source} />
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "boxed" ? "border border-line bg-surface pl-4" : "border-b border-ink/25 pb-1",
        )}
      >
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-12 w-full bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "inline-flex h-12 shrink-0 items-center gap-2 px-5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors disabled:opacity-50",
            variant === "boxed" ? "bg-ink text-canvas hover:bg-ink/90" : "text-ink hover:text-accent",
          )}
        >
          {pending ? "…" : buttonLabel}
          {variant === "inline" && <ArrowRight size={14} strokeWidth={1.5} />}
        </button>
      </div>
      {state && !state.ok && <p className="mt-2 text-[12px] text-danger">{state.message}</p>}
    </form>
  );
}
