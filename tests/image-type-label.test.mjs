import test from 'node:test';
import assert from 'node:assert/strict';
import {imageTypeLabel} from '../src/app/data/utils/image-type-label.ts';

const catalog=[{id:1,clave:'ALB',traducciones:[{lang:'es',descripcion:'Alberca'},{lang:'en',descripcion:'Pool'}]}];

test('resolves a gallery type ID to its translated catalog name',()=>{
  assert.equal(imageTypeLabel({id:1},catalog,'es'),'Alberca');
  assert.equal(imageTypeLabel({id:'1'},catalog,'en'),'Pool');
  assert.equal(imageTypeLabel({id:1},catalog,'fr'),'Alberca');
});

test('preserves embedded names when the catalog cannot be loaded',()=>{
  assert.equal(imageTypeLabel({id:2,traducciones:[{lang:'es',descripcion:'Habitaciones'}]},[],'es'),'Habitaciones');
  assert.equal(imageTypeLabel({id:2,clave:'Playa'},[],'es'),'Playa');
});

test('supports the catalog service translation map without losing the selected language',()=>{
  const types=[{id:1,descripcion:'Alberca',traducciones_preview:{es:{descripcion:'Alberca'},en:{descripcion:'Pool'}}}];
  assert.equal(imageTypeLabel({id:1},types,'en'),'Pool');
  assert.equal(imageTypeLabel({id:1},types,'es'),'Alberca');
});

test('never presents internal type IDs as category names',()=>{
  assert.equal(imageTypeLabel({id:10},[],'es'),'Fotografías');
  assert.equal(imageTypeLabel({id:-1},[],'es'),'Sin clasificación');
});
