"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  CURRENCIES,
  DEFAULT_SETTINGS,
  FONT_REGISTRY,
  SECTION_DEFS,
  THEME_PRESETS,
  getSettings,
  saveSettings,
  type HomeSection,
  type NavLink,
  type SectionType,
  type StoreSettings,
} from "@/lib/settings";
import { isHexColor, newId, slugify } from "@/lib/utils";

export interface SettingsState {
  ok?: boolean;
  message?: string;
  error?: string;
}

const str = (formData: FormData, key: string, fallback = "") =>
  formData.has(key) ? String(formData.get(key) ?? "").trim() : fallback;

const num = (formData: FormData, key: string, fallback = 0) => {
  if (!formData.has(key)) return fallback;
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
};

const bool = (formData: FormData, key: string, fallback = false) =>
  formData.has(key) ? formData.get(key) === "on" || formData.get(key) === "true" : fallback;

const list = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const color = (formData: FormData, key: string, fallback: string) => {
  const value = str(formData, key, fallback);
  return isHexColor(value) ? value : fallback;
};

/** Parse "Label|/href" lines into navigation links. */
const links = (formData: FormData, key: string, fallback: NavLink[]): NavLink[] => {
  const parsed = list(formData, key)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());
      return label && href ? { label, href } : null;
    })
    .filter((link): link is NavLink => Boolean(link));
  return parsed.length ? parsed : fallback;
};

function finish(next: StoreSettings): SettingsState {
  saveSettings(next);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved — the storefront is updated." };
}

/**
 * One action for every settings tab. Each tab only writes the slice of the
 * configuration document it owns, so a stale form can never wipe another tab.
 */
