import Link from "next/link";
import type { StoreSettings } from "@/lib/settings";
import NewsletterForm from "@/components/site/NewsletterForm";
import { paymentMethodLabel } from "@/lib/settings";

export default function Footer({
  settings,
  categories,
  showNewsletter = true,
}: {
  settings: StoreSettings;
  categories: { slug: string; name: string }[];
  showNewsletter?: boolean;
}) {
  const socials = [
    { label: "Instagram", href: settings.social.instagram },
    { label: "TikTok", href: settings.social.tiktok },
    { label: "X", href: settings.social.x },
    { label: "Pinterest", href: settings.social.pinterest },
    { label: "Facebook", href: settings.social.facebook },
    { label: "YouTube", href: settings.social.youtube },
  ].filter((social) => social.href);

  const payments = settings.commerce.payments.enabled.map(paymentMethodLabel);

  return (
    <footer className="mt-section border-t border-line bg-canvas">
      <div className="page-shell">
        <div className="grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr] lg:gap-20 lg:py-20">
          <div className="max-w-sm">
            <Link href="/" className="font-display text-[30px] leading-none tracking-[-0.02em]">
              {settings.brand.name}
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">{settings.footer.blurb}</p>

            <dl className="mt-6 space-y-2 text-[12px] text-muted">
              <div>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a href={`mailto:${settings.contact.email}`} className="link-quiet">
                    {settings.contact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>
                  <a href={`tel:${settings.contact.phone.replace(/\s/g, "")}`} className="link-quiet">
                    {settings.contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Address</dt>
                <dd>
                  {settings.contact.address}, {settings.contact.city}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Opening hours</dt>
                <dd>{settings.contact.hours}</dd>
              </div>
            </dl>

            {socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {settings.footer.columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-[11px] font-medium uppercase tracking-eyebrow text-ink">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link href={link.href} className="text-[12.5px] text-muted transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label="Categories">
              <h2 className="text-[11px] font-medium uppercase tracking-eyebrow text-ink">Categories</h2>
              <ul className="mt-4 space-y-2.5">
                {categories.slice(0, 5).map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/collections/${category.slug}`}
                      className="text-[12.5px] text-muted transition-colors hover:text-ink"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {showNewsletter && settings.commerce.newsletterEnabled && (
          <div className="grid gap-6 border-t border-line py-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <h2 className="font-display text-[24px] leading-tight">Notes from {settings.brand.name}</h2>
              <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted">
                Seasonal edits, restock alerts and 10% off your first order. One letter a month — never noise.
              </p>
            </div>
            <NewsletterForm source="footer" variant="inline" />
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-line py-7 text-[11px] text-muted lg:flex-row lg:items-center lg:justify-between">
          <p>{settings.footer.legal}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="uppercase tracking-[0.14em] text-[10px]">Secure payments</span>
            {payments.map((label) => (
              <span key={label} className="text-[10px] uppercase tracking-[0.1em] text-muted/80">
                {label.split("—")[0].trim()}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/pages/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/pages/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <Link href="/admin" className="transition-colors hover:text-ink">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
