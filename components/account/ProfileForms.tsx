"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type AuthState } from "@/app/actions/auth";

const initial: AuthState | null = null;

export function ProfileDetailsForm({
  name,
  phone,
  email,
  marketingOptIn,
}: {
  name: string;
  phone: string;
  email: string;
  marketingOptIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);

  return (
    <form action={formAction} className="border border-line bg-surface p-5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Your details</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input id="name" name="name" defaultValue={name} required className="input-boxed" />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={phone} className="input-boxed" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="email-display" className="label">
            Email
          </label>
          <input id="email-display" value={email} readOnly disabled className="input-boxed opacity-70" />
          <p className="mt-1 text-[10.5px] text-muted">
            Contact client care to change the email on your account.
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] text-muted">
        <input type="checkbox" name="marketingOptIn" value="true" defaultChecked={marketingOptIn} className="checkbox mt-0.5" />
        Send me the monthly letter — new arrivals, restocks and early access.
      </label>

      {state?.error && <p className="mt-3 text-[12px] text-danger">{state.error}</p>}
      {state?.message && <p className="mt-3 text-[12px] text-success">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-sm btn-primary mt-4">
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={formAction} className="border border-line bg-surface p-5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.16em]">Password</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="currentPassword" className="label">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="input-boxed"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="label">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input-boxed"
          />
        </div>
      </div>

      {state?.error && <p className="mt-3 text-[12px] text-danger">{state.error}</p>}
      {state?.message && <p className="mt-3 text-[12px] text-success">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-sm btn-outline mt-4">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
