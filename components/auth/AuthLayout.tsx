import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  title,
  subtitle,
  children,
  image = "/images/editorial/hero-main.jpg",
  quote,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  image?: string;
  quote?: { text: string; author: string };
}) {
  return (
    <div className="grid min-h-[calc(100vh-140px)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-[380px]">
          <p className="eyebrow">Client account</p>
          <h1 className="display-section mt-3">{title}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image src={image} alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
        {quote && (
          <figure className="absolute inset-x-10 bottom-10 text-canvas">
            <blockquote className="max-w-sm font-display text-[26px] leading-tight">“{quote.text}”</blockquote>
            <figcaption className="mt-3 text-[10px] uppercase tracking-[0.16em] text-canvas/70">
              {quote.author}
            </figcaption>
          </figure>
        )}
        <Link
          href="/shop"
          className="absolute right-6 top-6 text-[10px] uppercase tracking-[0.16em] text-canvas/80 hover:text-canvas"
        >
          Back to shop
        </Link>
      </div>
    </div>
  );
}
