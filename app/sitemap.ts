import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/repositories/catalog";
import { CONTENT_PAGES, JOURNAL } from "@/lib/content";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const base = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const { products } = listProducts({ limit: 100 });
  const categories = listCategories({ activeOnly: true });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base()}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base()}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base()}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base()}/journal`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base()}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${base()}/products/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt.replace(" ", "T") + "Z") : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
    images: product.images.filter((image) => image.startsWith("/")).map((image) => `${base()}${image}`),
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base()}/collections/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const pageRoutes: MetadataRoute.Sitemap = Object.keys(CONTENT_PAGES).map((slug) => ({
    url: `${base()}/pages/${slug}`,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const journalRoutes: MetadataRoute.Sitemap = JOURNAL.map((post) => ({
    url: `${base()}/journal/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  // Referenced to keep the store name in scope for future multi-store sitemaps.
  void settings.brand.name;

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...journalRoutes, ...pageRoutes];
}
