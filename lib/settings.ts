import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";

/* ==========================================================================
 * Store configuration — the universal customization engine
 * ==========================================================================
 * Every piece of brand identity, copy, merchandising, commerce and integration
 * configuration lives in one validated JSON document stored in the `settings`
 * table (key = "store"). Nothing about a particular business is hardcoded in
 * components: the storefront renders whatever this document describes, so the
 * same codebase can be re-skinned into a fashion, electronics, furniture,
 * beauty, grocery, jewellery or general-retail store from the admin UI.
 * ========================================================================== */

export type SectionType =
  | "hero"
  | "marquee"
  | "categories"
  | "product-grid"
  | "editorial"
  | "story"
  | "testimonials"
  | "newsletter";

export interface HomeSectionBase {
  id: string;
  type: SectionType;
  enabled: boolean;
}

export interface HeroSection extends HomeSectionBase {
  type: "hero";
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: string;
  imageAlt: string;
  stats: { value: string; label: string }[];
}

export interface MarqueeSection extends HomeSectionBase {
  type: "marquee";
  items: string[];
}

export interface CategoriesSection extends HomeSectionBase {
  type: "categories";
  eyebrow: string;
  heading: string;
  body: string;
  limit: number;
}

export interface ProductGridSection extends HomeSectionBase {
  type: "product-grid";
  eyebrow: string;
  heading: string;
  body: string;
  mode: "bestsellers" | "new" | "featured";
  limit: number;
  ctaLabel: string;
  ctaHref: string;
}

export interface EditorialSection extends HomeSectionBase {
  type: "editorial";
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  secondaryImage: string;
  layout: "split" | "banner";
  tone: "canvas" | "ink" | "accent";
}

export interface StorySection extends HomeSectionBase {
  type: "story";
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  bullets: string[];
}

export interface TestimonialsSection extends HomeSectionBase {
  type: "testimonials";
  eyebrow: string;
  heading: string;
  body: string;
}

export interface NewsletterSection extends HomeSectionBase {
  type: "newsletter";
  eyebrow: string;
  heading: string;
  body: string;
  note: string;
}

export type HomeSection =
  | HeroSection
  | MarqueeSection
  | CategoriesSection
  | ProductGridSection
  | EditorialSection
  | StorySection
  | TestimonialsSection
  | NewsletterSection;

export interface NavLink {
  label: string;
  href: string;
}

export interface DeliveryMethod {
  id: string;
  label: string;
  description: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
  enabled: boolean;
}

export type PaymentMethodId = "paystack" | "flutterwave" | "bank_transfer" | "cod";

export interface CouponSummary {
  code: string;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
}

export interface StoreSettings {
  version: number;
  brand: {
    name: string;
    legalName: string;
    tagline: string;
    description: string;
    logoUrl: string;
    faviconUrl: string;
    ogImage: string;
  };
  theme: {
    preset: string;
    colors: {
      canvas: string;
      surface: string;
      ink: string;
      muted: string;
      line: string;
      accent: string;
      accentInk: string;
      success: string;
      warning: string;
      danger: string;
    };
    fonts: { display: string; body: string };
    radius: "sharp" | "soft" | "round";
    productCardRatio: "portrait" | "square" | "tall";
  };
  locale: {
    currency: string;
    currencySymbol: string;
    locale: string;
    country: string;
    timezone: string;
    weightUnit: "kg" | "lb";
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    city: string;
    hours: string;
    mapUrl: string;
  };
  social: {
    instagram: string;
    x: string;
    facebook: string;
    tiktok: string;
    pinterest: string;
    youtube: string;
  };
  announcement: {
    enabled: boolean;
    messages: string[];
    linkLabel: string;
    href: string;
  };
  navigation: {
    main: NavLink[];
    secondary: NavLink[];
  };
  footer: {
    blurb: string;
    columns: { title: string; links: NavLink[] }[];
    legal: string;
  };
  commerce: {
    guestCheckout: boolean;
    reviewsEnabled: boolean;
    newsletterEnabled: boolean;
    showStockCount: boolean;
    lowStockThreshold: number;
    freeShippingThresholdCents: number;
    deliveryMethods: DeliveryMethod[];
    tax: {
      enabled: boolean;
      ratePercent: number;
      inclusive: boolean;
      label: string;
      applyToShipping: boolean;
    };
    payments: {
      enabled: PaymentMethodId[];
      codNote: string;
      bankTransfer: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        instructions: string;
      };
    };
    maxQuantityPerLine: number;
  };
  seo: {
    titleTemplate: string;
    defaultTitle: string;
    defaultDescription: string;
    keywords: string[];
    twitterHandle: string;
  };
  homepage: {
    sections: HomeSection[];
    featuredCategorySlugs: string[];
  };
}

