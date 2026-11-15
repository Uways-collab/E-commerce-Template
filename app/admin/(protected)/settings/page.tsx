import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { CURRENCIES, FONT_REGISTRY, THEME_PRESETS, paymentMethodLabel, providerConfigured } from "@/lib/settings";
import { cn } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import SettingsPanel, { type SettingsField } from "@/components/admin/SettingsPanel";
import { saveSettingsAction } from "@/app/actions/admin-settings";

export const metadata = { title: "Store settings" };

const TABS = [
  { id: "brand", label: "Brand", hint: "Name, logo, description" },
  { id: "theme", label: "Theme", hint: "Colours, type, shape" },
  { id: "locale", label: "Locale", hint: "Currency, country, timezone" },
  { id: "contact", label: "Contact", hint: "Address, email, hours" },
  { id: "social", label: "Social", hint: "Profile links" },
  { id: "announcement", label: "Announcement", hint: "Rotating bar" },
  { id: "navigation", label: "Navigation", hint: "Header menus" },
  { id: "footer", label: "Footer", hint: "Blurb and columns" },
  { id: "commerce", label: "Commerce", hint: "Delivery, stock, limits" },
  { id: "payments", label: "Payments", hint: "Providers and bank details" },
  { id: "tax", label: "Tax", hint: "Rates and inclusion" },
  { id: "seo", label: "SEO", hint: "Titles and keywords" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { user, settings, groups } = await adminContext();
  const params = await searchParams;
  const tab = (TABS.find((entry) => entry.id === params.tab)?.id ?? "brand") as TabId;

  const fontOptions = Object.entries(FONT_REGISTRY).map(([value, font]) => ({
    value,
    label: `${font.label} — ${font.kind}`,
  }));

  const fieldsByTab: Record<TabId, SettingsField[]> = {
    brand: [
      { name: "name", label: "Business name", type: "text", value: settings.brand.name, help: "Appears in the header, footer, page titles and order emails." },
      { name: "legalName", label: "Legal / registered name", type: "text", value: settings.brand.legalName },
      { name: "tagline", label: "Tagline", type: "text", value: settings.brand.tagline, span: 2 },
      { name: "description", label: "Short description", type: "textarea", value: settings.brand.description, span: 2, help: "Used in the footer, about page and default meta description." },
      { name: "logoUrl", label: "Logo URL", type: "text", value: settings.brand.logoUrl, placeholder: "Leave blank for the wordmark", help: "Upload via Products → any image field, or paste /api/media/…" },
      { name: "faviconUrl", label: "Favicon URL", type: "text", value: settings.brand.faviconUrl, placeholder: "/favicon.svg" },
      { name: "ogImage", label: "Open Graph image", type: "text", value: settings.brand.ogImage, span: 2, help: "1200×630 social preview. Applies site-wide unless a page overrides it." },
    ],
    theme: [
      {
        name: "preset",
        label: "Palette preset",
        type: "select",
        value: settings.theme.preset,
        options: [
          ...THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
          ...(THEME_PRESETS.some((preset) => preset.id === settings.theme.preset)
            ? []
            : [{ value: settings.theme.preset, label: `${settings.theme.preset} (custom)` }]),
        ],
        span: 2,
        help: "Presets are starting points — the tokens below stay editable. The full visual configurator is under Appearance.",
      },
      { name: "colorCanvas", label: "Canvas", type: "color", value: settings.theme.colors.canvas },
      { name: "colorSurface", label: "Surface / cards", type: "color", value: settings.theme.colors.surface },
      { name: "colorInk", label: "Ink / primary text", type: "color", value: settings.theme.colors.ink },
      { name: "colorMuted", label: "Muted text", type: "color", value: settings.theme.colors.muted },
      { name: "colorLine", label: "Hairlines & borders", type: "color", value: settings.theme.colors.line },
      { name: "colorAccent", label: "Accent", type: "color", value: settings.theme.colors.accent },
      { name: "colorAccentInk", label: "Text on accent", type: "color", value: settings.theme.colors.accentInk },
      { name: "fontDisplay", label: "Display typeface", type: "select", value: settings.theme.fonts.display, options: fontOptions },
      { name: "fontBody", label: "Body typeface", type: "select", value: settings.theme.fonts.body, options: fontOptions },
      {
        name: "radius",
        label: "Corner treatment",
        type: "select",
        value: settings.theme.radius,
        options: [
          { value: "sharp", label: "Sharp — editorial" },
          { value: "soft", label: "Soft — 6px" },
          { value: "round", label: "Round — pill controls" },
        ],
      },
      {
        name: "productCardRatio",
        label: "Product card ratio",
        type: "select",
        value: settings.theme.productCardRatio,
        options: [
          { value: "tall", label: "Tall — 3:4.4" },
          { value: "portrait", label: "Portrait — 4:5" },
          { value: "square", label: "Square — 1:1" },
        ],
        help: "Square suits electronics and homeware, tall suits fashion.",
      },
    ],
    locale: [
      {
        name: "currency",
        label: "Currency",
        type: "select",
        value: settings.locale.currency,
        options: CURRENCIES.map((currency) => ({
          value: currency.code,
          label: `${currency.code} — ${currency.label}`,
        })),
        help: "Changes the storefront label and the locale used for formatting. Historical prices are stored in minor units and are not converted.",
      },
      { name: "country", label: "Country code", type: "text", value: settings.locale.country, placeholder: "NG" },
      { name: "timezone", label: "Timezone", type: "text", value: settings.locale.timezone, placeholder: "Africa/Lagos" },
      {
        name: "weightUnit",
        label: "Weight unit",
        type: "select",
        value: settings.locale.weightUnit,
        options: [
          { value: "kg", label: "Kilograms" },
          { value: "lb", label: "Pounds" },
        ],
      },
    ],
    contact: [
      { name: "email", label: "Support email", type: "text", value: settings.contact.email },
      { name: "phone", label: "Phone", type: "text", value: settings.contact.phone },
      { name: "whatsapp", label: "WhatsApp", type: "text", value: settings.contact.whatsapp },
      { name: "hours", label: "Opening hours", type: "text", value: settings.contact.hours },
      { name: "address", label: "Street address", type: "text", value: settings.contact.address, span: 2 },
      { name: "city", label: "City / region", type: "text", value: settings.contact.city },
      { name: "mapUrl", label: "Map embed URL", type: "text", value: settings.contact.mapUrl, placeholder: "https://maps.google.com/…", help: "Optional. Shown on the contact page when set." },
    ],
    social: [
      { name: "instagram", label: "Instagram", type: "text", value: settings.social.instagram, placeholder: "https://instagram.com/…" },
      { name: "x", label: "X / Twitter", type: "text", value: settings.social.x },
      { name: "facebook", label: "Facebook", type: "text", value: settings.social.facebook },
      { name: "tiktok", label: "TikTok", type: "text", value: settings.social.tiktok },
      { name: "pinterest", label: "Pinterest", type: "text", value: settings.social.pinterest },
      { name: "youtube", label: "YouTube", type: "text", value: settings.social.youtube },
    ],
    announcement: [
      { name: "enabled", label: "Show the announcement bar", type: "checkbox", value: settings.announcement.enabled, span: 2 },
      {
        name: "messages",
        label: "Messages (one per line)",
        type: "list",
        value: settings.announcement.messages,
        span: 2,
        help: "They rotate every few seconds. Empty lines are ignored.",
      },
      { name: "linkLabel", label: "Link label", type: "text", value: settings.announcement.linkLabel },
      { name: "href", label: "Link URL", type: "text", value: settings.announcement.href },
    ],
    navigation: [
      {
        name: "main",
        label: "Primary menu",
        type: "links",
        value: settings.navigation.main.map((link) => `${link.label}|${link.href}`),
        span: 2,
        help: "One per line: Label|/href",
      },
      {
        name: "secondary",
        label: "Utility menu",
        type: "links",
        value: settings.navigation.secondary.map((link) => `${link.label}|${link.href}`),
        span: 2,
        help: "Shown in the header's secondary row and the mobile drawer.",
      },
    ],
    footer: [
      { name: "blurb", label: "Footer blurb", type: "textarea", value: settings.footer.blurb, span: 2 },
      {
        name: "legal",
        label: "Legal line",
        type: "text",
        value: settings.footer.legal,
        span: 2,
      },
      ...settings.footer.columns.flatMap((column, index): SettingsField[] => [
        { name: `columnTitle${index}`, label: `Column ${index + 1} title`, type: "text", value: column.title },
        {
          name: `columnLinks${index}`,
          label: `Column ${index + 1} links`,
          type: "links",
          value: column.links.map((link) => `${link.label}|${link.href}`),
          help: "Label|/href per line",
        },
      ]),
    ],
    commerce: [
      { name: "guestCheckout", label: "Allow guest checkout", type: "checkbox", value: settings.commerce.guestCheckout, help: "Registers an account automatically so the order history is never lost." },
      { name: "reviewsEnabled", label: "Accept product reviews", type: "checkbox", value: settings.commerce.reviewsEnabled },
      { name: "newsletterEnabled", label: "Show newsletter capture", type: "checkbox", value: settings.commerce.newsletterEnabled },
      { name: "showStockCount", label: "Show remaining stock on product pages", type: "checkbox", value: settings.commerce.showStockCount },
      { name: "lowStockThreshold", label: "Low-stock threshold", type: "number", value: settings.commerce.lowStockThreshold, min: "0" },
      { name: "maxQuantityPerLine", label: "Max quantity per line", type: "number", value: settings.commerce.maxQuantityPerLine, min: "1" },
      {
        name: "freeShippingThreshold",
        label: `Free delivery over (${settings.locale.currencySymbol})`,
        type: "number",
        value: settings.commerce.freeShippingThresholdCents / 100,
        step: "0.01",
        min: "0",
        help: "Set 0 to disable the threshold.",
      },
      ...settings.commerce.deliveryMethods.flatMap((method, index): SettingsField[] => [
        { name: `deliveryLabel${index}`, label: `Delivery ${index + 1} — label`, type: "text", value: method.label },
        {
          name: `deliveryPrice${index}`,
          label: `Delivery ${index + 1} — price (${settings.locale.currencySymbol})`,
          type: "number",
          value: method.priceCents / 100,
          step: "0.01",
          min: "0",
        },
        { name: `deliveryDescription${index}`, label: `Delivery ${index + 1} — description`, type: "text", value: method.description },
        { name: `deliveryMin${index}`, label: `Delivery ${index + 1} — min days`, type: "number", value: method.minDays, min: "0" },
        { name: `deliveryMax${index}`, label: `Delivery ${index + 1} — max days`, type: "number", value: method.maxDays, min: "0" },
        { name: `deliveryEnabled${index}`, label: `Offer ${method.label}`, type: "checkbox", value: method.enabled },
      ]),
    ],
    payments: [
      ...(["paystack", "flutterwave", "bank_transfer", "cod"] as const).map(
        (method): SettingsField => ({
          name: `method_${method}`,
          label: paymentMethodLabel(method),
          type: "checkbox",
          value: settings.commerce.payments.enabled.includes(method),
          help:
            method === "paystack" || method === "flutterwave"
              ? providerConfigured(method)
                ? "Provider keys detected on the server — ready to accept payments."
                : "Provider keys are missing. Checkout will hide this option until PAYSTACK_/FLUTTERWAVE_ env vars are set."
              : method === "bank_transfer"
                ? "Checks out as unpaid; an administrator confirms the transfer against a real reference."
                : "Order is paid on delivery by the courier; an administrator confirms receipt.",
        }),
      ),
      { name: "codNote", label: "Cash-on-delivery note", type: "textarea", value: settings.commerce.payments.codNote, span: 2 },
      { name: "bankName", label: "Bank name", type: "text", value: settings.commerce.payments.bankTransfer.bankName },
      { name: "accountName", label: "Account name", type: "text", value: settings.commerce.payments.bankTransfer.accountName },
      { name: "accountNumber", label: "Account number", type: "text", value: settings.commerce.payments.bankTransfer.accountNumber },
      {
        name: "instructions",
        label: "Transfer instructions",
        type: "textarea",
        value: settings.commerce.payments.bankTransfer.instructions,
        span: 2,
      },
    ],
    tax: [
      { name: "taxEnabled", label: "Charge tax", type: "checkbox", value: settings.commerce.tax.enabled },
      { name: "label", label: "Tax label", type: "text", value: settings.commerce.tax.label, placeholder: "VAT / GST / Sales tax" },
      { name: "ratePercent", label: "Rate (%)", type: "number", value: settings.commerce.tax.ratePercent, step: "0.01", min: "0" },
      { name: "inclusive", label: "Prices include tax", type: "checkbox", value: settings.commerce.tax.inclusive, help: "Inclusive tax is extracted from the product price instead of added at checkout." },
      { name: "applyToShipping", label: "Tax delivery charges too", type: "checkbox", value: settings.commerce.tax.applyToShipping },
    ],
    seo: [
      { name: "titleTemplate", label: "Title template", type: "text", value: settings.seo.titleTemplate, help: "%s is replaced by the page title." },
      { name: "twitterHandle", label: "X / Twitter handle", type: "text", value: settings.seo.twitterHandle },
      { name: "defaultTitle", label: "Default title", type: "text", value: settings.seo.defaultTitle, span: 2 },
      { name: "defaultDescription", label: "Default description", type: "textarea", value: settings.seo.defaultDescription, span: 2 },
      {
        name: "keywords",
        label: "Keywords (comma separated)",
        type: "text",
        value: settings.seo.keywords.join(", "),
        span: 2,
      },
    ],
  };

  const active = TABS.find((entry) => entry.id === tab)!;

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Store settings"
      description="Every piece of business identity lives here — swap the name, palette, currency, delivery and payment options and the same storefront becomes a different business."
      action={
        <Link href="/admin/configurator" className="btn btn-sm btn-outline">
          Open appearance studio
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[210px_1fr]">
        <nav className="border border-line bg-surface p-1.5">
          {TABS.map((entry) => (
            <Link
              key={entry.id}
              href={`/admin/settings?tab=${entry.id}`}
              className={cn(
                "block px-3 py-2 transition-colors",
                tab === entry.id ? "bg-ink text-canvas" : "hover:bg-canvas",
              )}
            >
              <span className="block text-[12px]">{entry.label}</span>
              <span className={cn("block text-[10px]", tab === entry.id ? "text-canvas/60" : "text-muted")}>
                {entry.hint}
              </span>
            </Link>
          ))}
        </nav>

        <div>
          <div className="mb-3">
            <h2 className="font-display text-[22px] leading-tight">{active.label}</h2>
            <p className="text-[11.5px] text-muted">{active.hint}</p>
          </div>
          <SettingsPanel
            action={saveSettingsAction}
            hidden={{ __tab: tab }}
            fields={fieldsByTab[tab]}
            columns={2}
          />
        </div>
      </div>
    </AdminShell>
  );
}
