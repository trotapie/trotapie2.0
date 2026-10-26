export type HomeImageBulkAction = 'activate' | 'deactivate' | 'delete';
export interface BulkImage {id: string; title: string; active: boolean;}
export interface HomeImageBulkResult {
  action: HomeImageBulkAction;
  succeeded: string[];
  skipped: string[];
  failed: {id: string; name: string; message: string}[];
}

/** Independent writes preserve successes and allow retrying only failed records. */
export async function processHomeImages(
  images: BulkImage[], action: HomeImageBulkAction,
  write: (id: number, action: HomeImageBulkAction) => Promise<void>,
  progress: (completed: number, total: number) => void = () => {},
): Promise<HomeImageBulkResult> {
  const unique = [...new Map(images.map(image => [image.id, image])).values()];
  const result: HomeImageBulkResult = {action, succeeded: [], skipped: [], failed: []};
  progress(0, unique.length);
  for (const image of unique) {
    try {
      const id = Number(image.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('La imagen no tiene un ID válido.');
      if (action !== 'delete' && image.active === (action === 'activate')) result.skipped.push(image.id);
      else {
        await write(id, action);
        result.succeeded.push(image.id);
      }
    } catch (error) {
      result.failed.push({id: image.id, name: image.title, message: error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No pudimos procesar esta imagen.'});
    }
    progress(result.succeeded.length + result.skipped.length + result.failed.length, unique.length);
  }
  return result;
}
