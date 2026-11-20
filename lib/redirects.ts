/**
 * Post-login / post-action redirect safety.
 *
 * Only same-origin absolute paths are allowed. Rejects protocol-relative
 * (`//host`), backslash-normalised (`/\host`), absolute URLs and anything that
 * is not a path — all common open-redirect bypasses.
 */
export function safeNext(next: unknown, fallback: string): string {
  const value = String(next ?? "").trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (value === "/") return value;

  try {
    const url = new URL(value, "https://store.invalid");
    if (url.origin !== "https://store.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
