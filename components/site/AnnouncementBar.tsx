import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function AnnouncementBar({
  messages,
  linkLabel,
  href,
}: {
  messages: string[];
  linkLabel?: string;
  href?: string;
}) {
  if (!messages.length) return null;

  const track = [...messages, ...messages];

  return (
    <div className="relative z-50 overflow-hidden bg-ink text-canvas">
      <div className="page-shell flex h-9 items-center justify-center">
        {messages.length === 1 ? (
          <p className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.16em]">
            <span>{messages[0]}</span>
            {linkLabel && href && (
              <Link href={href} className="hidden items-center gap-1 text-canvas/70 transition-colors hover:text-canvas sm:inline-flex">
                {linkLabel}
                <ArrowUpRight size={11} strokeWidth={1.6} />
              </Link>
            )}
          </p>
        ) : (
          <div className="group relative flex w-full items-center overflow-hidden">
            <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap group-hover:[animation-play-state:paused] motion-reduce:animate-none">
              {track.map((message, index) => (
                <span
                  key={`${message}-${index}`}
                  className="flex items-center gap-10 text-[10.5px] uppercase tracking-[0.16em] text-canvas/85"
                  aria-hidden={index >= messages.length}
                >
                  {message}
                  <span className="text-canvas/30">◆</span>
                </span>
              ))}
            </div>
            {linkLabel && href && (
              <Link
                href={href}
                className="absolute right-0 hidden shrink-0 items-center gap-1 bg-ink pl-6 text-[10.5px] uppercase tracking-[0.16em] text-canvas transition-colors hover:text-canvas/70 lg:inline-flex"
              >
                {linkLabel}
                <ArrowUpRight size={11} strokeWidth={1.6} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
