import test from 'node:test';
import assert from 'node:assert/strict';
import {isClassifiedImage} from '../src/app/data/utils/classified-image.ts';

test('accepts photos with a saved image classification or nested type',()=>{
  assert.equal(isClassifiedImage({tipo_imagen_id:3}),true);
  assert.equal(isClassifiedImage({tipo_imagen_id:'4'}),true);
  assert.equal(isClassifiedImage({tipo:{id:5}}),true);
});

test('excludes unclassified photos, plain URLs and invalid type IDs',()=>{
  for(const image of [null,'photo.jpg',{}, {tipo_imagen_id:null},{tipo_imagen_id:0},{tipo_imagen_id:-1},{tipo_imagen_id:'invalid'},{tipo:{id:null}}]){
    assert.equal(isClassifiedImage(image),false);
  }
});

test('filtering leaves classification metadata available for gallery categories',()=>{
  const classified={url_imagen:'classified.jpg',tipo_imagen_id:2,tipo:{id:2,clave:'Alberca'}};
  const images=[{url_imagen:'pending.jpg',tipo_imagen_id:null},classified];
  assert.deepEqual(images.filter(isClassifiedImage),[classified]);
  assert.equal(images.length,2);
});
