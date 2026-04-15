function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractSupabaseStoragePath(fileUrl: string) {
  const trimmed = fileUrl.trim();

  if (!trimmed) return "";

  if (!/^https?:\/\//i.test(trimmed)) {
    return safeDecode(trimmed.replace(/^\/+/, ""));
  }

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/contracts\/(.+)$/i);

    if (!match?.[1]) return "";

    return safeDecode(match[1]);
  } catch {
    return "";
  }
}

export function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}
