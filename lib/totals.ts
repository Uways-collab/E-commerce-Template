/**
 * Pure order maths, shared by the server (authoritative) and the checkout
 * summary (instant preview). No imports, no side effects — safe on both sides
 * of the server/client boundary.
 */

export interface TaxConfig {
  enabled: boolean;
  ratePercent: number;
  inclusive: boolean;
  applyToShipping: boolean;
}

export interface AmountInput {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  tax: TaxConfig;
}

export interface Amounts {
  taxedBaseCents: number;
  taxCents: number;
  totalCents: number;
}

export function computeAmounts({ subtotalCents, discountCents, shippingCents, tax }: AmountInput): Amounts {
  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const taxedBaseCents = tax.applyToShipping ? afterDiscount + shippingCents : afterDiscount;

  let taxCents = 0;
  if (tax.enabled && tax.ratePercent > 0) {
    const rate = tax.ratePercent / 100;
    taxCents = Math.round(tax.inclusive ? taxedBaseCents * (rate / (1 + rate)) : taxedBaseCents * rate);
  }

  const totalCents = afterDiscount + shippingCents + (tax.enabled && !tax.inclusive ? taxCents : 0);

  return { taxedBaseCents, taxCents, totalCents };
}
