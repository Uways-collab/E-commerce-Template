"use client";

import type { ReactNode } from "react";

/**
 * A submit button that asks for confirmation before the surrounding form posts.
 * Used for destructive admin actions (delete a product, a category, a coupon…)
 * so a stray click cannot destroy data: the action itself runs on the server,
 * but the browser blocks the submit unless the operator confirms.
 */
export default function ConfirmSubmit({
  children,
  message,
  className,
  pendingLabel,
}: {
  children: ReactNode;
  message: string;
  className?: string;
  pendingLabel?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !window.confirm(message)) {
          event.preventDefault();
        }
      }}
      aria-label={typeof children === "string" ? children : pendingLabel}
    >
      {children}
    </button>
  );
}
