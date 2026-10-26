export function getDefaultLang(): string {
  try { return localStorage.getItem('trotapie-language') || 'es'; } catch { return 'es'; }
}
