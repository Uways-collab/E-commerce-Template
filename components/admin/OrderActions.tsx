"use client";

import { useActionState } from "react";
import {
  recordManualPaymentAction,
  setTrackingAction,
  updateOrderStatusAction,
  type AdminOrderState,
} from "@/app/actions/admin-orders";

const initial: AdminOrderState | null = null;

function Feedback({ state }: { state: AdminOrderState | null }) {
  if (!state) return null;
  return (
    <p className={`mt-2 text-[11px] leading-relaxed ${state.error ? "text-danger" : "text-success"}`}>
      {state.error ?? state.message}
    </p>
  );
}

export function StatusForm({
  orderId,
  status,
  options,
}: {
  orderId: string;
  status: string;
  /** Only the transitions the lifecycle allows, plus the current status. */
  options: { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateOrderStatusAction, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="select-boxed !w-40">
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="note" className="label">
            Note (added to the timeline)
          </label>
          <input id="note" name="note" className="input-boxed" placeholder="Handed to courier" />
        </div>
        <button type="submit" disabled={pending} className="btn btn-sm btn-primary">
          {pending ? "Saving…" : "Update status"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function TrackingForm({
  orderId,
  trackingNumber,
  carrier,
}: {
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
}) {
  const [state, formAction, pending] = useActionState(setTrackingAction, initial);

  return (
    <form action={formAction} className="border-t border-line pt-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="carrier" className="label">
            Carrier
          </label>
          <input id="carrier" name="carrier" defaultValue={carrier ?? ""} className="input-boxed !w-40" placeholder="DHL" />
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="trackingNumber" className="label">
            Tracking number
          </label>
          <input
            id="trackingNumber"
            name="trackingNumber"
            defaultValue={trackingNumber ?? ""}
            className="input-boxed"
            placeholder="JD0146000034"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-sm btn-outline">
          {pending ? "Saving…" : "Save tracking"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ManualPaymentForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(recordManualPaymentAction, initial);

  return (
    <form action={formAction} className="mt-4 border-t border-line pt-3">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Record confirmed payment</p>
      <input name="reference" placeholder="Bank reference / receipt no." className="input-boxed mt-2" />
      <input name="note" placeholder="Seen on statement 14 Feb" className="input-boxed mt-2" />
      <button type="submit" disabled={pending} className="btn btn-sm btn-primary mt-2 w-full">
        {pending ? "Recording…" : "Mark as paid"}
      </button>
      <Feedback state={state} />
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        Only use this after confirming the credit yourself. Provider payments (Paystack / Flutterwave) can never be
        marked paid manually — they are verified with the provider.
      </p>
    </form>
  );
}
