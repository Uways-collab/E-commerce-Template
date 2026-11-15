import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { themeCss } from "@/lib/theme";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#191813",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.seo.defaultTitle,
      template: settings.seo.titleTemplate,
    },
    description: settings.seo.defaultDescription,
    keywords: settings.seo.keywords,
    applicationName: settings.brand.name,
    authors: [{ name: settings.brand.legalName }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: settings.brand.name,
      title: settings.seo.defaultTitle,
      description: settings.seo.defaultDescription,
      url: siteUrl,
      images: [{ url: settings.brand.ogImage, width: 1200, height: 630, alt: settings.brand.name }],
      locale: "en_NG",
    },
    twitter: {
      card: "summary_large_image",
      site: settings.seo.twitterHandle || undefined,
      title: settings.seo.defaultTitle,
      description: settings.seo.defaultDescription,
      images: [settings.brand.ogImage],
    },
    icons: {
      icon: [{ url: settings.brand.faviconUrl || "/favicon.svg", type: "image/svg+xml" }],
      apple: settings.brand.faviconUrl || "/favicon.svg",
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style id="pph-theme" dangerouslySetInnerHTML={{ __html: themeCss(settings) }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
