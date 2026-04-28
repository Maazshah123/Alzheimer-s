export function errorMessageFromUnknown(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  if (e && typeof e === "object" && "error_description" in e) {
    const m = (e as { error_description?: unknown }).error_description;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  try {
    const s = JSON.stringify(e);
    if (s !== "{}" && s !== "null") return s.slice(0, 500);
  } catch {
    /* ignore */
  }
  return "Unknown error";
}
