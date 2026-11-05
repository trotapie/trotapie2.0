import test from 'node:test';
import assert from 'node:assert/strict';
import {searchHotelDestinations,selectedHotelDestination,destinationSearchTerm,HOTEL_DESTINATION_LIMIT} from '../src/app/data/utils/hotel-destination-lookup.ts';

function client(result){
  const calls=[];
  const query={};
  for(const method of ['select','eq','ilike','order'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
  query.limit=async value=>{calls.push(['limit',value]);return result;};
  query.maybeSingle=async()=>{calls.push(['maybeSingle']);return result;};
  return {calls,from(table){calls.push(['from',table]);return query;}};
}

test('hotel destination search issues one bounded query instead of fetching the entire catalog',async()=>{
  const db=client({data:[{id:5,nombre:'Mazatlán'}],error:null});
  assert.deepEqual(await searchHotelDestinations(db,'Maz'),[{value:5,label:'Mazatlán'}]);
  assert.deepEqual(db.calls,[['from','catalogo_destinos'],['select','id,nombre'],['eq','activo',true],['ilike','nombre','%Maz%'],['order','nombre'],['order','id'],['limit',25]]);
  assert.equal(HOTEL_DESTINATION_LIMIT,25);
});

test('opening the selector loads only the first 25 active destinations',async()=>{
  const db=client({data:[],error:null});
  assert.deepEqual(await searchHotelDestinations(db,''),[]);
  assert.equal(db.calls.some(call=>call[0]==='ilike'),false);
  assert.deepEqual(db.calls.at(-1),['limit',25]);
  assert.equal(db.calls.filter(call=>call[0]==='from').length,1);
});

test('selected destination resolves by exact ID without excluding inactive destinations',async()=>{
  const db=client({data:{id:15,nombre:'Destino inactivo'},error:null});
  assert.deepEqual(await selectedHotelDestination(db,15),{value:15,label:'Destino inactivo'});
  assert.deepEqual(db.calls,[['from','catalogo_destinos'],['select','id,nombre'],['eq','id',15],['maybeSingle']]);
});

test('missing or invalid selected IDs do not scan the catalog',async()=>{
  const db=client({data:null,error:null});
  for(const id of [0,-1,NaN,1.5])assert.equal(await selectedHotelDestination(db,id),null);
  assert.deepEqual(db.calls,[]);
  assert.equal(await selectedHotelDestination(db,99),null);
});

test('search removes wildcards, retains accents and limits input length',()=>{
  assert.equal(destinationSearchTerm('  Maz_at%lán,  '),'Mazatlán');
  assert.equal(destinationSearchTerm('a'.repeat(101)).length,100);
});

test('lookup failures propagate for retry without triggering fallback full scans',async()=>{
  const error=new Error('permission denied');
  const db=client({data:null,error});
  await assert.rejects(searchHotelDestinations(db,'Maz'),error);
  await assert.rejects(selectedHotelDestination(db,5),error);
  assert.equal(db.calls.filter(call=>call[0]==='from').length,2);
});
