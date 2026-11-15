"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the server logs by the platform; kept minimal for clients.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-5 py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Something went wrong</p>
        <h1 className="mt-4 font-display text-[clamp(1.9rem,4.6vw,2.8rem)] leading-[1.05]">
          We hit a snag loading this page.
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          Nothing has been charged and your basket is safe. Try again, or head back to the shop — if it keeps happening,
          contact the studio and quote {error.digest ? `reference ${error.digest}` : "the time you saw this"}.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/shop" className="btn btn-outline">
            Back to the shop
          </Link>
        </div>
      </div>
    </main>
  );
}
