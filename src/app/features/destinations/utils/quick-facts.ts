import type {IPreviewDestinoAdmin} from '../../../data/queries/supabase.service';

export function availableQuickFactTypes(model: IPreviewDestinoAdmin) {
  const used = new Set(model.detalles_rapidos.map(fact => fact.tipo_dato_rapido_id));
  return [...new Map(model.catalogo_tipos_dato_rapido.map(type => [type.id, type])).values()]
    .filter(type => !used.has(type.id));
}

/** Prepare a local addition; persistence happens with the rest of the editor. */
export function appendQuickFact(model: IPreviewDestinoAdmin, typeId: number, languageId: number, value: string): IPreviewDestinoAdmin {
  const type = availableQuickFactTypes(model).find(type => type.id === typeId);
  if (!type) throw new Error('Selecciona un tipo disponible que no esté agregado.');
  if (!model.idiomas.some(language => language.id === languageId)) throw new Error('Selecciona un idioma válido.');
  if (!value.trim()) throw new Error('Escribe el valor del dato rápido.');
  const id = Math.min(0, ...model.detalles_rapidos.map(fact => fact.id)) - 1;
  const order = Math.max(0, ...model.detalles_rapidos.map(fact => fact.orden ?? 0)) + 1;
  return {...model, detalles_rapidos: [...model.detalles_rapidos, {
    id, activo: true, tipo_dato_rapido_id: type.id, clave: type.clave,
    nombre: type.nombre, icono: type.icono, tipo_valor: type.tipo_valor, orden: order,
    valores: Object.fromEntries(model.idiomas.map(language => [language.id, language.id === languageId ? value.trim() : ''])),
  }]};
}
