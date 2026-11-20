/**
 * Image-source validation for anything an administrator pastes in.
 *
 * Only two shapes are ever rendered: a path served by this site
 * (`/images/…`, `/api/media/…`) or an absolute `https://` URL. Everything else
 * — `javascript:`, `data:`, `http://` (mixed content), protocol-relative
 * `//host`, or whitespace/control-character injection — is rejected before it
 * reaches the `<Image>` component or the database.
 */

const MAX_LENGTH = 2048;

export function normaliseImageSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) return null;
  if (/[\s\u0000-\u001f\u007f]/.test(trimmed)) return null;

  // Site-relative path (but not protocol-relative).
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? null : trimmed;
  }

  // Absolute secure URL with a real host.
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (!url.hostname || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeImageList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalised = normaliseImageSource(value);
    if (normalised && !seen.has(normalised)) {
      seen.add(normalised);
      result.push(normalised);
    }
  }
  return result;
}

/** True when the value is empty (allowed for optional fields) or a valid source. */
export function isOptionalImageSource(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  return normaliseImageSource(value) !== null;
}
