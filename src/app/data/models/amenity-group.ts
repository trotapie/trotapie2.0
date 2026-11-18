export interface AmenityGroup {
  id: number;
  nombre: string;
  activo: boolean;
  actividad_ids: number[];
  amenity_count: number;
}

export function mergeAmenityGroup(
  currentIds: readonly number[],
  groupIds: readonly number[],
  availableIds: ReadonlySet<number>,
): number[] {
  return [...new Set([...currentIds, ...groupIds.filter(id => availableIds.has(id))])];
}
