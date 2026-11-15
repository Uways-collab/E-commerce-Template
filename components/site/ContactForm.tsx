"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { submitContactAction, type ContactState } from "@/app/actions/contact";

const initial: ContactState | null = null;

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactAction, initial);

  if (state?.ok) {
    return (
      <div className="flex items-start gap-3 border border-success/30 bg-success/[0.05] p-5">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/10 text-success">
          <Check size={13} strokeWidth={2} />
        </span>
        <p className="text-[13px] text-success">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="label">
            Name
          </label>
          <input id="contact-name" name="name" required className="input-boxed" />
        </div>
        <div>
          <label htmlFor="contact-email" className="label">
            Email
          </label>
          <input id="contact-email" name="email" type="email" required className="input-boxed" />
        </div>
        <div>
          <label htmlFor="contact-phone" className="label">
            Phone (optional)
          </label>
          <input id="contact-phone" name="phone" className="input-boxed" />
        </div>
        <div>
          <label htmlFor="contact-subject" className="label">
            Subject
          </label>
          <input id="contact-subject" name="subject" className="input-boxed" placeholder="Order, sizing, returns…" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="label">
          Message
        </label>
        <textarea id="contact-message" name="message" rows={5} required minLength={10} className="input-boxed resize-none" />
      </div>

      {state && !state.ok && <p className="text-[12px] text-danger">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
