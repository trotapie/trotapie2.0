export function origenReservacionPayload(payload: Record<string, unknown>) {
  const clave = String(payload['clave'] ?? '').trim();
  const nombre_cotizador = String(payload['nombre_cotizador'] ?? '').trim();
  if (!clave) throw new Error('La clave del origen de reservación es obligatoria.');
  if (!nombre_cotizador) throw new Error('El nombre del cotizador es obligatorio.');
  return { clave, nombre_cotizador };
}
