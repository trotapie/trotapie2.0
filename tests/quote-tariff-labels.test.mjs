import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteRoomTypeName,quoteOriginName} from '../src/app/features/quotations/models/quote-tariff-labels.ts';

test('shows the actual room type and origin key rather than catalog IDs',()=>{
  const room={tipoHabitacion:{id:15},origenReservacionPrecio:1};
  assert.equal(quoteRoomTypeName(room,'tipoHabitacion',[{id:15,nombre_habitacion:'Junior Suite'}]),'Junior Suite');
  assert.equal(quoteOriginName(room,'origenReservacionPrecio',[{id:1,clave:'PB',nombre_cotizador:'Reserva directa'}]),'PB');
});

test('each tariff resolves its own type and origin, including inactive saved values',()=>{
  const room={tipoHabitacion:{id:15},tipoHabitacionConSeguro:{id:20},origenReservacionConSeguro:2};
  const types=[{id:15,nombre_habitacion:'Estándar'},{id:20,nombre_habitacion:'Suite',activo:false}];
  assert.equal(quoteRoomTypeName(room,'tipoHabitacionConSeguro',types,{nombre_habitacion:'Estándar'}),'Suite');
  assert.equal(quoteOriginName(room,'origenReservacionConSeguro',[{id:2,clave:'Agencia',estatus:false}]),'Agencia');
});

test('missing labels never expose internal IDs or another tariff room name',()=>{
  const room={tipoHabitacionConSeguro:{id:20},origenReservacionConSeguro:99,source:{tipo_habitacion_id:15,nombre_habitacion:'Estándar'}};
  assert.equal(quoteRoomTypeName(room,'tipoHabitacionConSeguro',[],{nombre_habitacion:'Estándar'}),'Por confirmar');
  assert.equal(quoteOriginName(room,'origenReservacionConSeguro',[]),'Por confirmar');
});

test('uses embedded saved names when the catalog is unavailable',()=>{
  const room={tipoHabitacion:{id:15},origenReservacionPrecio:1,source:{tipoHabitacion:{id:15,nombre_habitacion:'Vista al mar'},origenReservacionPrecio:{nombre_cotizador:'Mayorista'}}};
  assert.equal(quoteRoomTypeName(room,'tipoHabitacion',[]),'Vista al mar');
  assert.equal(quoteOriginName(room,'origenReservacionPrecio',[]),'Mayorista');
});
