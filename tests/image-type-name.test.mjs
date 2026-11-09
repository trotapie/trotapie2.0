import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImageTypeName} from '../src/app/data/utils/image-type-name.ts';

test('capitalizes the first letter and preserves the remaining image type name',()=>{
  assert.equal(normalizeImageTypeName(' business Center '),'Business Center');
  assert.equal(normalizeImageTypeName('áreas comunes'),'Áreas comunes');
  assert.equal(normalizeImageTypeName('SPA'),'SPA');
  assert.equal(normalizeImageTypeName('360° vista panorámica'),'360° Vista panorámica');
});

test('handles empty or absent names',()=>{
  for(const value of ['', '   ', null, undefined])assert.equal(normalizeImageTypeName(value),'');
});
