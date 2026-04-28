/** Guess file extension from a data URL MIME prefix (e.g. `data:image/png;base64,...`). */
export function extensionFromDataUrl(dataUrl: string): string {
  const m = /^data:([^;]+);/.exec(dataUrl);
  if (!m) return "bin";
  const t = m[1];
  if (t === "image/png") return "png";
  if (t === "image/jpeg") return "jpg";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  if (t === "application/pdf") return "pdf";
  return "bin";
}

/** Trigger browser download for a data URL or same-origin URL. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