export const FONT_REGISTRY = {
  "instrument-serif": {
    label: "Instrument Serif",
    stack: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
    kind: "serif",
  },
  fraunces: {
    label: "Fraunces",
    stack: '"Fraunces Variable", "Fraunces", Georgia, serif',
    kind: "serif",
  },
  inter: {
    label: "Inter",
    stack: '"Inter Variable", "Inter", system-ui, sans-serif',
    kind: "sans",
  },
  "dm-sans": {
    label: "DM Sans",
    stack: '"DM Sans Variable", "DM Sans", system-ui, sans-serif',
    kind: "sans",
  },
} as const;

export type FontKey = keyof typeof FONT_REGISTRY;

export const CURRENCIES = [
  { code: "NGN", symbol: "₦", locale: "en-NG", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", locale: "en-US", label: "US Dollar" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "Pound Sterling" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro" },
  { code: "GHS", symbol: "₵", locale: "en-GH", label: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", locale: "en-KE", label: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", locale: "en-ZA", label: "South African Rand" },
  { code: "CAD", symbol: "CA$", locale: "en-CA", label: "Canadian Dollar" },
  { code: "AED", symbol: "AED", locale: "en-AE", label: "UAE Dirham" },
] as const;

export const DEFAULT_SETTINGS: StoreSettings = {
  version: 1,
  brand: {
    name: "Product Pro Hub",
    legalName: "Product Pro Hub Ltd.",
    tagline: "Considered essentials, made to be lived in.",
    description:
      "A modern atelier of quietly made pieces — natural fibres, honest construction and a warm neutral palette that outlives the season.",
    logoUrl: "",
    faviconUrl: "/favicon.svg",
    ogImage: "/images/editorial/og-cover.jpg",
  },
  theme: {
    preset: "atelier",
    colors: {
      canvas: "#F7F4EF",
      surface: "#FFFFFF",
      ink: "#191813",
      muted: "#6F6A60",
      line: "#E2DACE",
      accent: "#9E5233",
      accentInk: "#FDF9F3",
      success: "#3F6B4F",
      warning: "#B08033",
      danger: "#A03A2E",
    },
    fonts: { display: "instrument-serif", body: "inter" },
    radius: "sharp",
    productCardRatio: "portrait",
  },
  locale: {
    currency: "NGN",
    currencySymbol: "₦",
    locale: "en-NG",
    country: "NG",
    timezone: "Africa/Lagos",
    weightUnit: "kg",
  },
  contact: {
    email: "hello@productprohub.com",
    phone: "+234 901 234 5678",
    whatsapp: "+234 901 234 5678",
    address: "14 Adeola Odeku Street, Victoria Island",
    city: "Lagos, Nigeria",
    hours: "Mon–Sat, 9am – 6pm WAT",
    mapUrl: "",
  },
  social: {
    instagram: "https://instagram.com/productprohub",
    x: "https://x.com/productprohub",
    facebook: "",
    tiktok: "https://tiktok.com/@productprohub",
    pinterest: "",
    youtube: "",
  },
  announcement: {
    enabled: true,
    messages: [
      "Complimentary delivery on orders over ₦150,000",
      "The Linen Edit has landed — made in small runs",
      "Pay in instalments with Paystack at checkout",
    ],
    linkLabel: "Shop the edit",
    href: "/shop?collection=The+Linen+Edit",
  },
  navigation: {
    main: [
      { label: "New in", href: "/shop?sort=newest" },
      { label: "Women", href: "/collections/women" },
      { label: "Men", href: "/collections/men" },
      { label: "Accessories", href: "/collections/accessories" },
      { label: "Home", href: "/collections/home-living" },
      { label: "Beauty", href: "/collections/beauty" },
    ],
    secondary: [
      { label: "Journal", href: "/journal" },
      { label: "Our story", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  footer: {
    blurb:
      "Made in small runs from natural fibres and honest materials. Designed in Lagos, shipped worldwide.",
    columns: [
      {
        title: "Shop",
        links: [
          { label: "New arrivals", href: "/shop?sort=newest" },
          { label: "Best sellers", href: "/shop?sort=popular" },
          { label: "Women", href: "/collections/women" },
          { label: "Men", href: "/collections/men" },
          { label: "Home & living", href: "/collections/home-living" },
        ],
      },
      {
        title: "Client care",
        links: [
          { label: "Contact us", href: "/contact" },
          { label: "Delivery & returns", href: "/pages/delivery-and-returns" },
          { label: "Size guide", href: "/pages/size-guide" },
          { label: "Track your order", href: "/account/orders" },
          { label: "FAQs", href: "/pages/faq" },
        ],
      },
      {
        title: "Atelier",
        links: [
          { label: "Our story", href: "/about" },
          { label: "Journal", href: "/journal" },
          { label: "Sustainability", href: "/pages/sustainability" },
          { label: "Stockists", href: "/pages/stockists" },
        ],
      },
    ],
    legal: `© ${new Date().getFullYear()} Product Pro Hub Ltd. All rights reserved.`,
  },
  commerce: {
    guestCheckout: true,
    reviewsEnabled: true,
    newsletterEnabled: true,
    showStockCount: true,
    lowStockThreshold: 5,
    freeShippingThresholdCents: 15_000_000,
    deliveryMethods: [
      {
        id: "standard",
        label: "Standard delivery",
        description: "Courier to your door, 3–5 business days",
        priceCents: 350_000,
        minDays: 3,
        maxDays: 5,
        enabled: true,
      },
      {
        id: "express",
        label: "Express delivery",
        description: "Priority dispatch, next business day in Lagos",
        priceCents: 750_000,
        minDays: 1,
        maxDays: 2,
        enabled: true,
      },
      {
        id: "pickup",
        label: "Atelier pick-up",
        description: "Collect free from our Victoria Island atelier",
        priceCents: 0,
        minDays: 1,
        maxDays: 2,
        enabled: true,
      },
      {
        id: "international",
        label: "International (DHL)",
        description: "Tracked international shipping, 5–9 business days",
        priceCents: 2_800_000,
        minDays: 5,
        maxDays: 9,
        enabled: true,
      },
    ],
    tax: {
      enabled: true,
      ratePercent: 7.5,
      inclusive: true,
      label: "VAT",
      applyToShipping: false,
    },
    payments: {
      enabled: ["paystack", "bank_transfer", "cod"],
      codNote: "Pay the courier on delivery. Available in Lagos, Abuja and Port Harcourt.",
      bankTransfer: {
        bankName: "Guaranty Trust Bank",
        accountName: "Product Pro Hub Ltd",
        accountNumber: "0123456789",
        instructions:
          "Transfer the exact order total and use your order number as the reference. Orders are released once payment is confirmed — usually within one business day.",
      },
    },
    maxQuantityPerLine: 10,
  },
  seo: {
    titleTemplate: "%s — Product Pro Hub",
    defaultTitle: "Product Pro Hub — Considered essentials, made to be lived in",
    defaultDescription:
      "Shop quietly made clothing and objects in natural fibres, designed in Lagos. Free delivery over ₦150,000.",
    keywords: ["fashion", "linen", "slow fashion", "Lagos atelier", "premium essentials"],
    twitterHandle: "@productprohub",
  },
  homepage: {
    featuredCategorySlugs: ["women", "men", "accessories", "home-living", "beauty", "footwear"],
    sections: [
      {
        id: "hero-1",
        type: "hero",
        enabled: true,
        eyebrow: "Spring / Summer 2026 — The Linen Edit",
        headline: "Dress for the pace of a",
        headlineAccent: "slower life.",
        body: "Natural fibres, thoughtful cuts and a warm neutral palette. Made in small runs, finished by hand and sent from our Lagos atelier.",
        ctaLabel: "Shop the collection",
        ctaHref: "/shop",
        secondaryLabel: "Our story",
        secondaryHref: "/about",
        image: "/images/editorial/hero-main.jpg",
        imageAlt: "Model wearing a natural linen dress in soft studio light",
        stats: [
          { value: "1,400+", label: "Pieces made by hand" },
          { value: "4.9/5", label: "From 380 clients" },
          { value: "48h", label: "Lagos delivery" },
        ],
      },
      {
        id: "marquee-1",
        type: "marquee",
        enabled: true,
        items: [
          "Natural fibres only",
          "Made in small runs",
          "Free delivery over ₦150,000",
          "30-day returns",
          "Ethically made in Lagos",
        ],
      },
      {
        id: "categories-1",
        type: "categories",
        enabled: true,
        eyebrow: "Browse the atelier",
        heading: "Shop by category",
        body: "Six considered edits, each built around pieces that work together season after season.",
        limit: 6,
      },
      {
        id: "grid-1",
        type: "product-grid",
        enabled: true,
        eyebrow: "Most loved",
        heading: "Best sellers",
        body: "The pieces our clients return for — and tell their friends about.",
        mode: "bestsellers",
        limit: 8,
        ctaLabel: "View all best sellers",
        ctaHref: "/shop?sort=popular",
      },
      {
        id: "editorial-1",
        type: "editorial",
        enabled: true,
        eyebrow: "Limited release",
        heading: "The Atelier Sale",
        body: "Up to 30% off selected linen and knitwear from last season. Once they're gone, they're gone — every piece is made in runs of fifty.",
        ctaLabel: "Shop the sale",
        ctaHref: "/shop?sale=true",
        image: "/images/editorial/promo-linen.jpg",
        secondaryImage: "/images/editorial/promo-detail.jpg",
        layout: "split",
        tone: "accent",
      },
      {
        id: "grid-2",
        type: "product-grid",
        enabled: true,
        eyebrow: "Just arrived",
        heading: "New arrivals",
        body: "Fresh from the cutting table: new silhouettes in washed cotton and raw silk.",
        mode: "new",
        limit: 4,
        ctaLabel: "See everything new",
        ctaHref: "/shop?sort=newest",
      },
      {
        id: "story-1",
        type: "story",
        enabled: true,
        eyebrow: "Inside the atelier",
        heading: "Made slowly, worn for years.",
        body: "We work with three family-run workshops in Lagos and Ibadan. Every garment is cut, sewn and finished within a few kilometres of where it was designed — in runs small enough that the people who make them know them by name.",
        ctaLabel: "Read our story",
        ctaHref: "/about",
        image: "/images/editorial/story-atelier.jpg",
        bullets: [
          "Natural and deadstock fibres only",
          "Living wages, audited twice a year",
          "Small-batch production, zero overstock",
        ],
      },
      {
        id: "testimonials-1",
        type: "testimonials",
        enabled: true,
        eyebrow: "In their words",
        heading: "Kind words from our clients",
        body: "Unedited reviews from people who bought and kept wearing these pieces.",
      },
      {
        id: "newsletter-1",
        type: "newsletter",
        enabled: true,
        eyebrow: "Letters from the atelier",
        heading: "Ten percent off your first order.",
        body: "Seasonal edits, restock alerts and notes from the studio. One considered letter a month — never noise.",
        note: "By subscribing you agree to our privacy policy. Unsubscribe any time.",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Section metadata used to generate the admin homepage editor                */
/* -------------------------------------------------------------------------- */

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "image" | "url" | "select" | "number" | "list";
  options?: { label: string; value: string }[];
  placeholder?: string;
  help?: string;
  span?: 1 | 2;
}

export const SECTION_DEFS: Record<
  SectionType,
  { label: string; description: string; fields: FieldDef[] }
> = {
  hero: {
    label: "Hero",
    description: "Full-bleed opening statement with imagery and calls to action.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text", span: 2 },
      { name: "headline", label: "Headline", type: "text", span: 2 },
      { name: "headlineAccent", label: "Headline (italic accent)", type: "text", span: 2 },
      { name: "body", label: "Supporting copy", type: "textarea", span: 2 },
      { name: "ctaLabel", label: "Primary CTA label", type: "text" },
      { name: "ctaHref", label: "Primary CTA link", type: "url" },
      { name: "secondaryLabel", label: "Secondary CTA label", type: "text" },
      { name: "secondaryHref", label: "Secondary CTA link", type: "url" },
      { name: "image", label: "Image", type: "image", span: 2 },
      { name: "imageAlt", label: "Image alt text", type: "text", span: 2 },
    ],
  },
  marquee: {
    label: "Scrolling value bar",
    description: "A quiet marquee of short trust statements.",
    fields: [{ name: "items", label: "Statements (one per line)", type: "list", span: 2 }],
  },
  categories: {
    label: "Category grid",
    description: "Editorial tiles for the store's top-level categories.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "heading", label: "Heading", type: "text" },
      { name: "body", label: "Body", type: "textarea", span: 2 },
      { name: "limit", label: "Number of categories", type: "number" },
    ],
  },
  "product-grid": {
    label: "Product grid",
    description: "A curated rail of products pulled live from the catalogue.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "heading", label: "Heading", type: "text" },
      { name: "body", label: "Body", type: "textarea", span: 2 },
      {
        name: "mode",
        label: "Selection",
        type: "select",
        options: [
          { label: "Best sellers", value: "bestsellers" },
          { label: "New arrivals", value: "new" },
          { label: "Featured", value: "featured" },
        ],
      },
      { name: "limit", label: "Products shown", type: "number" },
      { name: "ctaLabel", label: "CTA label", type: "text" },
      { name: "ctaHref", label: "CTA link", type: "url" },
    ],
  },
  editorial: {
    label: "Promotional banner",
    description: "Campaign block with images, used for sales and collections.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "heading", label: "Heading", type: "text" },
      { name: "body", label: "Body", type: "textarea", span: 2 },
      { name: "ctaLabel", label: "CTA label", type: "text" },
      { name: "ctaHref", label: "CTA link", type: "url" },
      { name: "image", label: "Primary image", type: "image" },
      { name: "secondaryImage", label: "Secondary image", type: "image" },
      {
        name: "layout",
        label: "Layout",
        type: "select",
        options: [
          { label: "Split (two images)", value: "split" },
          { label: "Full-width banner", value: "banner" },
        ],
      },
      {
        name: "tone",
        label: "Tone",
        type: "select",
        options: [
          { label: "Accent", value: "accent" },
          { label: "Canvas", value: "canvas" },
          { label: "Ink", value: "ink" },
        ],
      },
    ],
  },
  story: {
    label: "Brand story",
    description: "Two-column narrative with an image and proof points.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "heading", label: "Heading", type: "text" },
      { name: "body", label: "Body", type: "textarea", span: 2 },
      { name: "ctaLabel", label: "CTA label", type: "text" },
      { name: "ctaHref", label: "CTA link", type: "url" },
      { name: "image", label: "Image", type: "image", span: 2 },
      { name: "bullets", label: "Proof points (one per line)", type: "list", span: 2 },
    ],
  },
  testimonials: {
    label: "Testimonials",
    description: "Pulls the highest-rated published customer reviews from the database.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "heading", label: "Heading", type: "text" },
      { name: "body", label: "Body", type: "textarea", span: 2 },
    ],
  },
  newsletter: {
    label: "Newsletter",
    description: "Email capture that writes to the subscribers table.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "heading", label: "Heading", type: "text" },
      { name: "body", label: "Body", type: "textarea", span: 2 },
      { name: "note", label: "Fine print", type: "textarea", span: 2 },
    ],
  },
};

