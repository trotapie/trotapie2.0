import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteTariffRooms,quoteTariffPayload,quoteTariffTotal,quoteTariffValidation} from '../src/app/features/quotations/models/quote-tariffs.ts';

test('loads legacy prices and prepares each requested room without copying the first price',()=>{
  const quote={habitaciones:{es:'2 habitaciones'},tipo_habitacion:7,precios:[{tipo:'sin_seguro',precio:1250,condiciones:[{id:1,descripcion:'No reembolsable'}]},{tipo:'con_seguro',precio:1500,condiciones:[]},{tipo:'a_meses',precio:1800,condiciones:[{id:2,tipoPoliticas:'apartado'}]}]};
  const rooms=quoteTariffRooms(quote);
  assert.equal(rooms.length,2);
  assert.equal(rooms[0].precio,1250);
  assert.equal(rooms[0].precioConSeguro,1500);
  assert.equal(rooms[0].precioMeses,1800);
  assert.equal(rooms[0].tipoHabitacion.id,7);
  assert.equal(rooms[0].tipoTarifa,'apartado');
  assert.equal(rooms[1].precio,null);
  rooms[0].condicionesPrecioSinSeguro[0].descripcion='Changed';
  assert.equal(quote.precios[0].condiciones[0].descripcion,'No reembolsable');
});

test('round trips independent prices, room types, origins and policies through the RPC JSON format',()=>{
  const quote={precios:[{tipo:'sin_seguro',precio:99999}],cotizacion_multiple:JSON.stringify([
    {tipo_habitacion_id:1,tipo_habitacion_id_con_seguro:2,tipo_habitacion_id_a_meses:3,precio:1000,precio_con_seguro:1200,precio_a_meses:1400,origen_reservacion_precio_id:11,origen_reservacion_con_seguro_id:12,origen_reservacion_meses_id:13,porcentaje_seguro:20,porcentaje_meses:25,condiciones_precio:[{id:4,descripcion:'Final',custom:'preserved'}],condiciones_precio_seguro:[{id:5,descripcion:'Apartado'}],condiciones_precio_meses:[{id:6,descripcion:'Meses',tipoPoliticas:'apartado'}],tipo_tarifa:'apartado',custom_metadata:'keep'},
    {tipo_habitacion_id:8,precio:2000,precio_con_seguro:2500,precio_a_meses:2800,origen_reservacion_precio_id:21,origen_reservacion_con_seguro_id:22,origen_reservacion_meses_id:23,porcentaje_seguro:30,porcentaje_meses:35,condiciones_precio_seguro:[{id:7,descripcion:'Otra política'}]}
  ])};
  const rooms=quoteTariffRooms(quote);
  assert.equal(rooms[0].precio,1000);
  rooms[1].precioConSeguro=2600;
  const payload=quoteTariffPayload(rooms,{estatus:'enviada',tipoTarifa:'apartado',fechaLimiteSeguro:'2026-12-01T18:30:00',fechaLimiteMeses:'2026-12-03'});
  assert.equal(payload.estatus,'enviada');
  assert.equal(payload.precio,1000);
  assert.equal(payload.cotizacionMultiple[1].precio_con_seguro,2600);
  assert.equal(payload.cotizacionMultiple[0].tipo_habitacion_id_a_meses,3);
  assert.equal(payload.cotizacionMultiple[1].origen_reservacion_con_seguro_id,22);
  assert.equal(payload.cotizacionMultiple[0].custom_metadata,'keep');
  assert.equal(payload.cotizacionMultiple[1].condiciones_precio[0].custom,'preserved');
  assert.equal(payload.cotizacionMultiple[1].condiciones_precio_seguro[0].id,7);
  assert.equal(payload.cotizacionMultiple[0].condiciones_precio_meses[0].tipoPoliticas,'apartado');
  const reloaded=quoteTariffRooms({cotizacion_multiple:payload.cotizacionMultiple});
  assert.equal(quoteTariffTotal(reloaded,'precio'),3000);
  assert.equal(quoteTariffTotal(reloaded,'precioConSeguro'),3800);
  assert.equal(quoteTariffTotal(reloaded,'precioMeses'),4200);
  assert.equal(reloaded[1].tipoHabitacion.id,8);
});

test('blank prices stay absent, zero is preserved and invalid prices or percentages are rejected',()=>{
  const rooms=quoteTariffRooms({precio:0,precio_con_seguro:null});
  assert.equal(quoteTariffTotal(rooms,'precio'),0);
  assert.equal(quoteTariffTotal(rooms,'precioConSeguro'),null);
  assert.equal(quoteTariffValidation(rooms),'');
  assert.equal(quoteTariffPayload(rooms,{}).cotizacionMultiple[0].precio,0);
  rooms[0].precio=-1;
  assert.match(quoteTariffValidation(rooms),/precio/);
  rooms[0].precio=10;
  rooms[0].porcentajeSeguro=101;
  assert.match(quoteTariffValidation(rooms),/0 y 100/);
});

test('non refundable monthly pricing clears the obsolete deadline and updates policy type',()=>{
  const rooms=quoteTariffRooms({precio_a_meses:2000,condiciones_precio_meses:[{id:1,descripcion:'Policy',tipoPoliticas:'apartado'}]});
  const payload=quoteTariffPayload(rooms,{tipoTarifa:'no_reembolsable',fechaLimiteMeses:'2026-12-01'});
  assert.equal(payload.fechaLimiteMeses,null);
  assert.equal(payload.cotizacionMultiple[0].fecha_limite_meses,null);
  assert.equal(payload.cotizacionMultiple[0].condiciones_precio_meses[0].tipoPoliticas,'no_reembolsable');
});

test('detects numbered rooms and their occupants from the original request text',()=>{
  const rooms=quoteTariffRooms({habitaciones:{es:'Habitación 1: 2 adultos · 1 niño\nHabitación 2: 3 adultos'},precio:1500});
  assert.equal(rooms.length,2);
  assert.equal(rooms[0].detalle,'2 adultos · 1 niño');
  assert.equal(rooms[1].detalle,'3 adultos');
  assert.equal(rooms[1].precio,null);
});
