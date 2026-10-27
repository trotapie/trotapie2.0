import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyHotelPhoto,classifyHotelPhotos,groupHotelPhotos} from '../src/app/features/hotels/models/hotel-photo-classification.ts';

test('classifying a saved hotel photo preserves its ID and other metadata without mutating the draft',()=>{
  const images=[{id:12,url_imagen:'https://example.com/beach.jpg',tipo_imagen_id:1,tipo:{id:1}},{id:13,url_imagen:'https://example.com/spa.jpg',tipo_imagen_id:2}];
  const updated=classifyHotelPhoto(images,images[0].url_imagen,3);
  assert.deepEqual(updated[0],{...images[0],tipo_imagen_id:3});
  assert.equal(images[0].tipo_imagen_id,1);
  assert.equal(updated[1],images[1]);
});

test('new and Drive-imported photos can be classified before their first save',()=>{
  const url='https://drive.google.com/thumbnail?id=photo&sz=w1000';
  const images=classifyHotelPhoto([],url,4);
  assert.deepEqual(images,[{url_imagen:url,tipo_imagen_id:4}]);
  assert.deepEqual(classifyHotelPhoto(images,url,5),[{url_imagen:url,tipo_imagen_id:5}]);
});

test('Sin tipo explicitly clears a saved classification while retaining the persisted ID',()=>{
  assert.deepEqual(classifyHotelPhoto([{id:7,url_imagen:'https://example.com/photo.jpg',tipo_imagen_id:3}],'https://example.com/photo.jpg',null),[{id:7,url_imagen:'https://example.com/photo.jpg',tipo_imagen_id:null}]);
});

test('classification metadata follows each URL independently of gallery order',()=>{
  let images=classifyHotelPhoto([],'https://example.com/a.jpg',1);
  images=classifyHotelPhoto(images,'https://example.com/b.jpg',2);
  const urls=['https://example.com/b.jpg','https://example.com/a.jpg'];
  assert.deepEqual(urls.map(url=>images.find(image=>image.url_imagen===url).tipo_imagen_id),[2,1]);
});

test('bulk classification affects only selected gallery photos and preserves saved IDs',()=>{
  const images=[{id:1,url_imagen:'a',tipo_imagen_id:2},{id:2,url_imagen:'b',tipo_imagen_id:3}];
  const updated=classifyHotelPhotos(images,['a','b','drive'],['a','drive','a','deleted'],4);
  assert.deepEqual(updated,[{id:1,url_imagen:'a',tipo_imagen_id:4},images[1],{url_imagen:'drive',tipo_imagen_id:4}]);
  assert.equal(images[0].tipo_imagen_id,2);
});

test('bulk Sin tipo clears classifications for all selected photos',()=>{
  const images=[{id:1,url_imagen:'a',tipo_imagen_id:2},{id:2,url_imagen:'b',tipo_imagen_id:3}];
  assert.deepEqual(classifyHotelPhotos(images,['a','b'],['a','b'],null).map(image=>image.tipo_imagen_id),[null,null]);
});

test('groups show unclassified photos, catalog types including empty ones, and missing catalog types',()=>{
  const images=[{url_imagen:'a',tipo_imagen_id:1},{url_imagen:'b',tipo_imagen_id:99},{url_imagen:'deleted',tipo_imagen_id:1}];
  assert.deepEqual(groupHotelPhotos(['a','b','new','a'],images,[{value:1,label:'Playa'},{value:2,label:'Spa'}]),[
    {id:null,label:'Sin tipo',urls:['new']},
    {id:1,label:'Playa',urls:['a']},
    {id:2,label:'Spa',urls:[]},
    {id:99,label:'Tipo #99',urls:['b']}
  ]);
});

test('groups immediately reflect unsaved bulk changes without showing deleted photos',()=>{
  const images=classifyHotelPhotos([],['a','b'],['a','b'],1);
  const groups=groupHotelPhotos(['a'],images,[{value:1,label:'Playa'}]);
  assert.deepEqual(groups,[{id:null,label:'Sin tipo',urls:[]},{id:1,label:'Playa',urls:['a']}]);
});

test('assigning images creates a populated type folder and removes them from Sin tipo',()=>{
  const gallery=['a','b','c'];
  const types=[{value:1,label:'Playa'},{value:2,label:'Spa'}];
  const before=groupHotelPhotos(gallery,[],types);
  assert.deepEqual(before.find(group=>group.id===null).urls,gallery);
  const images=classifyHotelPhotos([],gallery,['a','b'],1);
  const after=groupHotelPhotos(gallery,images,types);
  assert.deepEqual(after.find(group=>group.id===null).urls,['c']);
  assert.deepEqual(after.find(group=>group.id===1).urls,['a','b']);
  const moved=groupHotelPhotos(gallery,classifyHotelPhotos(images,gallery,['b'],2),types);
  assert.deepEqual(moved.find(group=>group.id===1).urls,['a']);
  assert.deepEqual(moved.find(group=>group.id===2).urls,['b']);
});

test('internal folders reconstruct from persisted types and need no separate folder records',()=>{
  const images=[{id:1,url_imagen:'a',tipo_imagen_id:1},{id:2,url_imagen:'b',tipo_imagen_id:null}];
  const types=[{value:1,label:'Playa'}];
  const groups=groupHotelPhotos(['a','b'],images,types);
  assert.deepEqual(groupHotelPhotos(['a','b'],JSON.parse(JSON.stringify(images)),types),groups);
  assert.deepEqual(groupHotelPhotos([],images,types).map(group=>group.urls),[[],[]]);
});
