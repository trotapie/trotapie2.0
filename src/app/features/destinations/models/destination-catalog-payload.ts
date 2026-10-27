export function destinationCatalogPayload(value: Record<string, unknown>) {
  const nombre = String(value['nombre'] ?? '').trim();
  const division = Number(value['division_area_id']);
  const orden = Number(value['orden'] || 0);
  const experience = value['tipo_turistico_id'];
  if (!nombre) throw new Error('Captura el nombre del destino.');
  if (!Number.isSafeInteger(division) || division <= 0) throw new Error('Selecciona la división de área del destino.');
  if (!Number.isSafeInteger(orden) || orden < 0) throw new Error('El orden debe ser un número entero mayor o igual a cero.');
  const tipoTuristicoId = experience === '' || experience == null ? null : Number(experience);
  if (tipoTuristicoId !== null && (!Number.isSafeInteger(tipoTuristicoId) || tipoTuristicoId <= 0)) throw new Error('Selecciona un tipo de experiencia válido.');
  return {
    nombre,
    orden,
    prioridad: Number(value['prioridad']) === 1 ? 1 as const : 2 as const,
    division_area_id: division,
    tipo_turistico_id: tipoTuristicoId,
    imagen_destino: String(value['imagen_destino'] ?? '').trim() || null,
    activo: value['activo'] !== false,
  };
}

export function destinationSlug(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'destino';
}
