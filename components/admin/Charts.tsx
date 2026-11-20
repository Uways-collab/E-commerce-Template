import { formatCompactMoney } from "@/lib/utils";

interface Point {
  date: string;
  revenueCents: number;
  orders: number;
}

/** Dependency-free SVG area chart — no chart library, no client JS. */
export function RevenueChart({
  series,
  currency,
  locale,
}: {
  series: Point[];
  currency: string;
  locale: string;
}) {
  const width = 760;
  const height = 220;
  const padding = { top: 14, right: 8, bottom: 26, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const max = Math.max(...series.map((point) => point.revenueCents), 1);
  const step = series.length > 1 ? innerWidth / (series.length - 1) : innerWidth;

  const points = series.map((point, index) => ({
    x: padding.left + index * step,
    y: padding.top + innerHeight - (point.revenueCents / max) * innerHeight,
    ...point,
  }));

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${padding.left + innerWidth},${padding.top + innerHeight} L${padding.left},${padding.top + innerHeight} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Revenue over the last fourteen days"
    >
      <defs>
        <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((ratio) => {
        const y = padding.top + innerHeight * ratio;
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgb(var(--c-line))"
              strokeWidth="1"
              strokeDasharray={ratio === 1 ? undefined : "3 4"}
            />
            <text x={padding.left} y={y - 4} fontSize="9" fill="rgb(var(--c-muted))">
              {formatCompactMoney(max * (1 - ratio), currency, locale)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#revenue-fill)" />
      <path d={line} fill="none" stroke="rgb(var(--c-ink))" strokeWidth="1.5" strokeLinejoin="round" />

      {points.map((point, index) => (
        <g key={point.date}>
          {point.revenueCents > 0 && <circle cx={point.x} cy={point.y} r="2.4" fill="rgb(var(--c-ink))" />}
          {(index % 2 === 0 || index === points.length - 1) && (
            <text
              x={point.x}
              y={height - 8}
              fontSize="9"
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              fill="rgb(var(--c-muted))"
            >
              {new Date(`${point.date}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short" })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: number; label?: string };
  tone?: "default" | "accent";
}) {
  return (
    <div className="border border-line bg-surface p-4">
      <p className="text-[9.5px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p
        className={`mt-2 font-display text-[clamp(1.5rem,2.2vw,1.95rem)] leading-none tabular-nums ${
          tone === "accent" ? "text-accent" : ""
        }`}
      >
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={`text-[10.5px] tabular-nums ${
              delta.value >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {delta.value >= 0 ? "▲" : "▼"} {Math.abs(delta.value).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-[10.5px] text-muted">{sub}</span>}
      </div>
    </div>
  );
}

export function MiniBar({
  items,
  max,
}: {
  items: { label: string; value: number; hint?: string }[];
  max: number;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between text-[11.5px]">
            <span className="capitalize text-ink">{item.label.replace(/_/g, " ")}</span>
            <span className="text-muted">{item.hint}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-line/70">
            <div
              className="h-full bg-ink/70"
              style={{ width: `${Math.min(100, (item.value / Math.max(max, 1)) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
