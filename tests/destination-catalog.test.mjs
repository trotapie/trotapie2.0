import {test} from 'node:test';
import assert from 'node:assert/strict';
import {destinationCatalogPayload,destinationSlug} from '../src/app/features/destinations/models/destination-catalog-payload.ts';

test('destination creation and editing share the current catalog fields without legacy geography',()=>{
  const payload=destinationCatalogPayload({nombre:' Mazatlán ',division_area_id:'4',tipo_turistico_id:'2',orden:'3',prioridad:'1',imagen_destino:' https://example.com/beach.jpg ',activo:false,tipo_desino_id:1,continente_id:5,destino_padre_id:8});
  assert.deepEqual(payload,{nombre:'Mazatlán',division_area_id:4,tipo_turistico_id:2,orden:3,prioridad:1,imagen_destino:'https://example.com/beach.jpg',activo:false});
  assert.equal(destinationSlug(payload.nombre),'mazatlan');
  assert.equal(destinationSlug(' San José del Cabo! '),'san-jose-del-cabo');
});

test('optional classification and photo can remain empty',()=>{
  const payload=destinationCatalogPayload({nombre:'Bali',division_area_id:9});
  assert.equal(payload.tipo_turistico_id,null);
  assert.equal(payload.imagen_destino,null);
  assert.equal(payload.orden,0);
  assert.equal(payload.prioridad,2);
  assert.equal(payload.activo,true);
});

test('rejects a missing location, blank name or invalid presentation order',()=>{
  for(const value of [{nombre:'Bali'},{nombre:' ',division_area_id:1},{nombre:'Bali',division_area_id:1,orden:-1},{nombre:'Bali',division_area_id:1,orden:1.5}]){
    assert.throws(()=>destinationCatalogPayload(value));
  }
});
