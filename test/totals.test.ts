import { describe, expect, it } from "vitest";
import { computeAmounts } from "@/lib/totals";

const VAT = { enabled: true, ratePercent: 7.5, inclusive: true, applyToShipping: false };

describe("computeAmounts", () => {
  it("extracts inclusive VAT from the discounted subtotal (does not add it)", () => {
    const amounts = computeAmounts({
      subtotalCents: 15_700_000,
      discountCents: 1_570_000,
      shippingCents: 350_000,
      tax: VAT,
    });

    expect(amounts.taxedBaseCents).toBe(14_130_000);
    expect(amounts.taxCents).toBe(985_814);
    expect(amounts.totalCents).toBe(14_480_000); // subtotal - discount + shipping
  });

  it("adds exclusive tax on top of the total", () => {
    const amounts = computeAmounts({
      subtotalCents: 10_000,
      discountCents: 0,
      shippingCents: 1_000,
      tax: { enabled: true, ratePercent: 20, inclusive: false, applyToShipping: false },
    });

    expect(amounts.taxCents).toBe(2_000);
    expect(amounts.totalCents).toBe(13_000);
  });

  it("includes shipping in the taxed base only when configured", () => {
    const withShipping = computeAmounts({
      subtotalCents: 10_000,
      discountCents: 0,
      shippingCents: 2_000,
      tax: { enabled: true, ratePercent: 10, inclusive: false, applyToShipping: true },
    });
    expect(withShipping.taxedBaseCents).toBe(12_000);
    expect(withShipping.taxCents).toBe(1_200);

    const withoutShipping = computeAmounts({
      subtotalCents: 10_000,
      discountCents: 0,
      shippingCents: 2_000,
      tax: { enabled: true, ratePercent: 10, inclusive: false, applyToShipping: false },
    });
    expect(withoutShipping.taxCents).toBe(1_000);
  });

  it("never taxes a negative base and clamps oversized discounts", () => {
    const amounts = computeAmounts({
      subtotalCents: 5_000,
      discountCents: 9_999,
      shippingCents: 0,
      tax: VAT,
    });
    expect(amounts.taxedBaseCents).toBe(0);
    expect(amounts.taxCents).toBe(0);
    expect(amounts.totalCents).toBe(0);
  });

  it("skips tax entirely when disabled", () => {
    const amounts = computeAmounts({
      subtotalCents: 10_000,
      discountCents: 0,
      shippingCents: 500,
      tax: { enabled: false, ratePercent: 20, inclusive: false, applyToShipping: true },
    });
    expect(amounts.taxCents).toBe(0);
    expect(amounts.totalCents).toBe(10_500);
  });
});
