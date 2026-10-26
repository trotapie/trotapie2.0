import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deleteHomeImage} from '../src/app/data/utils/delete-home-image.ts';

function clientFor(result, calls) {
  const query = {
    delete() {calls.push(['delete']); return this;},
    eq(key, id) {calls.push(['eq', key, id]); return this;},
    select(columns) {calls.push(['select', columns]); return this;},
    async maybeSingle() {return result;},
  };
  return {from(table) {calls.push(['from', table]); return query;}};
}

test('deletes only the selected database image, without calling Drive or deleting translations separately', async () => {
  const calls = [];
  await deleteHomeImage(clientFor({data: {id: 12}, error: null}, calls), 12);
  assert.deepEqual(calls, [['from', 'imagenes_fondo'], ['delete'], ['eq', 'id', 12], ['select', 'id']]);
});

test('reports a missing or unauthorized record instead of claiming success', async () => {
  await assert.rejects(deleteHomeImage(clientFor({data: null, error: null}, []), 12), /No se eliminó/);
});

test('propagates a database failure for retry without issuing a second delete', async () => {
  const calls = [];
  const error = new Error('Sin permisos');
  await assert.rejects(deleteHomeImage(clientFor({data: null, error}, calls), 12), /Sin permisos/);
  assert.equal(calls.filter(call => call[0] === 'delete').length, 1);
});

test('rejects invalid IDs without accessing the database', async () => {
  const calls = [];
  for (const id of [0, -1, NaN, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(deleteHomeImage(clientFor({}, calls), id), /ID válido/);
  }
  assert.deepEqual(calls, []);
});
