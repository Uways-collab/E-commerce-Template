import "server-only";
import type { StoreSettings } from "@/lib/settings";
import { fontStack, radiusScale } from "@/lib/settings";
import { hexToRgbTriplet } from "@/lib/utils";

/**
 * Compiles the store's configuration into CSS custom properties. The whole
 * visual identity of the storefront flows from these variables, which is what
 * makes re-skinning for a new client a configuration change rather than a
 * rebuild.
 */
export function themeCss(settings: StoreSettings): string {
  const colors = settings.theme.colors;
  const radius = radiusScale(settings.theme.radius);
  const vars = Object.entries(colors)
    .map(([key, value]) => {
      const name = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      return `--c-${name}: ${hexToRgbTriplet(value)};`;
    })
    .join("\n      ");

  return `:root {
      ${vars}
      --r-sm: ${radius.sm};
      --r-md: ${radius.md};
      --r-lg: ${radius.lg};
      --font-display: ${fontStack(settings.theme.fonts.display)};
      --font-body: ${fontStack(settings.theme.fonts.body)};
    }`;
}

export const CARD_RATIO: Record<StoreSettings["theme"]["productCardRatio"], string> = {
  portrait: "4 / 5",
  square: "1 / 1",
  tall: "3 / 4.4",
};
