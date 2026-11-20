import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    else search.delete("page");
    const query = search.toString();
    return query ? `/shop?${query}` : "/shop";
  };

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (candidate) => candidate === 1 || candidate === pageCount || Math.abs(candidate - page) <= 1,
  );

  return (
    <nav className="mt-12 flex items-center justify-between border-t border-line pt-6" aria-label="Pagination">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]",
          page === 1 ? "pointer-events-none text-muted/40" : "text-ink hover:text-accent",
        )}
      >
        <ArrowLeft size={13} strokeWidth={1.6} /> Previous
      </Link>

      <div className="flex items-center gap-1">
        {pages.map((candidate, index) => (
          <span key={candidate} className="flex items-center gap-1">
            {index > 0 && candidate - pages[index - 1] > 1 && <span className="px-1 text-muted">…</span>}
            <Link
              href={href(candidate)}
              aria-current={candidate === page ? "page" : undefined}
              className={cn(
                "grid h-8 w-8 place-items-center text-[12px] tabular-nums transition-colors",
                candidate === page ? "bg-ink text-canvas" : "text-muted hover:text-ink",
              )}
            >
              {candidate}
            </Link>
          </span>
        ))}
      </div>

      <Link
        href={href(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className={cn(
          "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]",
          page === pageCount ? "pointer-events-none text-muted/40" : "text-ink hover:text-accent",
        )}
      >
        Next <ArrowRight size={13} strokeWidth={1.6} />
      </Link>
    </nav>
  );
}
