import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hotelCatalogFilters,hotelStatusColumnAvailable,activeHotelDestinationOptions,hasHotelDestination} from '../src/app/data/utils/hotel-catalog-filters.ts';
import {normalizeRecord} from '../src/app/data/models/travel-record.ts';

function query(){return {calls:[],ilike(...args){this.calls.push(['ilike',...args]);return this;},eq(...args){this.calls.push(['eq',...args]);return this;}};}
test('general hotel catalog has no implicit destination or state filter',()=>{
  const q=query();hotelCatalogFilters(q,'',undefined,'',true);assert.deepEqual(q.calls,[]);
});
test('hotel filters apply before pagination and sanitize search wildcards',()=>{
  const q=query();hotelCatalogFilters(q,' Mar_% , ',12,'inactivo',true);
  assert.deepEqual(q.calls,[['ilike','nombre_hotel','%Mar%'],['eq','catalogo_destino_id_resuelto',12],['eq','activo',false]]);
  const active=query();hotelCatalogFilters(active,'',undefined,'activo',true);assert.deepEqual(active.calls,[['eq','activo',true]]);
});
test('legacy schema still supports destination and name without querying a missing status column',()=>{
  const q=query();hotelCatalogFilters(q,'Hotel',4,'activo',false);
  assert.deepEqual(q.calls,[['ilike','nombre_hotel','%Hotel%'],['eq','catalogo_destino_id_resuelto',4]]);
});
test('hotel records display the photo, destination and real persisted state',()=>{
  const result=normalizeRecord({id:1,nombre_hotel:'Mar',destino_nombre:'Mazatlán',fondo:'https://example.com/hotel.jpg',activo:false},'hoteles');
  assert.equal(result.subtitle,'Mazatlán');assert.equal(result.image,'https://example.com/hotel.jpg');assert.equal(result.status,'Inactivo');
  assert.equal(normalizeRecord({id:1,nombre_hotel:'Mar'},'hoteles').status,'');
});
test('status capability only falls back for missing columns, not permission or network errors',async()=>{
  const client=error=>({from:()=>({select:()=>({limit:async()=>({error})})})});
  assert.equal(await hotelStatusColumnAvailable(client(null)),true);
  assert.equal(await hotelStatusColumnAvailable(client({code:'42703'})),false);
  await assert.rejects(hotelStatusColumnAvailable(client({code:'42501',message:'denied'})));
});

test('destination options load all pages, exclude inactive destinations and sort names',async()=>{
  const pages=[{items:[{id:'1',title:'Zacatecas',raw:{activo:true}},{id:'2',title:'Inactivo',raw:{activo:false}}],total:3},{items:[{id:'3',title:'Acapulco',raw:{activo:true}}],total:3}];
  const requested=[];
  const options=await activeHotelDestinationOptions(async page=>{requested.push(page);return pages[page];});
  assert.deepEqual(requested,[0,1]);
  assert.deepEqual(options,[{value:3,label:'Acapulco'},{value:1,label:'Zacatecas'}]);
});

test('empty destination groups stay empty without requesting another page',async()=>{
  let calls=0;assert.deepEqual(await activeHotelDestinationOptions(async()=>{calls++;return {items:[],total:0};}),[]);assert.equal(calls,1);
});

test('a valid destination is required before listing hotels',()=>{
  for(const id of [undefined,null,0,-1,1.5,NaN])assert.equal(hasHotelDestination(id),false);
  assert.equal(hasHotelDestination(12),true);
});

test('regime filter combines with the selected destination, search and hotel status',()=>{
  const q=query();hotelCatalogFilters(q,'Mar',12,'activo',true,{regimeId:3});
  assert.deepEqual(q.calls,[['ilike','nombre_hotel','%Mar%'],['eq','catalogo_destino_id_resuelto',12],['eq','activo',true],['eq','regimen_id',3]]);
});
