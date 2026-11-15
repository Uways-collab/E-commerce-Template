/**
 * Structured-data helpers.
 *
 * `JSON.stringify` alone is not safe inside a `<script>` tag: a value
 * containing `</script>` (or a raw line separator) closes the element early and
 * lets product copy inject markup. Escaping the dangerous characters to their
 * JSON `\uXXXX` forms keeps the payload valid JSON and inert HTML.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
