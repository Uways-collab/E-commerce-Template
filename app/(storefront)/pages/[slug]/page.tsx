import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTENT_PAGES } from "@/lib/content";
import { getSettings } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return Object.keys(CONTENT_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = CONTENT_PAGES[slug];
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function ContentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = CONTENT_PAGES[slug];
  if (!page) notFound();
  const settings = await getSettings();

  return (
    <div className="page-shell py-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.12em] text-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink">{page.title}</li>
          </ol>
        </nav>

        <p className="eyebrow mt-8">{page.eyebrow}</p>
        <h1 className="display-section mt-3">{page.title}</h1>
        <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted">{page.description}</p>
        <p className="mt-2 text-[10.5px] uppercase tracking-[0.12em] text-muted/80">{page.updated}</p>

        <div className="mt-10 space-y-8 border-t border-line pt-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-[24px] leading-tight">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 space-y-1.5 border-l border-line pl-4">
                  {section.list.map((item) => (
                    <li key={item} className="text-[13px] leading-relaxed text-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="text-[12.5px] text-muted">
            Still have a question? Email{" "}
            <a href={`mailto:${settings.contact.email}`} className="text-ink underline underline-offset-4">
              {settings.contact.email}
            </a>{" "}
            or message us on WhatsApp at {settings.contact.whatsapp}.
          </p>
        </div>
      </div>
    </div>
  );
}
