import test from 'node:test';
import assert from 'node:assert/strict';
import {imageTypeTranslations} from '../src/app/features/catalogs/models/image-type-translations.ts';

test('shows saved translations with language names and excludes the Spanish form value',()=>{
  assert.deepEqual(imageTypeTranslations({es:{descripcion:'Alberca'},en:{descripcion:' Pool '},fr:{descripcion:'Piscine'}}),[
    {code:'fr',label:'Francés',text:'Piscine'},
    {code:'en',label:'Inglés',text:'Pool'}
  ]);
});

test('handles missing translations and unrecognized languages without inventing text',()=>{
  assert.deepEqual(imageTypeTranslations(null),[]);
  assert.deepEqual(imageTypeTranslations({ja:{descripcion:''}}),[{code:'ja',label:'JA',text:''}]);
});
