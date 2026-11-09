import test from 'node:test';
import assert from 'node:assert/strict';
import {generateImageTypeKey} from '../src/app/data/utils/image-type-key.ts';
import {catalogDefinition} from '../src/app/features/catalogs/models/catalog-definitions.ts';

test('image type editor reads the saved description instead of an absent nombre field',()=>{
  const fields=catalogDefinition('tipo_imagen').fields;
  const record={id:1,clave:'BUS',descripcion:'Business Center',orden:1};
  assert.equal(fields.length,1);
  assert.equal(fields[0].key,'descripcion');
  assert.equal(fields[0].required,true);
  assert.equal(record[fields[0].key],'Business Center');
});

test('generates three uppercase letters from the image type name',()=>{
  assert.equal(generateImageTypeKey('Business Center',[]),'BUS');
  assert.equal(generateImageTypeKey('Áreas comunes',[]),'ARE');
  assert.equal(generateImageTypeKey('TV',[]),'TVX');
  assert.equal(generateImageTypeKey('123',[]),'IMG');
});

test('avoids existing keys regardless of case or whitespace',()=>{
  assert.equal(generateImageTypeKey('Business Center',[' bus ','aaa','AAB']),'AAC');
});

test('reports exhaustion rather than generating a duplicate or a longer key',()=>{
  const keys=Array.from({length:26**3},(_,index)=>String.fromCharCode(65+Math.floor(index/676),65+Math.floor(index/26)%26,65+index%26));
  assert.throws(()=>generateImageTypeKey('Business Center',keys),/No quedan claves/);
});
