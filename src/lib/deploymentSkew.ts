/**
 * Detect a Next.js deployment-skew error: the browser tab is running a different
 * build than the server, so a hashed Server Action ID no longer resolves
 * ("Failed to find Server Action …"). Nothing is broken — a full page reload
 * pulls the current bundle whose action IDs match the running server.
 *
 * Accepts `unknown` so it can be used directly in `catch` blocks and error
 * boundaries alike.
 */
export function isDeploymentSkew(error: unknown): boolean {
  const e = error as { message?: string; digest?: string } | null | undefined;
  const haystack = `${e?.message ?? ""} ${e?.digest ?? ""}`;
  return (
    haystack.includes("Failed to find Server Action") ||
    haystack.includes("older or newer deployment")
  );
}
