interface TranslationLanguage {
  id: number;
  codigo: string;
  nombre: string;
}

/** Prepares editable values only; never persists the image or its translations. */
export async function translateHomeImage(
  value: Record<string, unknown>,
  languages: TranslationLanguage[],
  request: (payload: {title: string; description: string}) => Promise<unknown>,
  confirmOverwrite: () => boolean,
): Promise<Record<string, unknown> | null> {
  const title = String(value['nombre_destino'] || '').trim();
  if (!title) throw new Error('Escribe el nombre del destino en español antes de traducir.');
  const targets = languages.filter(language => language.codigo !== 'es');
  if (!targets.length) throw new Error('No hay idiomas disponibles para traducir.');
  if (targets.some(language => String(value['translation_'+language.id] || '').trim()) && !confirmOverwrite()) return null;

  const response = await request({title, description: ''});
  const translations = response && typeof response === 'object'
    ? response as Record<string, {title?: unknown} | null> : {};
  const prepared = {...value};
  for (const language of targets) {
    const translated = translations[language.codigo]?.title;
    if (typeof translated !== 'string' || !translated.trim()) {
      throw new Error(`No se recibió la traducción a ${language.nombre}. Tus textos no se modificaron; intenta nuevamente.`);
    }
    prepared['translation_'+language.id] = translated.trim();
  }
  return prepared;
}
