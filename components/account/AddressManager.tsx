"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
  type AuthState,
} from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export interface AddressRecord {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: number;
}

const initial: AuthState | null = null;

function AddressForm({
  address,
  onDone,
  defaultCountry,
}: {
  address?: AddressRecord;
  onDone: () => void;
  defaultCountry: string;
}) {
  const [state, formAction, pending] = useActionState(saveAddressAction, initial);
  const [submitted, setSubmitted] = useState(false);

  if (state?.message && submitted) {
    onDone();
    setSubmitted(false);
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setSubmitted(true)}
      className="border border-ink/20 bg-surface p-5"
    >
      {address && <input type="hidden" name="addressId" value={address.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="label">
            Label
          </label>
          <input
            id="label"
            name="label"
            defaultValue={address?.label ?? "Home"}
            className="input-boxed"
            placeholder="Home, Office…"
          />
        </div>
        <div>
          <label className="label" htmlFor="fullName">
            Recipient
          </label>
          <input id="fullName" name="fullName" required defaultValue={address?.full_name} className="input-boxed" />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" required defaultValue={address?.phone} className="input-boxed" />
        </div>
        <div>
          <label className="label" htmlFor="country">
            Country
          </label>
          <input
            id="country"
            name="country"
            required
            defaultValue={address?.country ?? defaultCountry}
            className="input-boxed"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="line1">
            Street address
          </label>
          <input id="line1" name="line1" required defaultValue={address?.line1} className="input-boxed" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="line2">
            Apartment, suite, landmark
          </label>
          <input id="line2" name="line2" defaultValue={address?.line2 ?? ""} className="input-boxed" />
        </div>
        <div>
          <label className="label" htmlFor="city">
            City
          </label>
          <input id="city" name="city" required defaultValue={address?.city} className="input-boxed" />
        </div>
        <div>
          <label className="label" htmlFor="state">
            State / region
          </label>
          <input id="state" name="state" defaultValue={address?.state ?? ""} className="input-boxed" />
        </div>
        <div>
          <label className="label" htmlFor="postalCode">
            Postal code
          </label>
          <input id="postalCode" name="postalCode" defaultValue={address?.postal_code ?? ""} className="input-boxed" />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[12px] text-muted">
        <input type="checkbox" name="isDefault" value="true" defaultChecked={address?.is_default === 1} className="checkbox" />
        Use as my default delivery address
      </label>

      {state?.error && <p className="mt-3 text-[12px] text-danger">{state.error}</p>}
      {state?.message && !submitted && <p className="mt-3 text-[12px] text-success">{state.message}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-sm btn-primary">
          {pending ? "Saving…" : address ? "Save changes" : "Add address"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-sm btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AddressManager({
  addresses,
  defaultCountry,
}: {
  addresses: AddressRecord[];
  defaultCountry: string;
}) {
  const [mode, setMode] = useState<{ type: "add" } | { type: "edit"; address: AddressRecord } | null>(null);

  return (
    <div>
      {mode ? (
        <AddressForm
          key={mode.type === "edit" ? mode.address.id : "new"}
          address={mode.type === "edit" ? mode.address : undefined}
          defaultCountry={defaultCountry}
          onDone={() => setMode(null)}
        />
      ) : (
        <button type="button" onClick={() => setMode({ type: "add" })} className="btn btn-sm btn-outline">
          <Plus size={13} strokeWidth={1.7} /> Add an address
        </button>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address.id}
            className={cn(
              "flex flex-col border bg-surface p-5",
              address.is_default ? "border-ink/30" : "border-line",
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.1em]">{address.label}</p>
                {address.is_default === 1 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-accent">
                    <Star size={10} strokeWidth={2} /> Default
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode({ type: "edit", address })}
                  className="text-muted transition-colors hover:text-ink"
                  aria-label={`Edit ${address.label} address`}
                >
                  <Pencil size={13} strokeWidth={1.6} />
                </button>
                <form action={deleteAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <button
                    type="submit"
                    className="text-muted transition-colors hover:text-danger"
                    aria-label={`Delete ${address.label} address`}
                  >
                    <Trash2 size={13} strokeWidth={1.6} />
                  </button>
                </form>
              </div>
            </div>

            <address className="mt-3 flex-1 text-[12.5px] not-italic leading-relaxed text-muted">
              {address.full_name}
              <br />
              {address.line1}
              {address.line2 ? (
                <>
                  <br />
                  {address.line2}
                </>
              ) : null}
              <br />
              {[address.city, address.state, address.postal_code].filter(Boolean).join(", ")}
              <br />
              {address.country} · {address.phone}
            </address>

            {address.is_default !== 1 && (
              <form action={setDefaultAddressAction} className="mt-3">
                <input type="hidden" name="addressId" value={address.id} />
                <button
                  type="submit"
                  className="text-[10.5px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
                >
                  Make default
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {addresses.length === 0 && !mode && (
        <p className="mt-6 border border-dashed border-line px-5 py-8 text-center text-[12.5px] text-muted">
          No addresses saved yet. Add one to speed up checkout.
        </p>
      )}
    </div>
  );
}
