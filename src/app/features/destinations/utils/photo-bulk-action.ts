export type PhotoBulkAction = 'activate' | 'deactivate' | 'delete';

/** Only applies to selected image references belonging to this attraction. */
export function applyPhotoBulkAction<T extends {activa?: boolean}>(images: T[], selected: readonly T[], action: PhotoBulkAction): T[] {
  const selection = new Set(selected);
  if (action === 'delete') return images.filter(image => !selection.has(image));
  return images.map(image => selection.has(image) ? {...image, activa: action === 'activate'} : image);
}
