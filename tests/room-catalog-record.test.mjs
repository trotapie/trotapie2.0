import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomCatalogRecord} from '../src/app/data/utils/room-catalog-record.ts';
import {normalizeRecord} from '../src/app/data/models/travel-record.ts';
import {catalogDefinition} from '../src/app/features/catalogs/models/catalog-definitions.ts';

test('shows associated bed names in the room catalog while preserving editable IDs',()=>{
  const row={id:1,nombre_habitacion:'Doble',capacidad_maxima:2,camas:[
    {tipo_cama_id:10,tipo_cama:{nombre:'King',activo:true}},
    {tipo_cama_id:20,tipo_cama:{nombre:'Dos individuales',activo:true}},
  ]};
  const original=structuredClone(row);
  const result=roomCatalogRecord(row);
  assert.equal(result.camas_configuradas,'King');
  assert.deepEqual(result.camas_detalle,['King','Dos individuales']);
  assert.deepEqual(result.cama_ids,[10,20]);
  assert.deepEqual(row,original);
  assert.equal(normalizeRecord(result,'tipos_habitacion').raw.camas_configuradas,result.camas_configuradas);
});
test('room types without bed associations display a clear empty state',()=>{
  for(const camas of [[],null,undefined]){
    const result=roomCatalogRecord({id:1,camas});
    assert.equal(result.camas_configuradas,'Sin camas configuradas');
    assert.deepEqual(result.cama_ids,[]);
  }
});
test('inactive configured beds remain visible to administrators',()=>{
  const result=roomCatalogRecord({camas:[{tipo_cama_id:10,tipo_cama:{nombre:'King',activo:false}}]});
  assert.equal(result.camas_configuradas,'King (inactiva)');
  assert.deepEqual(result.cama_ids,[10]);
});
test('missing bed labels do not expose database IDs',()=>{
  const result=roomCatalogRecord({camas:[{tipo_cama_id:123,tipo_cama:null}]});
  assert.equal(result.camas_configuradas,'Tipo de cama no disponible');
});
test('configured beds column is scoped to the room type catalog',()=>{
  assert.deepEqual(catalogDefinition('tipos_habitacion').columns,[{key:'camas_configuradas',label:'Camas configuradas',detailsKey:'camas_detalle'}]);
  assert.deepEqual(catalogDefinition('tipos_cama').columns,[]);
  assert.deepEqual(catalogDefinition('idiomas').columns,[]);
});
