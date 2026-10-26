import {test} from 'node:test';
import assert from 'node:assert/strict';
import {queryHomeImagesDrive} from '../src/app/data/utils/home-images-drive.ts';

const primary = 'AKfycbyJwRo6g4aDbB2Va0739BAMzF2QCUcMu1t4ss9cG2GsbbGC3cK_wpnfD_pOD6x3PTlm';
const backup = 'AKfycbzZlWKBZW4rYHYNEBkjA-9Ct2ibBrVGL4mauadvOAGE2avCS4dwjGKQQgvQUMOnEfQkyA';
const secondBackup = 'AKfycbwLioRXwoAhPfZMrHnlTPBfkMEaitAHrrkqbd6PFZdX9NoxNpTuZMW0OpzPdISheiTT';
const normalize = result => result.data || [];
const response = data => Response.json({ok: true, data});

test('queries the attractions script with folderId before the legacy backups', async () => {
  const calls = [];
  const result = await queryHomeImagesDrive('folder id', normalize, async (url, options) => {
    calls.push(url);
    assert.ok(options.signal instanceof AbortSignal);
    return response(['image']);
  });
  assert.deepEqual(result, ['image']);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0]);
  assert.ok(url.pathname.includes(primary));
  assert.equal(url.searchParams.get('folderId'), 'folder id');
  assert.equal(url.searchParams.has('carpetaId'), false);
});

for (const [name, fail] of [
  ['network error', () => {throw new TypeError('Failed to fetch');}],
  ['HTTP error', () => new Response(null, {status: 403})],
  ['script error', () => Response.json({ok: false, message: 'Sin acceso'})],
  ['empty folder', () => response([])],
  ['invalid JSON', () => new Response('<html>Error</html>')],
  ['timeout', () => {throw new DOMException('Timed out', 'TimeoutError');}],
]) {
  test(`queries backup after primary ${name}`, async () => {
    const calls = [];
    const result = await queryHomeImagesDrive('folder', normalize, async url => {
      calls.push(url);
      return calls.length === 1 ? fail() : response(['backup-image']);
    });
    assert.deepEqual(result, ['backup-image']);
    assert.equal(calls.length, 2);
    assert.ok(calls[1].includes(backup));
    assert.equal(new URL(calls[1]).searchParams.get('carpetaId'), 'folder');
  });
}

test('tries the second legacy backup with carpetaId when the first two services fail', async () => {
  const calls = [];
  const result = await queryHomeImagesDrive('folder', normalize, async url => {
    calls.push(url);
    return calls.length < 3 ? response([]) : response(['image']);
  });
  assert.deepEqual(result, ['image']);
  assert.equal(calls.length, 3);
  assert.ok(calls[2].includes(secondBackup));
  assert.equal(new URL(calls[2]).searchParams.get('carpetaId'), 'folder');
});

test('reports all failures when none of the Drive services can return images', async () => {
  let calls = 0;
  await assert.rejects(queryHomeImagesDrive('folder', normalize, async () => {
    calls++;
    return Response.json({ok: false, message: `Sin acceso ${calls}`});
  }), error => /Atracciones: Sin acceso 1/.test(error.message) && /Respaldo 1: Sin acceso 2/.test(error.message) && /Respaldo 2: Sin acceso 3/.test(error.message));
  assert.equal(calls, 3);
});
