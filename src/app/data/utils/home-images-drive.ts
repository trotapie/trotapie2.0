const HOME_IMAGES_DRIVE_ENDPOINTS = [
  {name: 'Atracciones', parameter: 'folderId', url: 'https://script.google.com/macros/s/AKfycbyJwRo6g4aDbB2Va0739BAMzF2QCUcMu1t4ss9cG2GsbbGC3cK_wpnfD_pOD6x3PTlm/exec'},
  {name: 'Respaldo 1', parameter: 'carpetaId', url: 'https://script.google.com/macros/s/AKfycbzZlWKBZW4rYHYNEBkjA-9Ct2ibBrVGL4mauadvOAGE2avCS4dwjGKQQgvQUMOnEfQkyA/exec'},
  {name: 'Respaldo 2', parameter: 'carpetaId', url: 'https://script.google.com/macros/s/AKfycbwLioRXwoAhPfZMrHnlTPBfkMEaitAHrrkqbd6PFZdX9NoxNpTuZMW0OpzPdISheiTT/exec'},
] as const;

/** Query attractions first, preserving the distinct parameter contracts of the legacy backups. */
export async function queryHomeImagesDrive<T>(
  folderId: string,
  normalize: (response: unknown) => T[],
  request: typeof fetch = fetch,
  debug = false,
): Promise<T[]> {
  const errors: string[] = [];
  for (const endpoint of HOME_IMAGES_DRIVE_ENDPOINTS) {
    try {
      const url = new URL(endpoint.url);
      url.searchParams.set(endpoint.parameter, folderId);
      if (debug) console.log('[Drive inicio] Petición', {servicio: endpoint.name, folderId, parametro: endpoint.parameter, url: url.href});
      const response = await request(url.href, {signal: AbortSignal.timeout(30_000)});
      if (debug) console.log('[Drive inicio] Estado HTTP', {servicio: endpoint.name, status: response.status});
      if (!response.ok) throw new Error('No se pudo consultar la carpeta de Drive.');
      const result = await response.json();
      if (debug) console.log('[Drive inicio] Respuesta original', {servicio: endpoint.name, respuesta: structuredClone(result)});
      if (result?.ok === false || result?.success === false) {
        throw new Error(result?.message || 'El servicio no pudo acceder a la carpeta de Drive.');
      }
      const folders = normalize(result);
      if (debug) console.log('[Drive inicio] Carpetas e imágenes interpretadas', {servicio: endpoint.name, carpetas: structuredClone(folders)});
      if (!folders.length) throw new Error('No se encontraron imágenes en esa carpeta de Drive.');
      return folders;
    } catch (error) {
      if (debug) console.warn('[Drive inicio] Consulta fallida; se intentará el siguiente servicio si existe', {servicio: endpoint.name, error});
      errors.push(`${endpoint.name}: ${error instanceof Error ? error.message : 'No se pudo consultar Drive.'}`);
    }
  }
  throw new Error(`No pudimos obtener imágenes desde los servicios de Drive. ${errors.join(' ')} Verifica el enlace y los permisos de la carpeta.`);
}
