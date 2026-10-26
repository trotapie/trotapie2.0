import type {IDriveActividadImportFolder} from '../../../data/queries/supabase.service';

export interface ImportedHomeImage {
  url_imagen: string;
  nombre_destino: string;
  activo: boolean;
}

export interface DriveImportResult {
  added: number;
  skipped: number;
  failed: Array<{name: string; message: string}>;
}

/** Recognize the same Drive file even when its public URL format changes. */
export function homeImageKey(value: string): string {
  const text = value.trim();
  try {
    const url = new URL(text);
    const driveHost = url.hostname === 'drive.google.com' || url.hostname === 'drive.usercontent.google.com';
    const imageHost = url.hostname === 'lh3.googleusercontent.com';
    if (driveHost || imageHost) {
      const id = url.pathname.match(/\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
      if (id) return `drive:${id}`;
    }
    url.hash = '';
    url.searchParams.sort();
    return url.href;
  } catch {
    return text;
  }
}

/** Save independently so a failed image does not discard other successful imports. */
export async function importHomeImages(
  folders: IDriveActividadImportFolder[],
  existingUrls: string[],
  save: (image: ImportedHomeImage) => Promise<unknown>,
  progress: (completed: number, total: number) => void = () => {},
): Promise<DriveImportResult> {
  const known = new Set(existingUrls.map(homeImageKey));
  const result: DriveImportResult = {added: 0, skipped: 0, failed: []};
  const total = folders.reduce((sum, folder) => sum + folder.imagenes.length, 0);
  if (!total) throw new Error('No se encontraron imágenes en esa carpeta de Drive.');
  let completed = 0;
  progress(completed, total);
  for (const folder of folders) {
    for (const image of folder.imagenes) {
      const publicUrl = image.publicImageUrl.trim();
      const publicKey = homeImageKey(publicUrl);
      const url = image.thumbnailUrl?.trim() || (publicKey.startsWith('drive:')
        ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(publicKey.slice('drive:'.length))}&sz=w1000`
        : publicUrl);
      const key = homeImageKey(url);
      const name = image.nombre?.trim().replace(/\.(jpe?g|png|webp|gif|avif|heic|bmp|tiff?|svg)$/i, '').trim()
        || (folder.nombre !== 'General' ? folder.nombre.trim() : '') || `Imagen de Drive ${completed + 1}`;
      if (known.has(key)) {
        result.skipped++;
      } else {
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('La imagen debe tener una URL HTTP o HTTPS.');
          await save({url_imagen: url, nombre_destino: name, activo: true});
          known.add(key);
          result.added++;
        } catch (error) {
          const message = error && typeof error === 'object' && 'message' in error
            ? String(error.message) : 'No pudimos guardar esta imagen.';
          result.failed.push({name, message});
        }
      }
      progress(++completed, total);
    }
  }
  return result;
}
