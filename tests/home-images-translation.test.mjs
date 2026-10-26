import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translateHomeImage} from '../src/app/features/admin/home-images/translate-home-image.ts';

test('can translate only missing languages without replacing existing saved text', async () => {
  const value = {nombre_destino: 'Ámsterdam, Países Bajos', translation_2: 'Existing English name'};
  const prepared = await translateHomeImage(value, [{id: 3, codigo: 'fr', nombre: 'Francés'}],
    async payload => { assert.equal(payload.title, value.nombre_destino); return {fr: {title: 'Amsterdam, Pays-Bas'}}; }, () => true);
  assert.equal(prepared.translation_2, value.translation_2);
  assert.equal(prepared.translation_3, 'Amsterdam, Pays-Bas');
  assert.equal(value.translation_3, undefined);
});

const languages = [
  {id: 1, codigo: 'es', nombre: 'Español'},
  {id: 2, codigo: 'en', nombre: 'English'},
  {id: 3, codigo: 'fr', nombre: 'Français'},
  {id: 4, codigo: 'pt', nombre: 'Português'},
  {id: 5, codigo: 'de', nombre: 'Deutsch'},
];
const response = {en: {title: 'English name'}, fr: {title: 'Nom français'}, pt: {title: 'Nome português'}, de: {title: 'Deutscher Name'}};

test('translates the current Spanish text into all editor languages without changing other fields or the original draft', async () => {
  const value = {nombre_destino: '  Antigua, Guatemala  ', url_imagen: 'https://example.com/image.jpg', activo: false, translation_99: 'Preserved'};
  const snapshot = structuredClone(value);
  const prepared = await translateHomeImage(value, languages, async payload => {
    assert.deepEqual(payload, {title: 'Antigua, Guatemala', description: ''});
    return response;
  }, () => {throw new Error('No overwrite confirmation needed');});
  assert.deepEqual(value, snapshot);
  assert.deepEqual(prepared, {...snapshot, translation_2: 'English name', translation_3: 'Nom français', translation_4: 'Nome português', translation_5: 'Deutscher Name'});
});

test('does not request translations when existing texts are not approved for replacement', async () => {
  let calls = 0;
  const result = await translateHomeImage({nombre_destino: 'Antigua', translation_2: 'Manual'}, languages,
    async () => {calls++; return response;}, () => false);
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test('replaces existing texts only after confirmation', async () => {
  let confirmations = 0;
  const value = {nombre_destino: 'Antigua', translation_2: 'Manual'};
  const result = await translateHomeImage(value, languages, async () => response, () => {confirmations++; return true;});
  assert.equal(confirmations, 1);
  assert.equal(result.translation_2, 'English name');
  assert.equal(value.translation_2, 'Manual');
});

test('rejects an empty Spanish name before consulting the service', async () => {
  await assert.rejects(translateHomeImage({nombre_destino: '  '}, languages,
    async () => {assert.fail('Must not request');}, () => true), /en español/);
});

test('rejects a missing target-language catalog without requesting translations', async () => {
  await assert.rejects(translateHomeImage({nombre_destino: 'Antigua'}, [languages[0]],
    async () => {assert.fail('Must not request');}, () => true), /No hay idiomas/);
});

for (const invalid of [null, {}, {...response, de: {title: ''}}, {...response, de: {title: 123}}]) {
  test(`rejects incomplete or malformed results without modifying captured texts: ${JSON.stringify(invalid)}`, async () => {
    const value = {nombre_destino: 'Antigua', translation_2: 'Manual'};
    const before = structuredClone(value);
    await assert.rejects(translateHomeImage(value, languages, async () => invalid, () => true), /No se recibió la traducción/);
    assert.deepEqual(value, before);
  });
}

test('preserves the draft when the translation service fails', async () => {
  const value = {nombre_destino: 'Antigua', translation_2: 'Manual'};
  await assert.rejects(translateHomeImage(value, languages, async () => {throw new Error('Sin conexión');}, () => true), /Sin conexión/);
  assert.equal(value.translation_2, 'Manual');
});
