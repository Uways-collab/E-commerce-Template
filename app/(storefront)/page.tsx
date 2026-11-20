import { jsonLdString } from "@/lib/seo";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { listCategories } from "@/lib/repositories/catalog";
import { topReviews } from "@/lib/repositories/marketing";
import HeroSection from "@/components/home/HeroSection";
import {
  CategoriesSectionView,
  EditorialSectionView,
  MarqueeSectionView,
  NewsletterSectionView,
  ProductGridSectionView,
  StorySectionView,
  TestimonialsSectionView,
} from "@/components/home/HomeSections";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { absolute: settings.seo.defaultTitle },
    description: settings.seo.defaultDescription,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const settings = await getSettings();
  const allCategories = listCategories({ activeOnly: true });
  const featuredOrder = settings.homepage.featuredCategorySlugs;
  const categories = featuredOrder.length
    ? featuredOrder
        .map((slug) => allCategories.find((category) => category.slug === slug))
        .filter((category): category is NonNullable<typeof category> => Boolean(category))
    : allCategories;

  const reviews = topReviews(6);
  const sections = settings.homepage.sections.filter((section) => section.enabled);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.brand.name,
    legalName: settings.brand.legalName,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    description: settings.brand.description,
    email: settings.contact.email,
    telephone: settings.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.contact.address,
      addressLocality: settings.contact.city,
      addressCountry: settings.locale.country,
    },
    sameAs: Object.values(settings.social).filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      {sections.map((section) => {
        switch (section.type) {
          case "hero":
            return <HeroSection key={section.id} section={section} tagline={settings.brand.tagline} />;
          case "marquee":
            return <MarqueeSectionView key={section.id} section={section} />;
          case "categories":
            return <CategoriesSectionView key={section.id} section={section} categories={categories} />;
          case "product-grid":
            return <ProductGridSectionView key={section.id} section={section} settings={settings} />;
          case "editorial":
            return <EditorialSectionView key={section.id} section={section} />;
          case "story":
            return <StorySectionView key={section.id} section={section} />;
          case "testimonials":
            return <TestimonialsSectionView key={section.id} section={section} reviews={reviews} />;
          case "newsletter":
            return <NewsletterSectionView key={section.id} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}
