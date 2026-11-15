import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Our story",
    description: `${settings.brand.name} — ${settings.brand.tagline} Designed in Lagos, made in small runs.`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <div className="pb-20">
      <section className="page-shell pt-10 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
          <div>
            <p className="eyebrow">Since 2019</p>
            <h1 className="display-section mt-3 max-w-[18ch] text-balance">
              A small atelier with a long memory.
            </h1>
            <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed text-muted">
              {settings.brand.description}
            </p>
            <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-muted">
              We began with eleven metres of linen, one pattern and a cutting table borrowed on Sundays. The
              intention has not changed: make fewer things, make them properly, and make them last long enough to
              be repaired rather than replaced.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden lg:aspect-[4/4.4]">
            <Image
              src="/images/editorial/hero-main.jpg"
              alt="The atelier"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="page-shell mt-14 border-y border-line py-10">
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: "2019", label: "First collection" },
            { value: "3", label: "Partner workshops" },
            { value: "50–120", label: "Pieces per run" },
            { value: "4.8/5", label: "Client rating" },
          ].map((stat) => (
            <div key={stat.label}>
              <dd className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-none">{stat.value}</dd>
              <dt className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="page-shell mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">What we believe</p>
          <h2 className="display-section mt-3 max-w-[16ch]">Four rules we do not break.</h2>
        </div>
        <div className="space-y-6">
          {[
            {
              title: "Natural fibres, always",
              body: "Linen, cotton, wool, silk. No polyester blends to hit a price point — if a fabric cannot be repaired or composted, we do not cut it.",
            },
            {
              title: "Small runs",
              body: "Fifty to a hundred and twenty pieces. It costs forty per cent more per unit and it means we never have to destroy unsold stock.",
            },
            {
              title: "Named makers",
              body: "Every care label carries the names of the people who cut and sewed that garment, and they are paid above the regional average.",
            },
            {
              title: "Repair, not replace",
              body: "Free repairs for the life of the piece — rehemming, button replacement, seam reinforcement. Send it back and we will fix it.",
            },
          ].map((rule, index) => (
            <div key={rule.title} className="border-t border-line pt-5">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] tabular-nums text-muted">0{index + 1}</span>
                <h3 className="font-display text-[22px] leading-tight">{rule.title}</h3>
              </div>
              <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-muted">{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell mt-16">
        <div className="grid items-center gap-8 bg-surface p-8 sm:p-12 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow">Visit the atelier</p>
            <h2 className="display-section mt-3">Come and feel the cloth.</h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted">
              {settings.contact.address}, {settings.contact.city}. {settings.contact.hours}. Fittings by
              appointment —{" "}
              <a href={`mailto:${settings.contact.email}`} className="text-ink underline underline-offset-4">
                email us
              </a>{" "}
              to book.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/shop" className="btn btn-primary">
              Shop the collection
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
