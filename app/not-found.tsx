import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-5 py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted">404</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05]">
          This page has wandered off.
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          The link may be old, or the piece may have sold out and retired from the collection. Everything currently
          available is in the shop.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">
            Browse the shop
          </Link>
          <Link href="/" className="btn btn-outline">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
