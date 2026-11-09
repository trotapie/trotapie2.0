export function normalizeImageTypeName(value: unknown): string {
  const text = String(value ?? '').trim();
  return text.replace(/\p{L}/u, letter => letter.toLocaleUpperCase('es'));
}
