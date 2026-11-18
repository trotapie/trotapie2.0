import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogDefinition} from '../src/app/features/catalogs/models/catalog-definitions.ts';
import {hotelRegimeDetails} from '../src/app/data/utils/hotel-regime-details.ts';

const inclusive={
  id:4, descripcion:'Todo Incluido', icono_svg:'<svg/>', muestra_plan_todo_incluido:true,
  traducciones:[
    {idioma_id:1, descripcion:'Todo Incluido', descripcion_general:'Incluye alojamiento y comidas.'},
    {idioma_id:2, descripcion:'All Inclusive', descripcion_general:'Includes accommodation and meals.'},
  ],
};
const breakfast={
  id:2, descripcion:'Alojamiento + Desayunos',
  traducciones:[
    {idioma_id:1, descripcion:'Alojamiento + Desayunos', descripcion_general:'Incluye desayuno.'},
    {idioma_id:2, descripcion:'Bed and Breakfast', descripcion_general:' '},
  ],
};

test('public details include added regimes, with the primary first and no duplicates',()=>{
  assert.deepEqual(hotelRegimeDetails(inclusive,[breakfast,inclusive,null],2),[
    {id:4,descripcion:'All Inclusive',descripcion_general:'Includes accommodation and meals.',icono_svg:'<svg/>',muestra_plan_todo_incluido:true},
    {id:2,descripcion:'Bed and Breakfast',descripcion_general:'Incluye desayuno.',icono_svg:null,muestra_plan_todo_incluido:false},
  ]);
  assert.deepEqual(hotelRegimeDetails(inclusive,[],1).map(r=>r.id),[4]);
  assert.deepEqual(hotelRegimeDetails(breakfast,[inclusive,breakfast],2).map(r=>r.id),[2,4]);
});

test('hotels without a primary still show their assigned regimes, even without descriptions',()=>{
  assert.deepEqual(hotelRegimeDetails(null,[{id:6,descripcion:'Solo hospedaje'},breakfast],3).map(
    ({id,descripcion,descripcion_general})=>[id,descripcion,descripcion_general],
  ),[[2,'Alojamiento + Desayunos','Incluye desayuno.'],[6,'Solo hospedaje','']]);
  assert.deepEqual(hotelRegimeDetails(null,[],1),[]);
});

test('regime catalog offers SVG preview and truncates the general description column',()=>{
  const catalog=catalogDefinition('regimen_hotel');
  assert.deepEqual(catalog.fields.map(field=>field.key),['descripcion','icono_svg','descripcion_general']);
  assert.equal(catalog.fields.find(field=>field.key==='icono_svg').svgPreview,true);
  assert.deepEqual(catalog.columns,[{key:'descripcion_general',label:'Descripción general',truncate:true}]);
});
