import {test} from 'node:test';
import assert from 'node:assert/strict';
import {availableQuickFactTypes, appendQuickFact} from '../src/app/features/destinations/utils/quick-facts.ts';

const climate = {id: 1, clave: 'clima', nombre: 'Clima', icono: null, tipo_valor: 'texto'};
const airport = {id: 2, clave: 'aeropuerto', nombre: 'Aeropuerto', icono: null, tipo_valor: 'texto'};
function model() {
  return {idiomas: [{id: 1, codigo: 'es'}, {id: 2, codigo: 'en'}],
    catalogo_tipos_dato_rapido: [climate, airport, airport],
    detalles_rapidos: [{id: 10, tipo_dato_rapido_id: 1, orden: 5, valores: {1: 'Cálido', 2: 'Warm'}}]};
}

test('only offers unused catalog types without duplicates', () => {
  assert.deepEqual(availableQuickFactTypes(model()), [airport]);
});

test('appends a fact locally without modifying existing values or source model', () => {
  const source = model(), snapshot = structuredClone(source);
  const result = appendQuickFact(source, 2, 1, '  ACA a 25 min  ');
  assert.deepEqual(source, snapshot);
  assert.deepEqual(result.detalles_rapidos[0], source.detalles_rapidos[0]);
  assert.deepEqual(result.detalles_rapidos[1], {id: -1, activo: true, tipo_dato_rapido_id: 2,
    clave: 'aeropuerto', nombre: 'Aeropuerto', icono: null, tipo_valor: 'texto', orden: 6,
    valores: {1: 'ACA a 25 min', 2: ''}});
  assert.deepEqual(availableQuickFactTypes(result), []);
});

test('new local facts have distinct IDs and preserve the selected language', () => {
  const source = {...model(), detalles_rapidos: []};
  const first = appendQuickFact(source, 1, 1, 'Cálido');
  const second = appendQuickFact(first, 2, 2, '25 minutes');
  assert.deepEqual(second.detalles_rapidos.map(fact => fact.id), [-1, -2]);
  assert.deepEqual(second.detalles_rapidos[1].valores, {1: '', 2: '25 minutes'});
});

test('rejects duplicate or unknown types, empty values and invalid languages', () => {
  assert.throws(() => appendQuickFact(model(), 1, 1, 'Dato'), /tipo disponible/);
  assert.throws(() => appendQuickFact(model(), 99, 1, 'Dato'), /tipo disponible/);
  assert.throws(() => appendQuickFact(model(), 2, 1, '  '), /Escribe el valor/);
  assert.throws(() => appendQuickFact(model(), 2, 99, 'Dato'), /idioma válido/);
});
