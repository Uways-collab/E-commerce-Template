import { describe, expect, it } from "vitest";
import { computeTotals, evaluateCoupon, type CouponRecord } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/settings";

function settings(overrides: Partial<StoreSettings["commerce"]> = {}): StoreSettings {
  return {
    version: 1,
    brand: { name: "Test", legalName: "Test Ltd", tagline: "", description: "", logoUrl: "", faviconUrl: "", ogImage: "" },
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
    locale: { currency: "NGN", currencySymbol: "₦", locale: "en-NG", country: "NG", timezone: "Africa/Lagos", weightUnit: "kg" },
    contact: { email: "", phone: "", whatsapp: "", address: "", city: "", hours: "", mapUrl: "" },
    social: { instagram: "", x: "", facebook: "", tiktok: "", pinterest: "", youtube: "" },
    announcement: { enabled: false, messages: [], linkLabel: "", href: "" },
    navigation: { main: [], secondary: [] },
    footer: { blurb: "", columns: [], legal: "" },
    commerce: {
      guestCheckout: true,
      reviewsEnabled: true,
      newsletterEnabled: true,
      showStockCount: true,
      lowStockThreshold: 5,
      freeShippingThresholdCents: 15_000_000,
      deliveryMethods: [
        { id: "standard", label: "Standard", description: "", priceCents: 350_000, minDays: 3, maxDays: 5, enabled: true },
        { id: "pickup", label: "Pick-up", description: "", priceCents: 0, minDays: 1, maxDays: 2, enabled: true },
      ],
      tax: { enabled: true, ratePercent: 7.5, inclusive: true, label: "VAT", applyToShipping: false },
      payments: {
        enabled: ["bank_transfer", "cod"],
        codNote: "",
        bankTransfer: { bankName: "", accountName: "", accountNumber: "", instructions: "" },
      },
      maxQuantityPerLine: 10,
      ...overrides,
    },
    seo: { titleTemplate: "%s", defaultTitle: "", defaultDescription: "", keywords: [], twitterHandle: "" },
    homepage: { sections: [], featuredCategorySlugs: [] },
  };
}

function coupon(overrides: Partial<CouponRecord> = {}): CouponRecord {
  return {
    id: "cpn_1",
    code: "WELCOME10",
    description: "10% off",
    kind: "percent",
    value: 10,
    min_subtotal_cents: 0,
    max_uses: null,
    used_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: 1,
    ...overrides,
  };
}

const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString().replace("T", " ").slice(0, 19);

describe("evaluateCoupon", () => {
  it("accepts an active code inside its window", () => {
    expect(evaluateCoupon(coupon(), 1_000).ok).toBe(true);
  });

  it("rejects unknown, inactive, expired and future codes", () => {
    expect(evaluateCoupon(null, 1_000).ok).toBe(false);
    expect(evaluateCoupon(coupon({ is_active: 0 }), 1_000).ok).toBe(false);
    expect(evaluateCoupon(coupon({ expires_at: iso(-DAY) }), 1_000).ok).toBe(false);
    expect(evaluateCoupon(coupon({ starts_at: iso(DAY) }), 1_000).ok).toBe(false);
  });

  it("enforces minimum spend and usage caps", () => {
    const belowMinimum = evaluateCoupon(coupon({ min_subtotal_cents: 5_000 }), 4_999);
    expect(belowMinimum.ok).toBe(false);

    const exhausted = evaluateCoupon(coupon({ max_uses: 2, used_count: 2 }), 10_000);
    expect(exhausted.ok).toBe(false);

    expect(evaluateCoupon(coupon({ max_uses: 2, used_count: 1 }), 10_000).ok).toBe(true);
  });
});

describe("computeTotals", () => {
  it("applies a percentage discount and inclusive tax", () => {
    const totals = computeTotals({ settings: settings(), subtotalCents: 15_700_000, coupon: coupon() });
    expect(totals.discountCents).toBe(1_570_000);
    expect(totals.shippingCents).toBe(350_000);
    expect(totals.taxCents).toBe(985_814);
    expect(totals.totalCents).toBe(14_480_000);
    expect(totals.appliedCoupon?.code).toBe("WELCOME10");
  });

  it("caps a fixed discount at the subtotal", () => {
    const totals = computeTotals({
      settings: settings(),
      subtotalCents: 2_000,
      coupon: coupon({ kind: "fixed", value: 5_000 }),
    });
    expect(totals.discountCents).toBe(2_000);
    expect(totals.totalCents).toBe(350_000); // only delivery remains
  });

  it("zeroes delivery for a free-shipping coupon without a cash discount", () => {
    const totals = computeTotals({
      settings: settings(),
      subtotalCents: 5_000,
      coupon: coupon({ kind: "free_shipping", value: 0 }),
    });
    expect(totals.discountCents).toBe(0);
    expect(totals.shippingCents).toBe(0);
    expect(totals.discountLabel).toMatch(/delivery/i);
  });

  it("grants free delivery above the configured threshold", () => {
    const totals = computeTotals({ settings: settings(), subtotalCents: 16_000_000, coupon: null });
    expect(totals.shippingCents).toBe(0);
    expect(totals.freeShippingRemainingCents).toBe(0);
  });

  it("uses the requested delivery method and falls back when it is disabled", () => {
    const base = settings();
    const pickup = computeTotals({
      settings: base,
      subtotalCents: 1_000,
      coupon: null,
      deliveryMethod: base.commerce.deliveryMethods[1],
    });
    expect(pickup.shippingCents).toBe(0);

    // A caller cannot smuggle in a cheaper (or disabled) delivery option:
    // pricing is always re-resolved from the store settings.
    const tampered = { ...base.commerce.deliveryMethods[0], enabled: false, priceCents: 0 };
    const fallback = computeTotals({ settings: base, subtotalCents: 1_000, coupon: null, deliveryMethod: tampered });
    expect(fallback.deliveryMethodId).toBe("standard");
    expect(fallback.shippingCents).toBe(350_000);
  });

  it("ignores an invalid coupon but keeps the order intact", () => {
    const totals = computeTotals({
      settings: settings(),
      subtotalCents: 1_000,
      coupon: coupon({ is_active: 0 }),
    });
    expect(totals.discountCents).toBe(0);
    expect(totals.appliedCoupon).toBeNull();
    expect(totals.totalCents).toBe(1_000 + 350_000);
  });
});
