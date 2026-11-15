import "server-only";
import type { DeliveryMethod, StoreSettings } from "@/lib/settings";
import { computeAmounts } from "@/lib/totals";

export interface CouponRecord {
  id: string;
  code: string;
  description: string | null;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: number;
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  discountLabel: string | null;
  freeShippingRemainingCents: number;
  appliedCoupon: { code: string; kind: CouponRecord["kind"]; value: number } | null;
  deliveryMethodId: string;
  deliveryLabel: string;
}

export type CouponCheck =
  | { ok: true; coupon: CouponRecord }
  | { ok: false; reason: string };

/** Validate a coupon row against the current subtotal and time window. */
export function evaluateCoupon(coupon: CouponRecord | null | undefined, subtotalCents: number, now = new Date()): CouponCheck {
  if (!coupon) return { ok: false, reason: "That code isn’t recognised." };
  if (!coupon.is_active) return { ok: false, reason: "That code is no longer active." };

  if (coupon.starts_at) {
    const starts = new Date(coupon.starts_at.replace(" ", "T") + "Z");
    if (!Number.isNaN(starts.getTime()) && starts > now) {
      return { ok: false, reason: "That code isn’t active yet." };
    }
  }
  if (coupon.expires_at) {
    const expires = new Date(coupon.expires_at.replace(" ", "T") + "Z");
    if (!Number.isNaN(expires.getTime()) && expires < now) {
      return { ok: false, reason: "That code has expired." };
    }
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { ok: false, reason: "That code has reached its redemption limit." };
  }
  if (subtotalCents < coupon.min_subtotal_cents) {
    return {
      ok: false,
      reason: "Your basket doesn’t meet the minimum spend for this code yet.",
    };
  }
  return { ok: true, coupon };
}

export function activeDeliveryMethods(settings: StoreSettings): DeliveryMethod[] {
  return settings.commerce.deliveryMethods.filter((method) => method.enabled);
}

export function resolveDeliveryMethod(settings: StoreSettings, id?: string | null): DeliveryMethod | null {
  const methods = activeDeliveryMethods(settings);
  if (!methods.length) return null;
  return methods.find((method) => method.id === id) ?? methods[0];
}

export interface PricingInput {
  settings: StoreSettings;
  subtotalCents: number;
  coupon?: CouponRecord | null;
  deliveryMethod?: DeliveryMethod | null;
}

/**
 * Single source of truth for basket and order maths. Used by the cart page,
 * checkout, the order-creation transaction and the payment verification step.
 */
export function computeTotals({
  settings,
  subtotalCents,
  coupon,
  deliveryMethod,
}: PricingInput): Totals {
  // Never trust a caller-supplied delivery object: re-resolve it against the
  // enabled methods in settings so the price always comes from configuration.
  const method =
    (deliveryMethod && activeDeliveryMethods(settings).find((entry) => entry.id === deliveryMethod.id)) ??
    resolveDeliveryMethod(settings);
  const threshold = settings.commerce.freeShippingThresholdCents;
  const couponCheck = coupon ? evaluateCoupon(coupon, subtotalCents) : null;
  const validCoupon = couponCheck?.ok ? couponCheck.coupon : null;

  let discountCents = 0;
  let discountLabel: string | null = null;
  if (validCoupon) {
    if (validCoupon.kind === "percent") {
      discountCents = Math.min(subtotalCents, Math.round((subtotalCents * validCoupon.value) / 100));
      discountLabel = `${validCoupon.value}% off`;
    } else if (validCoupon.kind === "fixed") {
      discountCents = Math.min(subtotalCents, validCoupon.value);
      discountLabel = "Fixed discount";
    } else {
      discountLabel = "Free delivery";
    }
  }

  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const qualifiesFreeShipping = threshold > 0 && afterDiscount >= threshold;
  const couponFreeShipping = validCoupon?.kind === "free_shipping";

  let shippingCents = method ? method.priceCents : 0;
  if (qualifiesFreeShipping || couponFreeShipping) shippingCents = 0;

  const { taxCents, totalCents } = computeAmounts({
    subtotalCents,
    discountCents,
    shippingCents,
    tax: settings.commerce.tax,
  });

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    discountLabel,
    freeShippingRemainingCents:
      threshold > 0 && !qualifiesFreeShipping && !couponFreeShipping
        ? Math.max(0, threshold - afterDiscount)
        : 0,
    appliedCoupon: validCoupon
      ? { code: validCoupon.code, kind: validCoupon.kind, value: validCoupon.value }
      : null,
    deliveryMethodId: method?.id ?? "none",
    deliveryLabel: method?.label ?? "Delivery",
  };
}

export function deliveryEstimate(method: DeliveryMethod | null, locale = "en-GB") {
  if (!method) return "";
  const fmt = (days: number) => {
    const date = new Date(Date.now() + days * 86_400_000);
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(date);
  };
  if (method.minDays === method.maxDays) return fmt(method.minDays);
  return `${fmt(method.minDays)} – ${fmt(method.maxDays)}`;
}