export async function saveSettingsAction(_prev: SettingsState | null, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const tab = String(formData.get("__tab") ?? "");
  const current = await getSettings();
  const next: StoreSettings = structuredClone(current);

  switch (tab) {
    case "brand": {
      next.brand = {
        name: str(formData, "name", current.brand.name) || current.brand.name,
        legalName: str(formData, "legalName", current.brand.legalName),
        tagline: str(formData, "tagline", current.brand.tagline),
        description: str(formData, "description", current.brand.description),
        logoUrl: str(formData, "logoUrl", current.brand.logoUrl),
        faviconUrl: str(formData, "faviconUrl", current.brand.faviconUrl),
        ogImage: str(formData, "ogImage", current.brand.ogImage),
      };
      break;
    }

    case "theme": {
      next.theme = {
        preset: str(formData, "preset", current.theme.preset),
        colors: {
          canvas: color(formData, "colorCanvas", current.theme.colors.canvas),
          surface: color(formData, "colorSurface", current.theme.colors.surface),
          ink: color(formData, "colorInk", current.theme.colors.ink),
          muted: color(formData, "colorMuted", current.theme.colors.muted),
          line: color(formData, "colorLine", current.theme.colors.line),
          accent: color(formData, "colorAccent", current.theme.colors.accent),
          accentInk: color(formData, "colorAccentInk", current.theme.colors.accentInk),
          success: current.theme.colors.success,
          warning: current.theme.colors.warning,
          danger: current.theme.colors.danger,
        },
        fonts: {
          display: str(formData, "fontDisplay", current.theme.fonts.display),
          body: str(formData, "fontBody", current.theme.fonts.body),
        },
        radius: (str(formData, "radius", current.theme.radius) as StoreSettings["theme"]["radius"]) ?? "sharp",
        productCardRatio:
          (str(formData, "productCardRatio", current.theme.productCardRatio) as
            | StoreSettings["theme"]["productCardRatio"]
            | undefined) ?? "portrait",
      };
      break;
    }

    case "locale": {
      const currency = str(formData, "currency", current.locale.currency);
      const preset = CURRENCIES.find((entry) => entry.code === currency);
      next.locale = {
        currency,
        currencySymbol: preset?.symbol ?? current.locale.currencySymbol,
        locale: preset?.locale ?? current.locale.locale,
        country: str(formData, "country", current.locale.country),
        timezone: str(formData, "timezone", current.locale.timezone),
        weightUnit: (str(formData, "weightUnit", current.locale.weightUnit) as "kg" | "lb") ?? "kg",
      };
      break;
    }

    case "contact": {
      next.contact = {
        email: str(formData, "email", current.contact.email),
        phone: str(formData, "phone", current.contact.phone),
        whatsapp: str(formData, "whatsapp", current.contact.whatsapp),
        address: str(formData, "address", current.contact.address),
        city: str(formData, "city", current.contact.city),
        hours: str(formData, "hours", current.contact.hours),
        mapUrl: str(formData, "mapUrl", current.contact.mapUrl),
      };
      break;
    }

    case "social": {
      next.social = {
        instagram: str(formData, "instagram", current.social.instagram),
        x: str(formData, "x", current.social.x),
        facebook: str(formData, "facebook", current.social.facebook),
        tiktok: str(formData, "tiktok", current.social.tiktok),
        pinterest: str(formData, "pinterest", current.social.pinterest),
        youtube: str(formData, "youtube", current.social.youtube),
      };
      break;
    }

    case "announcement": {
      const messages = list(formData, "messages");
      next.announcement = {
        enabled: bool(formData, "enabled", current.announcement.enabled),
        messages: messages.length ? messages : current.announcement.messages,
        linkLabel: str(formData, "linkLabel", current.announcement.linkLabel),
        href: str(formData, "href", current.announcement.href),
      };
      break;
    }

    case "navigation": {
      next.navigation = {
        main: links(formData, "main", current.navigation.main),
        secondary: links(formData, "secondary", current.navigation.secondary),
      };
      break;
    }

    case "footer": {
      const columns = [0, 1, 2, 3]
        .map((index) => {
          const title = str(formData, `columnTitle${index}`, current.footer.columns[index]?.title ?? "");
          const columnLinks = list(formData, `columnLinks${index}`)
            .map((line) => {
              const [label, href] = line.split("|").map((part) => part.trim());
              return label && href ? { label, href } : null;
            })
            .filter((link): link is NavLink => Boolean(link));
          return title ? { title, links: columnLinks } : null;
        })
        .filter((column): column is { title: string; links: NavLink[] } => Boolean(column));

      next.footer = {
        blurb: str(formData, "blurb", current.footer.blurb),
        columns: columns.length ? columns : current.footer.columns,
        legal: str(formData, "legal", current.footer.legal),
      };
      break;
    }

    case "commerce": {
      const deliveryMethods = current.commerce.deliveryMethods.map((method, index) => ({
        id: method.id,
        label: str(formData, `deliveryLabel${index}`, method.label) || method.label,
        description: str(formData, `deliveryDescription${index}`, method.description),
        priceCents: Math.round(num(formData, `deliveryPrice${index}`, method.priceCents / 100) * 100),
        minDays: Math.max(0, Math.round(num(formData, `deliveryMin${index}`, method.minDays))),
        maxDays: Math.max(0, Math.round(num(formData, `deliveryMax${index}`, method.maxDays))),
        enabled: bool(formData, `deliveryEnabled${index}`, method.enabled),
      }));

      next.commerce = {
        ...current.commerce,
        guestCheckout: bool(formData, "guestCheckout", current.commerce.guestCheckout),
        reviewsEnabled: bool(formData, "reviewsEnabled", current.commerce.reviewsEnabled),
        newsletterEnabled: bool(formData, "newsletterEnabled", current.commerce.newsletterEnabled),
        showStockCount: bool(formData, "showStockCount", current.commerce.showStockCount),
        lowStockThreshold: Math.max(0, Math.round(num(formData, "lowStockThreshold", current.commerce.lowStockThreshold))),
        maxQuantityPerLine: Math.max(1, Math.round(num(formData, "maxQuantityPerLine", current.commerce.maxQuantityPerLine))),
        freeShippingThresholdCents: Math.round(
          num(formData, "freeShippingThreshold", current.commerce.freeShippingThresholdCents / 100) * 100,
        ),
        deliveryMethods,
      };
      break;
    }

    case "payments": {
      const enabled = (["paystack", "flutterwave", "bank_transfer", "cod"] as const).filter((method) =>
        formData.get(`method_${method}`) === "on",
      );
      next.commerce.payments = {
        enabled: enabled.length ? [...enabled] : ["bank_transfer"],
        codNote: str(formData, "codNote", current.commerce.payments.codNote),
        bankTransfer: {
          bankName: str(formData, "bankName", current.commerce.payments.bankTransfer.bankName),
          accountName: str(formData, "accountName", current.commerce.payments.bankTransfer.accountName),
          accountNumber: str(formData, "accountNumber", current.commerce.payments.bankTransfer.accountNumber),
          instructions: str(formData, "instructions", current.commerce.payments.bankTransfer.instructions),
        },
      };
      break;
    }

    case "tax": {
      next.commerce.tax = {
        enabled: bool(formData, "taxEnabled", current.commerce.tax.enabled),
        ratePercent: Math.min(50, Math.max(0, num(formData, "ratePercent", current.commerce.tax.ratePercent))),
        inclusive: bool(formData, "inclusive", current.commerce.tax.inclusive),
        label: str(formData, "label", current.commerce.tax.label) || "Tax",
        applyToShipping: bool(formData, "applyToShipping", current.commerce.tax.applyToShipping),
      };
      break;
    }

    case "seo": {
      next.seo = {
        titleTemplate: str(formData, "titleTemplate", current.seo.titleTemplate),
        defaultTitle: str(formData, "defaultTitle", current.seo.defaultTitle),
        defaultDescription: str(formData, "defaultDescription", current.seo.defaultDescription),
        keywords: str(formData, "keywords")
          ? str(formData, "keywords")
              .split(",")
              .map((keyword) => keyword.trim())
              .filter(Boolean)
          : current.seo.keywords,
        twitterHandle: str(formData, "twitterHandle", current.seo.twitterHandle),
      };
      break;
    }

    default:
      return { error: "Unknown settings tab." };
  }

  return finish(next);
}

