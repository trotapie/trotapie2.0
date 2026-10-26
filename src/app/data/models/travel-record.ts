export type Row = Record<string, any>;
export interface TravelRecord { id: string; title: string; subtitle: string; image: string; status: string; raw: Row; }
export interface Page { items: TravelRecord[]; total: number; page: number; }
export const PAGE_SIZE = 24;
export function normalizeRecord(row: Row, kind = ''): TravelRecord {
  if (kind === 'meses_disponibles') {
    const meses = row['meses'];
    return {
      id: String(row['id']),
      title: meses == null ? 'Sin plazo' : `${meses} ${Number(meses) === 1 ? 'mes' : 'meses'} sin intereses`,
      subtitle: '',
      image: '',
      status: typeof row['activo'] === 'boolean' ? (row['activo'] ? 'Activo' : 'Inactivo') : '',
      raw: row,
    };
  }
  if (kind === 'descuentos') {
    return {
      id: String(row['id']),
      title: row['tipo_descuento'] || 'Sin nombre',
      subtitle: '',
      image: '',
      status: '',
      raw: row,
    };
  }
  if (kind === 'codigos_pais') {
    return {
      id: String(row['id']),
      title: row['pais'] || 'Sin nombre',
      subtitle: row['prefijo'] ? `Prefijo telefónico: ${row['prefijo']}` : '',
      image: '',
      status: typeof row['activo'] === 'boolean' ? (row['activo'] ? 'Activo' : 'Inactivo') : '',
      raw: row,
    };
  }
  return { id: String(kind === 'destinos' ? row['destino_id'] ?? row['id'] : row['id']), title: row['destino_nombre'] && kind === 'destinos' ? row['destino_nombre'] : row['nombre_hotel'] || row['nombre'] || row['cliente_nombre'] || row['nombre_persona'] || row['nombre_habitacion'] || row['descripcion'] || row['rol'] || row['name'] || row['clave'] || row['codigo'] || 'Sin nombre', subtitle: row['division_area_nombre'] || row['destino_nombre'] || row['email'] || row['descripcion_rol'] || row['key'] || row['pais_nombre'] || '', image: row['imagen_destino'] || row['fondo'] || row['imagen_principal'] || '', status: row['estatus_nombre'] || row['estatus_clave'] || (typeof row['activo'] === 'boolean' ? (row['activo'] ? 'Activo' : 'Inactivo') : ''), raw: row };
}

