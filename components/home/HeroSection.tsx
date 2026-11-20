import Image from "next/image";
import Link from "next/link";
import type { HeroSection as HeroData } from "@/lib/settings";
import { ArrowRight } from "lucide-react";

export default function HeroSection({
  section,
  tagline,
}: {
  section: HeroData;
  /** Brand tagline from Store Settings — keeps marketing copy out of the code. */
  tagline: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="page-shell">
        <div className="grid gap-6 pt-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-16 lg:pt-12">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-ink/35" aria-hidden="true" />
            <p className="eyebrow text-ink/70">{section.eyebrow}</p>
          </div>
          <p className="hidden max-w-sm justify-self-end text-right text-[12.5px] leading-relaxed text-muted lg:block">
            {section.body}
          </p>
        </div>

        <div className="mt-6 lg:mt-8">
          <h1 className="display-hero max-w-[19ch] text-balance">
            {section.headline}{" "}
            {section.headlineAccent && (
              <em className="font-display italic text-accent">{section.headlineAccent}</em>
            )}
          </h1>
        </div>

        <div className="mt-8 flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between lg:pb-10">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={section.ctaHref} className="btn btn-primary btn-lg">
              {section.ctaLabel}
              <ArrowRight size={14} strokeWidth={1.6} />
            </Link>
            {section.secondaryLabel && (
              <Link href={section.secondaryHref} className="btn btn-outline btn-lg">
                {section.secondaryLabel}
              </Link>
            )}
          </div>
          <p className="max-w-xs text-[12.5px] leading-relaxed text-muted lg:hidden">{section.body}</p>
          {tagline && (
            <p className="hidden text-[10px] uppercase tracking-[0.2em] text-muted lg:block">{tagline}</p>
          )}
        </div>
      </div>

      <div className="relative mt-6 lg:mt-8">
        <div className="relative h-[clamp(320px,46vw,620px)] w-full overflow-hidden bg-line/40">
          {section.image ? (
            <Image
              src={section.image}
              alt={section.imageAlt || section.headline}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[70%_center]"
            />
          ) : (
            <div className="grid h-full place-items-center text-[11px] uppercase tracking-eyebrow text-muted">
              Add a hero image in Store Settings
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/25 to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-canvas px-4 py-2.5 sm:bottom-6 sm:left-6">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink">{section.eyebrow}</p>
          </div>
        </div>
      </div>

      {section.stats.length > 0 && (
        <div className="page-shell">
          <dl className="grid grid-cols-2 gap-y-6 border-b border-line py-8 sm:grid-cols-3 lg:py-10">
            {section.stats.map((stat, index) => (
              <div
                key={stat.label}
                className={
                  index > 0
                    ? "sm:border-l sm:border-line sm:pl-8 lg:pl-12"
                    : ""
                }
              >
                <dt className="text-[10px] uppercase tracking-[0.16em] text-muted">{stat.label}</dt>
                <dd className="mt-1.5 font-display text-[clamp(1.5rem,2.4vw,2.1rem)] leading-none tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
