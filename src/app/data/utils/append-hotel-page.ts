import type {Page} from '../models/travel-record';

/** Preserve the visible hotels and avoid duplicate card keys between batches. */
export function appendHotelPage(current: Page, next: Page): Page {
  const items = new Map(current.items.map(item => [item.id, item]));
  for (const item of next.items) items.set(item.id, item);
  return {...next, items: [...items.values()]};
}
