import {test} from 'node:test';
import assert from 'node:assert/strict';
import {processHomeImages} from '../src/app/features/admin/home-images/bulk-home-images.ts';

const images = [
  {id: '1', title: 'Antigua', active: true},
  {id: '2', title: 'Bahía', active: false},
  {id: '3', title: 'Agra', active: false},
];

test('activation skips already active images and reports progress including skipped records', async () => {
  const writes = [], progress = [];
  const result = await processHomeImages(images, 'activate', async (...args) => { writes.push(args); }, (...args) => progress.push(args));
  assert.deepEqual(writes, [[2, 'activate'], [3, 'activate']]);
  assert.deepEqual(result, {action: 'activate', succeeded: ['2', '3'], skipped: ['1'], failed: []});
  assert.deepEqual(progress, [[0, 3], [1, 3], [2, 3], [3, 3]]);
});

test('deactivation only writes active images', async () => {
  const writes = [];
  const result = await processHomeImages(images, 'deactivate', async (...args) => { writes.push(args); });
  assert.deepEqual(writes, [[1, 'deactivate']]);
  assert.deepEqual(result.skipped, ['2', '3']);
});

test('deletion processes both states, preserves successes after failures and allows retrying failed IDs', async () => {
  const writes = [];
  const result = await processHomeImages(images, 'delete', async id => {
    writes.push(id);
    if (id === 2) throw {message: 'Sin permisos'};
  });
  assert.deepEqual(writes, [1, 2, 3]);
  assert.deepEqual(result.succeeded, ['1', '3']);
  assert.deepEqual(result.failed, [{id: '2', name: 'Bahía', message: 'Sin permisos'}]);
  const retry = [];
  await processHomeImages(images.filter(image => result.failed.some(failure => failure.id === image.id)), 'delete', async id => { retry.push(id); });
  assert.deepEqual(retry, [2]);
});

test('deduplicates selected IDs and leaves input records unchanged', async () => {
  const snapshot = structuredClone(images), writes = [];
  await processHomeImages([...images, images[0]], 'delete', async id => { writes.push(id); });
  assert.deepEqual(writes, [1, 2, 3]);
  assert.deepEqual(images, snapshot);
});

test('invalid IDs fail without writes and do not stop valid images', async () => {
  const writes = [];
  const result = await processHomeImages([{id: '0', title: 'Inválida', active: false}, images[0]], 'delete', async id => { writes.push(id); });
  assert.deepEqual(writes, [1]);
  assert.match(result.failed[0].message, /ID válido/);
});

test('all skipped and empty selections produce no writes', async () => {
  const write = async () => { assert.fail('Unexpected write'); };
  const result = await processHomeImages([images[0]], 'activate', write);
  assert.deepEqual(result.skipped, ['1']);
  assert.deepEqual(await processHomeImages([], 'delete', write), {action: 'delete', succeeded: [], skipped: [], failed: []});
});
