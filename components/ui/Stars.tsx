import { cn } from "@/lib/utils";

export default function Stars({
  rating,
  size = 12,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[2px]", className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - (index - 1)));
        return (
          <svg key={index} width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
            <defs>
              <linearGradient id={`star-${index}-${Math.round(rating * 10)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.22" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.47 5.2 5.68.72-4.18 3.92 1.08 5.62L10 14.32l-5.05 2.74 1.08-5.62L1.85 7.52l5.68-.72z"
              fill={`url(#star-${index}-${Math.round(rating * 10)})`}
            />
          </svg>
        );
      })}
    </span>
  );
}