export const THEME_PRESETS = [
  {
    id: "atelier",
    label: "Atelier — fashion & lifestyle",
    colors: {
      canvas: "#F7F4EF",
      surface: "#FFFFFF",
      ink: "#191813",
      muted: "#6F6A60",
      line: "#E2DACE",
      accent: "#9E5233",
      accentInk: "#FDF9F3",
    },
    fonts: { display: "instrument-serif", body: "inter" },
    radius: "sharp" as const,
  },
  {
    id: "circuit",
    label: "Circuit — electronics & tech",
    colors: {
      canvas: "#F4F5F7",
      surface: "#FFFFFF",
      ink: "#0E1116",
      muted: "#5C6270",
      line: "#DDE1E7",
      accent: "#1D4ED8",
      accentInk: "#FFFFFF",
    },
    fonts: { display: "dm-sans", body: "inter" },
    radius: "soft" as const,
  },
  {
    id: "hearth",
    label: "Hearth — furniture & decor",
    colors: {
      canvas: "#F3EFE7",
      surface: "#FBF8F3",
      ink: "#221D16",
      muted: "#726758",
      line: "#DCD2C2",
      accent: "#5C6B4A",
      accentInk: "#F7F5EE",
    },
    fonts: { display: "fraunces", body: "dm-sans" },
    radius: "soft" as const,
  },
  {
    id: "botanica",
    label: "Botanica — beauty & skincare",
    colors: {
      canvas: "#FBF6F3",
      surface: "#FFFFFF",
      ink: "#231A17",
      muted: "#7A6862",
      line: "#EADDD6",
      accent: "#A85A45",
      accentInk: "#FFF9F6",
    },
    fonts: { display: "fraunces", body: "inter" },
    radius: "round" as const,
  },
  {
    id: "market",
    label: "Market — grocery & food",
    colors: {
      canvas: "#FAF9F3",
      surface: "#FFFFFF",
      ink: "#16211A",
      muted: "#5F6B62",
      line: "#E0E3D6",
      accent: "#3F7A45",
      accentInk: "#F7FBF5",
    },
    fonts: { display: "dm-sans", body: "inter" },
    radius: "soft" as const,
  },
  {
    id: "vault",
    label: "Vault — jewellery & accessories",
    colors: {
      canvas: "#12100E",
      surface: "#191613",
      ink: "#F4EFE6",
      muted: "#B3A794",
      line: "#332C25",
      accent: "#C8A96B",
      accentInk: "#171310",
    },
    fonts: { display: "instrument-serif", body: "dm-sans" },
    radius: "sharp" as const,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Reading / writing                                                          */
/* -------------------------------------------------------------------------- */

/** Deep-merge stored settings over defaults so older documents keep working. */
export function mergeSettings(stored: unknown): StoreSettings {
  return deepMerge(DEFAULT_SETTINGS, stored) as StoreSettings;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch === undefined ? base : patch;
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) {
    out[key] = key in base ? deepMerge(base[key], patch[key]) : patch[key];
  }
  return out;
}

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const row = db().get<{ value: string }>("SELECT value FROM settings WHERE key = 'store'");
  if (!row) return DEFAULT_SETTINGS;
  return mergeSettings(parseJson<Record<string, unknown>>(row.value, {}));
});

