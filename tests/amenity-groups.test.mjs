import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeAmenityGroup} from '../src/app/data/models/amenity-group.ts';
import {hotelDetailPayload,newHotelEditorDraft} from '../src/app/features/hotels/models/hotel-editor-model.ts';

test('applying a group adds only available amenity IDs without duplicating or clearing prior choices', () => {
  const current = [9, 2];
  const group = [2, 3, 3, 4];
  const available = new Set([2, 3, 9]);
  const applied = mergeAmenityGroup(current, group, available);

  assert.deepEqual(applied, [9, 2, 3]);
  assert.deepEqual(mergeAmenityGroup(applied, group, available), applied);
  assert.deepEqual(current, [9, 2]);
  assert.deepEqual(group, [2, 3, 3, 4]);
});

test('saving a new hotel stores manual adjustments but does not link it to the template', () => {
  const group = {id: 42, actividad_ids: [2, 3]};
  const available = new Set([2, 3, 5, 9]);
  const initial = mergeAmenityGroup([], group.actividad_ids, available);
  const adjusted = [...initial.filter(id => id !== 3), 9];
  const draft = newHotelEditorDraft('15');
  const saved = hotelDetailPayload({...draft, nombre_hotel: 'Hotel de playa', activityIds: adjusted});

  group.actividad_ids.splice(1, 1, 5);
  const next = mergeAmenityGroup([], group.actividad_ids, available);

  assert.deepEqual(saved.actividad_ids, [2, 9]);
  assert.equal(saved.catalogo_destino_id, 15);
  assert.deepEqual(next, [2, 5]);
  assert.equal(Object.keys(saved).some(key => /grupo|group/.test(key)), false);
});
