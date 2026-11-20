import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import ContactForm from "@/components/site/ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Contact us",
    description: `Contact ${settings.brand.name} — ${settings.contact.email}, ${settings.contact.phone}.`,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const settings = await getSettings();
  const whatsappHref = `https://wa.me/${settings.contact.whatsapp.replace(/[^0-9]/g, "")}`;

  return (
    <div className="page-shell py-10 lg:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="eyebrow">Client care</p>
          <h1 className="display-section mt-3">We answer every message.</h1>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-muted">
            Sizing questions, order changes, repairs, wholesale — write to us and a person at the atelier will
            reply, usually within one business day.
          </p>

          <dl className="mt-8 space-y-5 border-t border-line pt-6">
            {[
              {
                icon: Mail,
                label: "Email",
                value: settings.contact.email,
                href: `mailto:${settings.contact.email}`,
              },
              {
                icon: Phone,
                label: "Phone",
                value: settings.contact.phone,
                href: `tel:${settings.contact.phone.replace(/\s/g, "")}`,
              },
              {
                icon: MessageCircle,
                label: "WhatsApp",
                value: settings.contact.whatsapp,
                href: whatsappHref,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon size={16} strokeWidth={1.5} className="mt-0.5 text-muted" />
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{item.label}</dt>
                  <dd className="mt-0.5 text-[13.5px]">
                    <a href={item.href} className="link-quiet">
                      {item.value}
                    </a>
                  </dd>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <MapPin size={16} strokeWidth={1.5} className="mt-0.5 text-muted" />
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Atelier</dt>
                <dd className="mt-0.5 text-[13.5px] leading-relaxed">
                  {settings.contact.address}
                  <br />
                  {settings.contact.city}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} strokeWidth={1.5} className="mt-0.5 text-muted" />
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Hours</dt>
                <dd className="mt-0.5 text-[13.5px]">{settings.contact.hours}</dd>
              </div>
            </div>
          </dl>

          <div className="mt-8 border-t border-line pt-5 text-[12.5px] text-muted">
            Looking for something quick? Try the{" "}
            <Link href="/pages/faq" className="text-ink underline underline-offset-4">
              FAQ
            </Link>
            ,{" "}
            <Link href="/pages/size-guide" className="text-ink underline underline-offset-4">
              size guide
            </Link>{" "}
            or{" "}
            <Link href="/account/orders" className="text-ink underline underline-offset-4">
              order tracking
            </Link>
            .
          </div>
        </div>

        <div className="border border-line bg-surface p-6 sm:p-8">
          <h2 className="font-display text-[24px] leading-none">Send a message</h2>
          <p className="mt-2 text-[12.5px] text-muted">
            Messages land directly in the studio inbox — and in the admin dashboard.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
