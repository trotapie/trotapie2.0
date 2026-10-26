import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homeImageKey, importHomeImages} from '../src/app/features/admin/home-images/drive-import.ts';

const folder = images => ({id: 'folder', nombre: 'General', imagenes: images});
const image = (id, nombre = `${id}.jpg`) => ({publicImageUrl: `https://drive.google.com/uc?export=view&id=${id}`, nombre});

test('recognizes different public URL formats for the same Drive file', () => {
  const expected = homeImageKey('https://drive.google.com/file/d/abc_123/view?usp=sharing');
  assert.equal(homeImageKey('https://drive.google.com/uc?export=view&id=abc_123'), expected);
  assert.equal(homeImageKey('https://lh3.googleusercontent.com/d/abc_123=w1600'), expected);
  assert.equal(homeImageKey('https://drive.usercontent.google.com/download?id=abc_123&export=view'), expected);
  assert.notEqual(homeImageKey('https://example.org/d/abc_123'), expected);
});

test('normalizes URL whitespace, query order and fragments without merging distinct images', () => {
  assert.equal(homeImageKey(' https://example.org/photo.jpg?b=2&a=1#preview '), homeImageKey('https://example.org/photo.jpg?a=1&b=2'));
  assert.notEqual(homeImageKey('https://example.org/photo.jpg?v=1'), homeImageKey('https://example.org/photo.jpg?v=2'));
});

test('imports all folders automatically, skipping existing and repeated images', async () => {
  const saved = [];
  const progress = [];
  const result = await importHomeImages([
    folder([image('one'), image('two', 'París, Francia.JPG')]),
    {id: 'other', nombre: 'Roma', imagenes: [image('two'), image('three', null)]},
  ], ['https://drive.google.com/file/d/one/view'], async value => saved.push(value), (...value) => progress.push(value));
  assert.deepEqual(result, {added: 2, skipped: 2, failed: []});
  assert.equal(saved[0].nombre_destino, 'París, Francia');
  assert.equal(saved[1].nombre_destino, 'Roma');
  assert.ok(saved.every(value => value.activo === true));
  assert.deepEqual(progress, [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]]);
});

test('continues after a failed write and can retry without duplicating successful imports', async () => {
  const folders = [folder([image('one'), image('two'), image('three')])];
  const saved = [];
  const result = await importHomeImages(folders, [], async value => {
    if (value.nombre_destino === 'two') throw {message: 'Sin permiso'};
    saved.push(value.url_imagen);
  });
  assert.equal(result.added, 2);
  assert.deepEqual(result.failed, [{name: 'two', message: 'Sin permiso'}]);
  const retried = [];
  const retry = await importHomeImages(folders, saved, async value => retried.push(value));
  assert.deepEqual(retry, {added: 1, skipped: 2, failed: []});
  assert.equal(retried[0].nombre_destino, 'two');
});

test('does not write non-HTTP image URLs and gives unnamed images a usable name', async () => {
  const saved = [];
  const result = await importHomeImages([folder([
    {publicImageUrl: 'javascript:alert(1)', nombre: 'Inválida'},
    {publicImageUrl: 'https://example.org/photo.jpg'},
  ])], [], async value => saved.push(value));
  assert.equal(result.failed.length, 1);
  assert.equal(result.added, 1);
  assert.equal(saved[0].nombre_destino, 'Imagen de Drive 2');
});

test('an empty Drive folder reports an error without any writes', async () => {
  let writes = 0;
  await assert.rejects(importHomeImages([folder([])], [], async () => writes++), /No se encontraron imágenes/);
  assert.equal(writes, 0);
});

test('saves the thumbnail URL provided by Drive rather than its publicImageUrl', async () => {
  const thumbnailUrl = 'https://drive.google.com/thumbnail?id=file123&sz=w1000';
  const saved = [];
  await importHomeImages([folder([{...image('file123'), thumbnailUrl}])], [], async value => saved.push(value));
  assert.equal(saved[0].url_imagen, thumbnailUrl);
});

test('builds a w1000 thumbnail using the file ID when Drive does not provide thumbnailUrl', async () => {
  const saved = [];
  await importHomeImages([folder([image('file123')])], [], async value => saved.push(value));
  assert.equal(saved[0].url_imagen, 'https://drive.google.com/thumbnail?id=file123&sz=w1000');
});

test('does not reimport an existing public image when switching to thumbnail URLs', async () => {
  let writes = 0;
  const result = await importHomeImages([folder([{
    ...image('file123'), thumbnailUrl: 'https://drive.google.com/thumbnail?id=file123&sz=w1000',
  }])], ['https://drive.google.com/uc?export=view&id=file123'], async () => writes++);
  assert.equal(writes, 0);
  assert.equal(result.skipped, 1);
});
