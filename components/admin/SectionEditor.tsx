"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  deleteSectionAction,
  moveSectionAction,
  saveSectionAction,
  toggleSectionAction,
  type SettingsState,
} from "@/app/actions/admin-settings";
import type { SettingsField } from "@/components/admin/SettingsPanel";
import { cn } from "@/lib/utils";

export interface EditableSection {
  id: string;
  type: string;
  enabled: boolean;
  label: string;
  description: string;
  fields: SettingsField[];
}

export default function SectionEditor({ section }: { section: EditableSection }) {
  const [state, formAction, pending] = useActionState(saveSectionAction, null as SettingsState | null);
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("border bg-surface", open ? "border-ink/30" : "border-line")}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className="text-[10px] tabular-nums text-muted">01</span>
          <span>
            <span className="block text-[12.5px] font-medium">{section.label}</span>
            <span className="block text-[10.5px] text-muted">{section.description}</span>
          </span>
        </button>

        <span className={cn("chip", section.enabled ? "border-success/40 text-success" : "text-muted")}>
          {section.enabled ? "Live" : "Hidden"}
        </span>

        <div className="flex items-center gap-1">
          <form action={moveSectionAction}>
            <input type="hidden" name="sectionId" value={section.id} />
            <input type="hidden" name="direction" value="up" />
            <button className="p-1.5 text-muted hover:text-ink" aria-label="Move section up">
              <ChevronUp size={13} strokeWidth={1.8} />
            </button>
          </form>
          <form action={moveSectionAction}>
            <input type="hidden" name="sectionId" value={section.id} />
            <input type="hidden" name="direction" value="down" />
            <button className="p-1.5 text-muted hover:text-ink" aria-label="Move section down">
              <ChevronDown size={13} strokeWidth={1.8} />
            </button>
          </form>
          <form action={toggleSectionAction}>
            <input type="hidden" name="sectionId" value={section.id} />
            <button className="p-1.5 text-muted hover:text-ink" aria-label={section.enabled ? "Hide section" : "Show section"}>
              {section.enabled ? <Eye size={13} strokeWidth={1.8} /> : <EyeOff size={13} strokeWidth={1.8} />}
            </button>
          </form>
          <form action={deleteSectionAction}>
            <input type="hidden" name="sectionId" value={section.id} />
            <button className="p-1.5 text-muted hover:text-danger" aria-label="Delete section">
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>

      {open && (
        <form action={formAction} className="border-t border-line px-4 py-4">
          <input type="hidden" name="sectionId" value={section.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            {section.fields.map((field) => {
              const id = `${section.id}-${field.name}`;
              const wide = field.span === 2;
              return (
                <div key={field.name} className={cn(wide && "sm:col-span-2")}>
                  <label htmlFor={id} className="label">
                    {field.label}
                  </label>
                  {field.type === "textarea" && (
                    <textarea
                      id={id}
                      name={`f_${field.name}`}
                      rows={2}
                      defaultValue={String(field.value ?? "")}
                      className="input-boxed resize-none"
                    />
                  )}
                  {field.type === "list" && (
                    <textarea
                      id={id}
                      name={`f_${field.name}`}
                      rows={3}
                      defaultValue={Array.isArray(field.value) ? field.value.join("\n") : ""}
                      className="input-boxed resize-none font-mono text-[11.5px]"
                    />
                  )}
                  {field.type === "select" && (
                    <select
                      id={id}
                      name={`f_${field.name}`}
                      defaultValue={String(field.value ?? "")}
                      className="select-boxed"
                    >
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
                      name={`f_${field.name}`}
                      type="number"
                      defaultValue={Number(field.value ?? 0)}
                      className="input-boxed"
                    />
                  )}
                  {(field.type === "text" || field.type === "url" || field.type === "image") && (
                    <input
                      id={id}
                      name={`f_${field.name}`}
                      defaultValue={String(field.value ?? "")}
                      placeholder={field.type === "image" ? "/images/… or /api/media/…" : undefined}
                      className="input-boxed"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12px]">
            <input type="checkbox" name="f_enabled" defaultChecked={section.enabled} className="checkbox" />
            Show this section on the homepage
          </label>

          {state?.error && <p className="mt-2 text-[11.5px] text-danger">{state.error}</p>}

          <div className="mt-3 flex items-center gap-2">
            <button type="submit" disabled={pending} className="btn btn-sm btn-primary">
              {pending ? "Saving…" : "Save section"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-sm btn-ghost">
              Close
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
