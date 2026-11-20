import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, cart] = await Promise.all([getSettings(), getCart()]);
  const { currency, locale } = settings.locale;
  const money = (value: number) => formatMoney(value, currency, locale);

  const threshold = settings.commerce.freeShippingThresholdCents;
  const progress =
    threshold > 0 ? Math.min(1, Math.max(0, (cart.subtotalCents - cart.totals.discountCents) / threshold)) : 1;

  return NextResponse.json(
    {
      itemCount: cart.itemCount,
      lines: cart.lines.map((line) => ({
        variantId: line.variantId,
        name: line.product.name,
        slug: line.product.slug,
        image: line.product.images[0] ?? null,
        size: line.size,
        colorName: line.colorName,
        colorHex: line.colorHex,
        quantity: line.quantity,
        stock: line.stock,
        unitPriceLabel: money(line.unitPriceCents),
        lineTotalLabel: money(line.lineTotalCents),
      })),
      totals: {
        subtotalLabel: money(cart.totals.subtotalCents),
        discountLabel: cart.totals.discountCents > 0 ? `−${money(cart.totals.discountCents)}` : null,
        shippingLabel: cart.totals.shippingCents === 0 ? "Complimentary" : money(cart.totals.shippingCents),
        totalLabel: money(cart.totals.totalCents),
        freeShippingRemainingLabel:
          cart.totals.freeShippingRemainingCents > 0
            ? `${money(cart.totals.freeShippingRemainingCents)} away from complimentary delivery`
            : null,
        freeShippingProgress: progress,
        couponCode: cart.totals.appliedCoupon?.code ?? null,
        couponError: cart.couponError,
        deliveryLabel: cart.totals.deliveryLabel,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
