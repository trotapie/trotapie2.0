/** Normalize Drive image references without changing the referenced file. */
export function driveImageThumbnailUrl(value: string): string {
  const text = value.trim();
  try {
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol)) return text;
    if (!['drive.google.com', 'drive.usercontent.google.com', 'lh3.googleusercontent.com'].includes(url.hostname)) return text;
    const id = url.pathname.match(/\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
    if (!id || !/^[\w-]+$/.test(id)) return text;
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`;
  } catch {
    return text;
  }
}
