"use client";

import { useActionState } from "react";
import { cn } from "@/lib/utils";

export type SettingsFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "color"
  | "list"
  | "links"
  | "image"
  | "url";

export interface SettingsField {
  name: string;
  label: string;
  type: SettingsFieldType;
  value: string | number | boolean | string[];
  options?: { label: string; value: string }[];
  placeholder?: string;
  help?: string;
  span?: 1 | 2;
  step?: string;
  min?: string;
}

export interface SettingsResult {
  ok?: boolean;
  message?: string;
  error?: string;
}

/**
 * Generic configuration-form renderer. Every field the store exposes is
 * described declaratively on the server, so adding a new setting is a data
 * change — not a new form component.
 */
export default function SettingsPanel({
  action,
  hidden,
  fields,
  submitLabel = "Save changes",
  columns = 2,
  children,
}: {
  action: (prev: SettingsResult | null, formData: FormData) => Promise<SettingsResult>;
  hidden: Record<string, string>;
  fields: SettingsField[];
  submitLabel?: string;
  columns?: 1 | 2;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          {state?.ok ? (
            <span className="text-success">{state.message}</span>
          ) : state?.error ? (
            <span className="text-danger">{state.error}</span>
          ) : (
            "Changes apply to the live storefront immediately"
          )}
        </p>
      </div>

      <div className={cn("grid gap-4 p-4", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
        {Object.entries(hidden).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

        {fields.map((field) => {
          const id = `field-${field.name}`;
          const wide = field.span === 2;

          if (field.type === "checkbox") {
            return (
              <label
                key={field.name}
                className={cn("flex cursor-pointer items-start gap-2.5 text-[12px]", wide && "sm:col-span-2")}
              >
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={Boolean(field.value)}
                  className="checkbox mt-0.5"
                />
                <span>
                  <span className="block text-ink">{field.label}</span>
                  {field.help && <span className="block text-[10.5px] text-muted">{field.help}</span>}
                </span>
              </label>
            );
          }

          if (field.type === "image") {
            return (
              <div key={field.name} className={cn(wide && "sm:col-span-2")}>
                <label htmlFor={id} className="label">
                  {field.label}
                </label>
                <input
                  id={id}
                  name={field.name}
                  defaultValue={String(field.value ?? "")}
                  className="input-boxed font-mono text-[11.5px]"
                  placeholder="/images/… or /api/media/…"
                />
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  Paste an image path. Uploaded media lives at /api/media/… and is served from the data volume.
                </p>
              </div>
            );
          }

          return (
            <div key={field.name} className={cn(wide && "sm:col-span-2")}>
              <label htmlFor={id} className="label">
                {field.label}
              </label>

              {field.type === "textarea" && (
                <textarea
                  id={id}
                  name={field.name}
                  rows={3}
                  defaultValue={String(field.value ?? "")}
                  placeholder={field.placeholder}
                  className="input-boxed resize-none"
                />
              )}

              {(field.type === "list" || field.type === "links") && (
                <textarea
                  id={id}
                  name={field.name}
                  rows={4}
                  defaultValue={Array.isArray(field.value) ? field.value.join("\n") : String(field.value ?? "")}
                  placeholder={field.placeholder}
                  className="input-boxed resize-none font-mono text-[11.5px]"
                />
              )}

              {field.type === "select" && (
                <select id={id} name={field.name} defaultValue={String(field.value ?? "")} className="select-boxed">
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "number" && (
                <input
                  id={id}
                  name={field.name}
                  type="number"
                  step={field.step ?? "1"}
                  min={field.min}
                  defaultValue={String(field.value ?? "")}
                  className="input-boxed"
                />
              )}

              {field.type === "color" && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(field.value ?? "#000000")}
                    onChange={(event) => {
                      const input = document.getElementById(id) as HTMLInputElement | null;
                      if (input) input.value = event.target.value;
                    }}
                    className="h-9 w-12 border border-line bg-surface p-0.5"
                    aria-label={`${field.label} swatch`}
                  />
                  <input
                    id={id}
                    name={field.name}
                    defaultValue={String(field.value ?? "")}
                    className="input-boxed font-mono text-[11.5px]"
                  />
                </div>
              )}

              {(field.type === "text" || field.type === "url") && (
                <input
                  id={id}
                  name={field.name}
                  type={field.type === "url" ? "text" : "text"}
                  defaultValue={String(field.value ?? "")}
                  placeholder={field.placeholder}
                  className="input-boxed"
                />
              )}

              {field.help && (
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{field.help}</p>
              )}
            </div>
          );
        })}

        {children}
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <p className="text-[10.5px] text-muted">
          {state?.ok ? "Saved." : "Configuration is stored in the database — no redeploy needed."}
        </p>
        <button type="submit" disabled={pending} className="btn btn-sm btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
