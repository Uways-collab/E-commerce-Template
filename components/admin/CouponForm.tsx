"use client";

import { useActionState } from "react";
import { saveCouponAction, type AdminState } from "@/app/actions/admin-marketing";

export interface CouponDefaults {
  id: string;
  code: string;
  description: string | null;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: number;
}

const initial: AdminState | null = null;

export default function CouponForm({ coupon, currencySymbol }: { coupon?: CouponDefaults; currencySymbol: string }) {
  const [state, formAction, pending] = useActionState(saveCouponAction, initial);
  const isPercent = (coupon?.kind ?? "percent") === "percent";

  return (
    <form action={formAction} className="border border-line bg-surface p-4">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">
        {coupon ? `Edit ${coupon.code}` : "New discount code"}
      </h2>
      {coupon && <input type="hidden" name="id" value={coupon.id} />}

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="code" className="label">
            Code
          </label>
          <input
            id="code"
            name="code"
            required
            defaultValue={coupon?.code}
            className="input-boxed uppercase"
            placeholder="WELCOME10"
          />
        </div>
        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <input id="description" name="description" defaultValue={coupon?.description ?? ""} className="input-boxed" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="kind" className="label">
              Type
            </label>
            <select id="kind" name="kind" defaultValue={coupon?.kind ?? "percent"} className="select-boxed">
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
              <option value="free_shipping">Free delivery</option>
            </select>
          </div>
          <div>
            <label htmlFor="value" className="label">
              {isPercent ? "Percent" : `Amount (${currencySymbol})`}
            </label>
            <input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={
                coupon ? (coupon.kind === "fixed" ? coupon.value / 100 : coupon.value) : 10
              }
              className="input-boxed"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="minSubtotal" className="label">
              Min spend ({currencySymbol})
            </label>
            <input
              id="minSubtotal"
              name="minSubtotal"
              type="number"
              step="0.01"
              min="0"
              defaultValue={coupon ? coupon.min_subtotal_cents / 100 : 0}
              className="input-boxed"
            />
          </div>
          <div>
            <label htmlFor="maxUses" className="label">
              Max uses
            </label>
            <input
              id="maxUses"
              name="maxUses"
              type="number"
              min="1"
              defaultValue={coupon?.max_uses ?? ""}
              placeholder="Unlimited"
              className="input-boxed"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="startsAt" className="label">
              Starts
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="date"
              defaultValue={coupon?.starts_at?.slice(0, 10) ?? ""}
              className="input-boxed"
            />
          </div>
          <div>
            <label htmlFor="expiresAt" className="label">
              Expires
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              defaultValue={coupon?.expires_at?.slice(0, 10) ?? ""}
              className="input-boxed"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[12px]">
          <input type="checkbox" name="isActive" defaultChecked={coupon ? coupon.is_active === 1 : true} className="checkbox" />
          Active
        </label>
      </div>

      {state?.error && <p className="mt-2 text-[11.5px] text-danger">{state.error}</p>}
      {state?.message && <p className="mt-2 text-[11.5px] text-success">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-sm btn-primary mt-3 w-full">
        {pending ? "Saving…" : coupon ? "Save code" : "Create code"}
      </button>
    </form>
  );
}
