"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";

const initial: AuthState | null = null;

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="flex items-start gap-2 text-[12px] text-danger">
          <AlertCircle size={14} strokeWidth={1.7} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight size={14} strokeWidth={1.6} />}
      </button>

      <p className="text-center text-[12px] text-muted">
        New here?{" "}
        <Link href="/account/register" className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="name" className="label">
          Full name
        </label>
        <input id="name" name="name" required autoComplete="name" className="input" placeholder="Ada Balogun" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Phone (optional)
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className="input" placeholder="+234 801 234 5678" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="At least 8 characters"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[12px] text-muted">
        <input type="checkbox" name="marketingOptIn" value="true" className="checkbox mt-0.5" />
        Send me seasonal edits and restock alerts (10% off your first order).
      </label>

      {state?.error && (
        <p className="flex items-start gap-2 text-[12px] text-danger">
          <AlertCircle size={14} strokeWidth={1.7} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-[12px] text-muted">
        Already have an account?{" "}
        <Link href="/account/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
      <p className="text-center text-[10.5px] leading-relaxed text-muted/80">
        By creating an account you agree to our{" "}
        <Link href="/pages/terms" className="underline underline-offset-2">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/pages/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
