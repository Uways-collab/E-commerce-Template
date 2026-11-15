"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ProductGallery({
  images,
  name,
  badge,
}: {
  images: string[];
  name: string;
  badge?: string | null;
}) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [""];

  return (
    <div className="lg:sticky lg:top-24">
      <div className="relative">
        <div className="media-frame relative aspect-[4/5]">
          {list[active] ? (
            <Image
              src={list[active]}
              alt={`${name}${list.length > 1 ? ` — view ${active + 1}` : ""}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-[11px] uppercase tracking-eyebrow text-muted">
              Image coming soon
            </span>
          )}
        </div>
        {badge && (
          <span className="absolute left-4 top-4 bg-canvas/95 px-2.5 py-1.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink">
            {badge}
          </span>
        )}
      </div>

      {list.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {list.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative aspect-[4/5] overflow-hidden border transition-all duration-200",
                active === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`View image ${index + 1} of ${list.length}`}
              aria-current={active === index}
            >
              {image ? (
                <Image src={image} alt="" fill sizes="120px" className="object-cover" />
              ) : (
                <span className="block h-full w-full bg-line/50" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
