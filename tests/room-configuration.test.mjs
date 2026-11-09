import {test} from 'node:test';
import assert from 'node:assert/strict';
import {availableRoomTypes,reconcileRoom,selectRoomType,validRoomConfiguration} from '../src/app/features/quotations/models/room-configuration.ts';
import {roomDescription} from '../src/app/features/quotations/models/room.ts';
import {quoteWhatsAppUrl} from '../src/app/features/quotations/models/quote-whatsapp.ts';

const types=[
  {id:1,nombre_habitacion:'Doble',capacidad_maxima:2,camas:[{id:10,nombre:'King'}]},
  {id:2,nombre_habitacion:'Familiar',capacidad_maxima:4,camas:[{id:20,nombre:'Dos matrimoniales'}]},
  {id:3,nombre_habitacion:'Sin capacidad configurada',capacidad_maxima:null,camas:[]},
];
const room={adults:2,children:1,childAges:[5]};

test('filters by all adults and children, allowing exact capacity and larger rooms',()=>{
  assert.deepEqual(availableRoomTypes(room,types).map(t=>t.id),[2]);
  assert.deepEqual(availableRoomTypes({...room,children:0,childAges:[]},types).map(t=>t.id),[1,2]);
  assert.deepEqual(availableRoomTypes({...room,adults:6},types),[]);
});
test('changing the room resets the bed, even when it existed in the previous room',()=>{
  const selected=selectRoomType({...room,roomTypeId:1,bedTypeId:10,bedTypeName:'King'},2,types);
  assert.equal(selected.roomTypeId,2);
  assert.equal(selected.roomTypeName,'Familiar');
  assert.equal(selected.bedTypeId,null);
  assert.equal(selected.bedTypeName,'');
});
test('increasing occupancy clears an invalid room and its bed without mutating the source',()=>{
  const original={...room,roomTypeId:1,roomTypeName:'Doble',bedTypeId:10,bedTypeName:'King'};
  const result=reconcileRoom(original,types);
  assert.equal(result.roomTypeId,null);
  assert.equal(result.bedTypeId,null);
  assert.equal(original.roomTypeId,1);
  assert.deepEqual(result.childAges,[5]);
});
test('retains a still-valid room and bed after occupancy changes',()=>{
  const selected={...room,roomTypeId:2,bedTypeId:20};
  assert.equal(reconcileRoom(selected,types).bedTypeId,20);
  assert.equal(validRoomConfiguration(selected,types),true);
  assert.equal(validRoomConfiguration({...selected,bedTypeId:10},types),false);
  assert.equal(validRoomConfiguration({...selected,bedTypeId:null},types),true);
  assert.equal(validRoomConfiguration({...selected,roomTypeId:null},types),false);
});
test('removing a bed from the catalog clears the selection and fails validation',()=>{
  const selected={...room,roomTypeId:2,bedTypeId:99,bedTypeName:'Eliminada'};
  assert.equal(reconcileRoom(selected,types).bedTypeId,null);
  assert.equal(validRoomConfiguration(selected,types),false);
});
test('beds are optional even when the room has no associated beds',()=>{
  const withoutBeds=[{id:4,nombre_habitacion:'Triple',capacidad_maxima:3,camas:[]}];
  assert.equal(validRoomConfiguration({...room,roomTypeId:4},withoutBeds),true);
  assert.equal(validRoomConfiguration({...room,roomTypeId:4,bedTypeId:null},withoutBeds),true);
  assert.equal(validRoomConfiguration({...room,roomTypeId:4,bedTypeId:10},withoutBeds),false);
});
test('room type and bed labels survive the quotation and WhatsApp descriptions',()=>{
  const selected=reconcileRoom({...room,roomTypeId:2,bedTypeId:20},types);
  assert.match(roomDescription([selected]).es,/Tipo: Familiar · Camas: Dos matrimoniales/);
  const url=quoteWhatsAppUrl({name:'Ana',phone:'123',email:'',destination:'Cancún',start:'2026-12-20',end:'2026-12-23',nights:3,rooms:[selected],hotels:[{name:'Hotel',regime:'Todo incluido'}],notes:'',advisor:'Asesor'});
  assert.match(decodeURIComponent(url),/Tipo: Familiar · Camas: Dos matrimoniales/);
});