/* -------------------------------------------------------------------------- */
/* Homepage layout                                                            */
/* -------------------------------------------------------------------------- */

function parseSectionFields(formData: FormData, type: SectionType, existing: HomeSection): HomeSection {
  const definition = SECTION_DEFS[type];
  const next = { ...existing } as Record<string, unknown>;

  for (const field of definition.fields) {
    const key = `f_${field.name}`;
    if (!formData.has(key)) continue;
    if (field.type === "list") {
      next[field.name] = list(formData, key);
    } else if (field.type === "number") {
      next[field.name] = Math.max(0, Math.round(num(formData, key, Number(existing[field.name as never]) || 0)));
    } else {
      next[field.name] = String(formData.get(key) ?? "").trim();
    }
  }
  if ("enabled" in existing) next.enabled = formData.get("f_enabled") === "on";
  return next as unknown as HomeSection;
}

export async function saveSectionAction(_prev: SettingsState | null, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const id = String(formData.get("sectionId") ?? "");
  const current = await getSettings();
  const index = current.homepage.sections.findIndex((section) => section.id === id);
  if (index === -1) return { error: "Section not found." };

  const next = structuredClone(current);
  next.homepage.sections[index] = parseSectionFields(formData, next.homepage.sections[index].type, next.homepage.sections[index]);
  return finish(next);
}

export async function toggleSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("sectionId") ?? "");
  const current = await getSettings();
  const next = structuredClone(current);
  const index = next.homepage.sections.findIndex((section) => section.id === id);
  if (index === -1) return;
  next.homepage.sections[index].enabled = !next.homepage.sections[index].enabled;
  finish(next);
}

export async function moveSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("sectionId") ?? "");
  const direction = String(formData.get("direction") ?? "up");
  const current = await getSettings();
  const next = structuredClone(current);
  const index = next.homepage.sections.findIndex((section) => section.id === id);
  if (index === -1) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= next.homepage.sections.length) return;
  const sections = next.homepage.sections;
  [sections[index], sections[target]] = [sections[target], sections[index]];
  finish(next);
}

export async function deleteSectionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("sectionId") ?? "");
  const current = await getSettings();
  const next = structuredClone(current);
  next.homepage.sections = next.homepage.sections.filter((section) => section.id !== id);
  finish(next);
}

export async function addSectionAction(formData: FormData) {
  await requireAdmin();
  const type = String(formData.get("type") ?? "") as SectionType;
  if (!SECTION_DEFS[type]) return;
  const current = await getSettings();
  const next = structuredClone(current);

  const template = DEFAULT_SETTINGS.homepage.sections.find((section) => section.type === type);
  const section = template
    ? ({ ...structuredClone(template), id: newId("sec") } as HomeSection)
    : ({
        id: newId("sec"),
        type,
        enabled: true,
      } as HomeSection);

  if (type === "product-grid") {
    (section as Extract<HomeSection, { type: "product-grid" }>).limit = 4;
  }

  next.homepage.sections.push(section);
  finish(next);
}

export async function saveHomepageMetaAction(_prev: SettingsState | null, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const current = await getSettings();
  const next = structuredClone(current);
  next.homepage.featuredCategorySlugs = str(formData, "featuredCategorySlugs")
    .split(",")
    .map((slug) => slugify(slug))
    .filter(Boolean);
  return finish(next);
}

/* -------------------------------------------------------------------------- */
/* Configurator                                                               */
/* -------------------------------------------------------------------------- */

export async function applyThemePresetAction(formData: FormData) {
  await requireAdmin();
  const presetId = String(formData.get("presetId") ?? "");
  const preset = THEME_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) return;

  const current = await getSettings();
  const next = structuredClone(current);
  next.theme = {
    ...next.theme,
    preset: preset.id,
    colors: { ...next.theme.colors, ...preset.colors },
    fonts: { ...preset.fonts },
    radius: preset.radius,
  };
  finish(next);
  revalidatePath("/admin/configurator");
}

export async function resetSettingsAction(formData: FormData) {
  await requireAdmin();
  const scope = String(formData.get("scope") ?? "theme");
  const current = await getSettings();
  const next = structuredClone(current);

  if (scope === "theme") {
    next.theme = structuredClone(DEFAULT_SETTINGS.theme);
  } else if (scope === "homepage") {
    next.homepage = structuredClone(DEFAULT_SETTINGS.homepage);
  } else if (scope === "all") {
    saveSettings(structuredClone(DEFAULT_SETTINGS));
    revalidatePath("/", "layout");
    return;
  }
  finish(next);
  revalidatePath("/admin/configurator");
}

export async function saveFontsAction(formData: FormData) {
  await requireAdmin();
  const current = await getSettings();
  const next = structuredClone(current);
  const display = String(formData.get("fontDisplay") ?? "");
  const body = String(formData.get("fontBody") ?? "");
  if (display in FONT_REGISTRY) next.theme.fonts.display = display;
  if (body in FONT_REGISTRY) next.theme.fonts.body = body;
  finish(next);
  revalidatePath("/admin/configurator");
}