export async function saveSettings(next: StoreSettings): Promise<void> {
  db().run(
    `INSERT INTO settings (key, value, updated_at) VALUES ('store', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [JSON.stringify(next)],
  );
}

export function fontStack(key: string): string {
  return (FONT_REGISTRY[key as FontKey] ?? FONT_REGISTRY.inter).stack;
}

export function radiusScale(radius: StoreSettings["theme"]["radius"]) {
  switch (radius) {
    case "round":
      return { sm: "6px", md: "14px", lg: "28px", full: "999px" };
    case "soft":
      return { sm: "4px", md: "10px", lg: "18px", full: "999px" };
    default:
      return { sm: "2px", md: "4px", lg: "6px", full: "999px" };
  }
}

export function paymentMethodLabel(id: PaymentMethodId): string {
  switch (id) {
    case "paystack":
      return "Paystack — card, bank, USSD";
    case "flutterwave":
      return "Flutterwave — card, bank, mobile money";
    case "bank_transfer":
      return "Bank transfer";
    case "cod":
      return "Cash on delivery";
    default:
      return id;
  }
}

/** Whether the server environment holds live credentials for a provider. */
export function providerConfigured(id: PaymentMethodId): boolean {
  if (id === "paystack") return Boolean(process.env.PAYSTACK_SECRET_KEY);
  if (id === "flutterwave") return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
  return true;
}
