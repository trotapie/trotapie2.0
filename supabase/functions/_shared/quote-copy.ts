export const QUOTE_COPY = {
  encabezado: {
    titulo: 'Nueva cotización',
    comparativa: 'Nueva comparativa',
    descripcion: 'Una propuesta clara, desde el primer detalle.',
    contexto: 'Trotapie / Cotizaciones',
  },
  pasos: {cliente: 'Cliente y viaje', destino: 'Destino y hoteles', revision: 'Revisar propuesta'},
  cliente: {
    titulo: 'Las personas detrás del viaje',
    descripcion: 'Los datos del cliente y su estancia.',
    asesor: 'Asesor', seleccionarAsesor: 'Selecciona un asesor', buscarAsesor: 'Buscar asesor',
    prefijo: 'Prefijo', sinPrefijo: 'Sin prefijo', nombre: 'Nombre completo',
    telefono: 'Teléfono', correo: 'Correo electrónico', fechas: 'Fechas del viaje',
    entrada: 'Fecha de entrada', salida: 'Fecha de salida', seleccionarFecha: 'Seleccionar',
  },
  habitaciones: {
    seccion: '¿Quiénes viajan?', descripcion: 'Indica la distribución y la edad de cada menor al viajar.',
    titulo: 'Habitación', adultos: 'Adultos', menores: 'Menores', edad: 'Edad del menor',
    tipo: 'Tipo de habitación', seleccionar: 'Seleccionar habitación',
    camas: 'Camas (opcional)', seleccionarCamas: 'Seleccionar camas',
    requiereTipo: 'Selecciona una habitación primero', agregar: 'Agregar habitación',
  },
  destino: {
    titulo: 'Encuentra la estancia ideal', descripcion: 'Elige un destino, hotel y régimen.',
    comparativa: 'Opciones para comparar', descripcionComparativa: 'Selecciona dos o más hoteles para ofrecer alternativas.',
    destino: 'Destino', seleccionar: 'Seleccionar destino', buscar: 'Buscar destino',
    regimen: 'Régimen de alojamiento', seleccionarRegimen: 'Seleccionar régimen', precio: 'Precio de la opción (MXN)',
    sinDestino: 'Elige un destino para ver sus hoteles', ayuda: 'Tu selección se conserva mientras preparas la propuesta.',
    masHoteles: 'Ver más hoteles',
  },
  revision: {
    titulo: 'Todo listo para el siguiente paso', descripcion: 'Revisa la información antes de registrar la solicitud.',
    cliente: 'Cliente', contacto: 'Contacto', estancia: 'Estancia', distribucion: 'Distribución',
    precio: 'Precio por confirmar', notas: 'Peticiones especiales',
    ayuda: 'Comparte necesidades de accesibilidad o detalles que debamos considerar.',
  },
  resumen: {
    antetitulo: 'Tu propuesta', titulo: 'Un viaje a su medida.', comparativa: 'Más opciones. Mejores decisiones.',
    nota: 'Las cotizaciones son propuestas. Los precios se confirman con tu asesor.',
    noche: 'noche', noches: 'noches', persona: 'persona', personas: 'personas',
    habitacion: 'habitación', habitaciones: 'habitaciones', hotel: 'hotel seleccionado', hoteles: 'hoteles seleccionados',
  },
  acciones: {regresar: 'Regresar', anterior: 'Anterior', continuar: 'Continuar', guardar: 'Crear propuesta'},
  confirmacion: {
    titulo: '¡Solicitud registrada correctamente!',
    mensaje: 'Un asesor se pondrá en contacto contigo para dar seguimiento a tu cotización.',
    detalle: 'Ver cotización', listado: 'Ver listado de cotizaciones',
  },
};

export type CopyBlock = Record<string, Record<string, string>>;
export const COPY_LANGUAGES = ['en', 'fr', 'de', 'pt'] as const;
export const COPY_LIMIT = 300;
export const COPY_GROUPS = Object.entries(QUOTE_COPY).map(([key, values]) => ({
  key, fields: Object.entries(values).map(([key, text]) => ({key, text})),
}));
const byDefault = new Map(COPY_GROUPS.flatMap(group => group.fields.map(
  field => [field.text, [group.key, field.key]] as const,
)));
export function copyOverride(block: CopyBlock, fallback: string): string | undefined {
  const path = byDefault.get(fallback);
  return path ? block[path[0]]?.[path[1]] : undefined;
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export const validCopyText = (value: unknown): value is string =>
  typeof value === 'string' && !!value.trim() && value.length <= COPY_LIMIT && !/[{}]/.test(value);

// Only known keys and plain, non-empty text; omitted keys use the app's defaults.
export function cleanCopy(value: unknown): CopyBlock {
  if (!object(value)) throw new Error('El bloque de textos no es válido.');
  const result: CopyBlock = {};
  for (const [group, fields] of Object.entries(value)) {
    if (!Object.hasOwn(QUOTE_COPY, group) || !object(fields)) throw new Error('Hay un grupo de textos desconocido.');
    for (const [key, text] of Object.entries(fields)) {
      if (!Object.hasOwn(QUOTE_COPY[group as keyof typeof QUOTE_COPY], key) || !validCopyText(text))
        throw new Error('Hay un texto vacío, demasiado largo o con variables.');
      (result[group] ??= {})[key] = text.trim();
    }
  }
  return result;
}

export function changedCopy(previous: CopyBlock, next: CopyBlock): CopyBlock {
  const changed: CopyBlock = {};
  for (const [group, fields] of Object.entries(next))
    for (const [key, text] of Object.entries(fields))
      if (previous[group]?.[key] !== text) (changed[group] ??= {})[key] = text;
  return changed;
}

export function mergeCopyTranslations(
  next: CopyBlock, changed: CopyBlock, previous: CopyBlock, translated: CopyBlock,
): CopyBlock {
  const result: CopyBlock = {};
  for (const [group, fields] of Object.entries(next))
    for (const key of Object.keys(fields)) {
      const text = changed[group]?.[key] !== undefined ? translated[group]?.[key] : previous[group]?.[key];
      if (!validCopyText(text)) throw new Error('Google no devolvió todas las traducciones válidas.');
      (result[group] ??= {})[key] = text;
    }
  return result;
}
