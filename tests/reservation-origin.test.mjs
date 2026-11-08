import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogDefinition} from '../src/app/features/catalogs/models/catalog-definitions.ts';
import {origenReservacionPayload} from '../src/app/data/queries/origen-reservacion-payload.ts';

test('reservation origin form uses the database fields and requires both texts',()=>{
  const fields=catalogDefinition('origen_reservacion').fields;
  assert.deepEqual(fields.map(field=>field.key),['clave','nombre_cotizador','estatus']);
  assert.equal(fields.find(field=>field.key==='clave').required,true);
  assert.equal(fields.find(field=>field.key==='nombre_cotizador').required,true);
});

test('reservation origin rejects null, missing and whitespace-only required values',()=>{
  for(const value of [null,undefined,'','   ']){
    assert.throws(()=>origenReservacionPayload({clave:value,nombre_cotizador:'Directo'}),/clave.*obligatoria/);
    assert.throws(()=>origenReservacionPayload({clave:'DIRECTO',nombre_cotizador:value}),/nombre.*obligatorio/);
  }
});

test('reservation origin trims the values used for creation and editing',()=>{
  assert.deepEqual(origenReservacionPayload({clave:' DIRECTO ',nombre_cotizador:' Venta directa '}),{
    clave:'DIRECTO',nombre_cotizador:'Venta directa'
  });
});
