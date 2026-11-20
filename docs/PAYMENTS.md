# Payments

The template ships with four payment methods and a deliberate rule: **an order becomes paid only after verified,
server-side confirmation.** There is no "simulate payment" switch anywhere in the codebase.

## Methods

| Method | Confirmation source | Behaviour at checkout |
| --- | --- | --- |
| Paystack | `/api/payments/paystack/webhook` **or** `/checkout/verify` server call | Redirect to the hosted payment page; reference stored on the order |
| Flutterwave | `/api/payments/flutterwave/webhook` **or** `/checkout/verify` server call | Same |
| Bank transfer | Administrator, in `/admin/orders/[id]` | Order stays unpaid, confirmation page shows the configured bank details and instructions |
| Cash on delivery | Administrator, in `/admin/orders/[id]` | Order stays unpaid until the courier's cash is confirmed |

`availablePaymentMethods()` in `lib/payments.ts` filters this list against the settings document **and** the presence of
provider keys, so a store with no keys never shows a card option that cannot complete.

## Enabling a provider

1. Add the keys to the server environment (never `NEXT_PUBLIC_*` for secret keys):

   ```bash
   PAYSTACK_SECRET_KEY=sk_live_xxx
   PAYSTACK_PUBLIC_KEY=pk_live_xxx
   # or
   FLUTTERWAVE_SECRET_KEY=FLWSECK-xxx
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxx
   FLUTTERWAVE_WEBHOOK_HASH=your-dashboard-secret-hash
   ```

2. `/admin/settings?tab=payments` → tick the provider and save.
3. Configure the provider dashboard:
   * Paystack → Callback URL `https://your-domain/checkout/verify`, Webhook `https://your-domain/api/payments/paystack/webhook`
   * Flutterwave → Redirect URL `https://your-domain/checkout/verify`, Webhook `https://your-domain/api/payments/flutterwave/webhook`
4. Place a real low-value test payment and confirm the order flips to **Paid** with a reference and timestamp.

## Verification rules

`lib/payments.ts` and the webhook routes enforce:

* **Signature/origin check** — Paystack webhooks must carry a valid `x-paystack-signature` HMAC of the raw body; the
  Flutterwave route compares the `verif-hash` header in constant time, and the verify route re-queries the provider API.
* **Amount and currency match** — the verified amount must equal `order.totalCents` and the currency must equal the
  store currency; mismatches mark the payment failed rather than paid.
* **Idempotency** — `markOrderPaid` is a no-op for an already-paid order, so duplicate webhooks are harmless.
* **Reference binding** — the provider reference is stored on the order at initialisation, and only that order can be
  marked paid by that reference.
* **Manual confirmation is restricted** — `recordManualPaymentAction` refuses Paystack/Flutterwave orders outright and
  requires a real reference for bank transfer/COD, writing an audit note into the order timeline.

## Failed and abandoned payments

* The verify route calls `markPaymentFailed` and sends the customer to `/checkout/retry?order=…`, which re-initialises
  the same order (stock is already reserved) rather than creating a duplicate.
* If a customer abandons the provider page, the order remains `pending`/`unpaid` and shows in the admin as awaiting
  payment — visible, cancellable, and never counted as revenue (`dashboardStats` counts only paid orders).

## Security notes

* Secrets are only imported in `server-only` modules; nothing sensitive is bundled to the client.
* Webhook handlers read the raw request body before parsing so signature checks cannot be fooled by re-serialisation.
* Amounts are integers in minor units end-to-end — no floating-point rounding at the boundary.
* Refunds are recorded by changing the order status to `refunded` (which returns stock); the money movement itself is
  performed in the provider dashboard and referenced in the order timeline.
