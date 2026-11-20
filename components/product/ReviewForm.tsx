"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction, type ReviewState } from "@/app/actions/reviews";
import { cn } from "@/lib/utils";

const initialState: ReviewState | null = null;

export default function ReviewForm({
  productId,
  productSlug,
  isSignedIn,
}: {
  productId: string;
  productSlug: string;
  isSignedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);

  if (!isSignedIn) {
    return (
      <div className="border border-line bg-surface p-5">
        <p className="font-display text-[19px]">Bought this piece?</p>
        <p className="mt-1 text-[12.5px] text-muted">
          Sign in to leave a review. Reviews from verified buyers are marked as such.
        </p>
        <Link
          href={`/account/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
          className="btn btn-sm btn-outline mt-4"
        >
          Sign in to review
        </Link>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="border border-success/30 bg-success/[0.04] p-5">
        <p className="text-[13px] text-success">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-line bg-surface p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="rating" value={rating} />
      <p className="font-display text-[19px]">Write a review</p>

      <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(value)}
            className="p-0.5"
          >
            <Star
              size={18}
              strokeWidth={1.4}
              className={cn(
                "transition-colors",
                value <= (hovered || rating) ? "fill-ink text-ink" : "text-muted/40",
              )}
            />
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="review-title" className="label">
            Headline (optional)
          </label>
          <input id="review-title" name="title" maxLength={90} className="input-boxed" placeholder="The dress I wear to everything" />
        </div>
        <div>
          <label htmlFor="review-body" className="label">
            Your review
          </label>
          <textarea
            id="review-body"
            name="body"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            className="input-boxed resize-none"
            placeholder="How does it fit? How has it worn?"
          />
        </div>
      </div>

      {state && !state.ok && <p className="mt-3 text-[12px] text-danger">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-sm btn-primary mt-4">
        {pending ? "Publishing…" : "Publish review"}
      </button>
    </form>
  );
}
