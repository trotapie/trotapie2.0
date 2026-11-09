export function imageTypeTranslations(preview: Record<string, {descripcion?: string}> | null | undefined) {
  const names: Record<string, string> = {es:'Español',en:'Inglés',fr:'Francés',pt:'Portugués',de:'Alemán',it:'Italiano'};
  return Object.entries(preview ?? {})
    .filter(([code]) => code.toLowerCase() !== 'es')
    .map(([code, translation]) => ({
      code,
      label: names[code.toLowerCase()] || code.toUpperCase(),
      text: String(translation?.descripcion ?? '').trim()
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
