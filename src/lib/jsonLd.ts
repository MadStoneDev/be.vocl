/**
 * Serialize a JSON-LD object for safe injection into a <script type="application/ld+json">
 * via dangerouslySetInnerHTML.
 *
 * JSON.stringify does NOT escape `<`, `>`, or `&`, so a value containing
 * `</script>` (e.g. user post text) would break out of the script element and
 * execute as HTML - a stored XSS. Escaping these to their \uXXXX forms keeps the
 * payload valid JSON while making it inert inside an HTML script context.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
