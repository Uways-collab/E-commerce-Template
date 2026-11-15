import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart";
import { getSettings, paymentMethodLabel } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { availablePaymentMethods } from "@/lib/payments";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order securely.",
  robots: { index: false, follow: false },
};

const PAYMENT_DESCRIPTIONS: Record<string, string> = {
  paystack: "Card, bank account or USSD. Verified instantly by Paystack.",
  flutterwave: "Card, bank transfer or mobile money. Verified instantly by Flutterwave.",
  bank_transfer: "Transfer to our account and upload proof. Orders ship once payment clears.",
  cod: "Pay the courier in cash when your order arrives.",
};

export default async function CheckoutPage() {
  const [cart, settings, user] = await Promise.all([getCart(), getSettings(), getSessionUser()]);

  if (!cart.lines.length) redirect("/cart");

  const address = user
    ? db().get<{
        full_name: string;
        phone: string;
        line1: string;
        line2: string | null;
        city: string;
        state: string | null;
        postal_code: string | null;
        country: string;
      }>(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC LIMIT 1",
        [user.id],
      )
    : undefined;

  const methods = availablePaymentMethods(settings);
  const money = (value: number) =>
    new Intl.NumberFormat(settings.locale.locale, {
      style: "currency",
      currency: settings.locale.currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value / 100);

  const paymentOptions = methods.map((method) => ({
    id: method,
    label: paymentMethodLabel(method),
    description: PAYMENT_DESCRIPTIONS[method] ?? "",
  }));

  return (
    <div className="page-shell pb-20 pt-8">
      <header className="border-b border-line pb-6">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.12em] text-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/cart" className="hover:text-ink">
                Basket
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink">Checkout</li>
          </ol>
        </nav>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Secure checkout</p>
            <h1 className="display-section mt-2">Almost yours</h1>
          </div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            {cart.itemCount} {cart.itemCount === 1 ? "piece" : "pieces"} ·{" "}
            <span className="text-ink">{money(cart.totals.totalCents)}</span>
          </p>
        </div>
      </header>

      <div className="mt-8">
        <CheckoutForm
          lines={cart.lines.map((line) => ({
            name: line.product.name,
            image: line.product.images[0] ?? null,
            size: line.size,
            colorName: line.colorName,
            quantity: line.quantity,
            lineTotalCents: line.lineTotalCents,
          }))}
          subtotalCents={cart.totals.subtotalCents}
          discountCents={cart.totals.discountCents}
          couponCode={cart.totals.appliedCoupon?.code ?? null}
          couponFreeShipping={cart.totals.appliedCoupon?.kind === "free_shipping"}
          deliveryMethods={cart.deliveryOptions}
          defaultDelivery={cart.deliveryMethodId}
          paymentOptions={paymentOptions}
          tax={settings.commerce.tax}
          currency={settings.locale.currency}
          locale={settings.locale.locale}
          thresholdCents={settings.commerce.freeShippingThresholdCents}
          freeShippingRemainingCents={cart.totals.freeShippingRemainingCents}
          defaults={{
            email: user?.email ?? "",
            phone: address?.phone ?? user?.phone ?? "",
            fullName: address?.full_name ?? user?.name ?? "",
            line1: address?.line1 ?? "",
            line2: address?.line2 ?? "",
            city: address?.city ?? "",
            state: address?.state ?? "",
            postalCode: address?.postal_code ?? "",
            country: address?.country ?? "Nigeria",
          }}
          signedIn={Boolean(user)}
          bankDetails={settings.commerce.payments.bankTransfer}
          codNote={settings.commerce.payments.codNote}
        />
      </div>
    </div>
  );
}
