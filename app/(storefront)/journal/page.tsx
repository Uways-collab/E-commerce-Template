import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JOURNAL } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Journal",
  description: "Notes from the atelier — how the pieces are made, cared for and kept.",
  alternates: { canonical: "/journal" },
};

export default function JournalPage() {
  return (
    <div className="page-shell py-10 lg:py-16">
      <header className="max-w-2xl border-b border-line pb-6">
        <p className="eyebrow">The journal</p>
        <h1 className="display-section mt-3">Notes from the atelier</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Occasional writing on how the pieces are made, the people who make them, and how to keep them for years.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {JOURNAL.map((post, index) => (
          <article key={post.slug} className={index === 0 ? "lg:col-span-3" : ""}>
            <Link
              href={`/journal/${post.slug}`}
              className={index === 0 ? "group grid gap-6 lg:grid-cols-2 lg:items-center" : "group block"}
            >
              <div className={`media-frame media-hover relative ${index === 0 ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
                <Image
                  src={post.cover}
                  alt={post.title}
                  fill
                  sizes={index === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 33vw"}
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                  {post.category} · {formatDate(post.date)} · {post.readingTime}
                </p>
                <h2 className={`mt-2 ${index === 0 ? "font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight" : "font-display text-[22px] leading-snug"}`}>
                  {post.title}
                </h2>
                <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted">{post.excerpt}</p>
                <span className="mt-4 inline-block text-[10.5px] uppercase tracking-[0.14em]">
                  <span className="link-underline">Read the note</span>
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
