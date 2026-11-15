import { jsonLdString } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { JOURNAL, getJournalPost } from "@/lib/content";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return JOURNAL.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) return { title: "Note not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      images: [{ url: post.cover }],
    },
  };
}

export default async function JournalPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    image: post.cover,
  };

  return (
    <article className="page-shell py-10 lg:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.12em] text-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/journal" className="hover:text-ink">
                Journal
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink">{post.category}</li>
          </ol>
        </nav>

        <p className="mt-8 text-[10px] uppercase tracking-[0.16em] text-muted">
          {formatDate(post.date)} · {post.readingTime}
        </p>
        <h1 className="display-section mt-3 text-balance">{post.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{post.excerpt}</p>
      </div>

      <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden">
        <Image src={post.cover} alt={post.title} fill priority sizes="100vw" className="object-cover" />
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        {post.body.map((block, index) => (
          <section key={index}>
            {block.heading && (
              <h2 className="mt-8 font-display text-[26px] leading-tight">{block.heading}</h2>
            )}
            <p className="mt-3 text-[14.5px] leading-[1.75] text-ink/80">{block.paragraph}</p>
          </section>
        ))}

        <div className="mt-12 border-t border-line pt-6">
          <Link href="/shop" className="btn btn-outline btn-sm">
            Shop the collection
          </Link>
        </div>
      </div>
    </article>
  );
}
