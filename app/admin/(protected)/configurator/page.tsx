import Link from "next/link";
import { adminContext } from "@/lib/admin";
import { FONT_REGISTRY, SECTION_DEFS, THEME_PRESETS, fontStack, type SectionType } from "@/lib/settings";
import { cn } from "@/lib/utils";
import AdminShell from "@/components/admin/AdminShell";
import SectionEditor from "@/components/admin/SectionEditor";
import SettingsPanel from "@/components/admin/SettingsPanel";
import {
  addSectionAction,
  applyThemePresetAction,
  resetSettingsAction,
  saveFontsAction,
  saveHomepageMetaAction,
} from "@/app/actions/admin-settings";

export const metadata = { title: "Appearance studio" };

const SECTION_TYPES = Object.entries(SECTION_DEFS) as [SectionType, (typeof SECTION_DEFS)[SectionType]][];

export default async function AdminConfiguratorPage() {
  const { user, settings, groups } = await adminContext();

  const sections = settings.homepage.sections.map((section) => {
    const definition = SECTION_DEFS[section.type];
    const record = section as unknown as Record<string, unknown>;
    return {
      id: section.id,
      type: section.type,
      enabled: section.enabled,
      label: definition.label,
      description: definition.description,
      fields: definition.fields.map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        value:
          field.type === "list"
            ? (Array.isArray(record[field.name]) ? (record[field.name] as string[]) : [])
            : ((record[field.name] as string | number | undefined) ?? ""),
        options: field.options,
        span: field.span,
      })),
    };
  });

  return (
    <AdminShell
      user={user}
      groups={groups}
      storeName={settings.brand.name}
      title="Appearance & homepage"
      description="Change the palette, typography and homepage composition without a developer. Presets cover six retail verticals; every token underneath stays editable."
      action={
        <Link href="/" target="_blank" className="btn btn-sm btn-outline">
          Preview storefront
        </Link>
      }
    >
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Palette presets</h2>
          <span className="text-[10.5px] text-muted">Currently {settings.theme.preset}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const active = preset.id === settings.theme.preset;
            return (
              <div
                key={preset.id}
                className={cn("border bg-surface p-3", active ? "border-ink" : "border-line")}
              >
                <div className="flex items-center gap-1.5">
                  {[preset.colors.canvas, preset.colors.ink, preset.colors.accent, preset.colors.line].map((swatch) => (
                    <span
                      key={swatch}
                      className="h-5 w-5 border border-black/10"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                  {active && <span className="ml-auto text-[9.5px] uppercase tracking-[0.1em] text-accent">Active</span>}
                </div>
                <p className="mt-2 text-[12px] leading-tight">{preset.label}</p>
                <p
                  className="mt-1 text-[10.5px] text-muted"
                  style={{ fontFamily: fontStack(preset.fonts.display) }}
                >
                  {FONT_REGISTRY[preset.fonts.display as keyof typeof FONT_REGISTRY]?.label} · {preset.radius}
                </p>
                <form action={applyThemePresetAction} className="mt-2.5">
                  <input type="hidden" name="presetId" value={preset.id} />
                  <button
                    type="submit"
                    className={cn("btn btn-sm w-full", active ? "btn-outline" : "btn-primary")}
                    disabled={active}
                  >
                    {active ? "In use" : "Apply preset"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
          Applying a preset replaces the colour tokens, display/body typefaces and corner radius. Edit individual tokens
          in <Link href="/admin/settings?tab=theme" className="underline underline-offset-4">Settings → Theme</Link>.
        </p>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Typography & shape</h2>
          <form action={saveFontsAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fontDisplay" className="label">
                Display typeface
              </label>
              <select id="fontDisplay" name="fontDisplay" defaultValue={settings.theme.fonts.display} className="select-boxed">
                {Object.entries(FONT_REGISTRY).map(([value, font]) => (
                  <option key={value} value={value}>
                    {font.label} ({font.kind})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fontBody" className="label">
                Body typeface
              </label>
              <select id="fontBody" name="fontBody" defaultValue={settings.theme.fonts.body} className="select-boxed">
                {Object.entries(FONT_REGISTRY).map(([value, font]) => (
                  <option key={value} value={value}>
                    {font.label} ({font.kind})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="border border-line bg-canvas px-3 py-4">
                <p style={{ fontFamily: fontStack(settings.theme.fonts.display) }} className="text-[26px] leading-none">
                  {settings.brand.name}
                </p>
                <p style={{ fontFamily: fontStack(settings.theme.fonts.body) }} className="mt-2 text-[11.5px] text-muted">
                  {settings.brand.tagline} — body copy rendered in the configured typeface.
                </p>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <p className="text-[10.5px] text-muted">Fonts are self-hosted, so there is no runtime request to a font CDN.</p>
              <button type="submit" className="btn btn-sm btn-primary">
                Save type
              </button>
            </div>
          </form>
        </section>

        <section className="border border-line bg-surface p-4">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">Featured categories</h2>
          <p className="mt-1 text-[10.5px] text-muted">
            The category strip on the homepage reads these slugs first, then fills from the catalogue.
          </p>
          <div className="mt-3">
            <SettingsPanel
              action={saveHomepageMetaAction}
              hidden={{}}
              columns={1}
              submitLabel="Save categories"
              fields={[
                {
                  name: "featuredCategorySlugs",
                  label: "Category slugs (comma separated)",
                  type: "text",
                  value: settings.homepage.featuredCategorySlugs.join(", "),
                  help: "Example: women, men, accessories, home-living",
                },
              ]}
            />
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em]">
            Homepage composition — {sections.length} sections
          </h2>
          <form action={addSectionAction} className="flex items-center gap-2">
            <select name="type" className="select-boxed !w-52 !py-1.5 !text-[11.5px]" aria-label="Section type">
              {SECTION_TYPES.map(([type, definition]) => (
                <option key={type} value={type}>
                  {definition.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-sm btn-outline">
              Add section
            </button>
          </form>
        </div>

        <div className="mt-3 space-y-2">
          {sections.map((section, index) => (
            <div key={section.id}>
              <div className="mb-1 text-[9.5px] uppercase tracking-[0.14em] text-muted">
                Position {String(index + 1).padStart(2, "0")}
              </div>
              <SectionEditor section={section} />
            </div>
          ))}
          {sections.length === 0 && (
            <p className="border border-line bg-surface px-4 py-10 text-center text-[12.5px] text-muted">
              The homepage is empty. Add a section above to rebuild it.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 border border-danger/30 bg-danger/[0.03] p-4">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-danger">Reset</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Resetting restores the template defaults for that area only. Products, orders and customers are never touched.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={resetSettingsAction}>
            <input type="hidden" name="scope" value="theme" />
            <button className="btn btn-sm btn-outline">Reset theme</button>
          </form>
          <form action={resetSettingsAction}>
            <input type="hidden" name="scope" value="homepage" />
            <button className="btn btn-sm btn-outline">Reset homepage</button>
          </form>
          <form action={resetSettingsAction}>
            <input type="hidden" name="scope" value="all" />
            <button className="btn btn-sm btn-ghost text-danger">Reset all configuration</button>
          </form>
        </div>
      </section>
    </AdminShell>
  );
}
