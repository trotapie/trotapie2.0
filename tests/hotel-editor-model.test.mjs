import test from 'node:test';
import assert from 'node:assert/strict';
import {hotelEditorDraft,hotelDetailPayload,hotelDraftValidation,hotelIds,hotelContentValue,setHotelContentValue} from '../src/app/features/hotels/models/hotel-editor-model.ts';

const detail=()=>({
  id:10,nombre_hotel:'Hotel Playa',descripcion:'Junto al mar',catalogo_destino_id:5,regimen_id:2,
  descuento_id:3,regimen_ids:[4],actividad_ids:[7,8],tipos_habitacion_ids:[11,12],
  // Effective public schedules must not become hotel-specific overrides on save.
  horarios:{check_in_desde:'15:00',check_out:'12:00'},horarios_configurados:{check_in_desde:'16:00'},
  imagenes:[{id:20,url_imagen:'https://example.com/a.jpg',tipo_imagen_id:6}],
  traducciones:[{idioma_id:1,nombre_hotel:'Hotel Playa',descripcion:'Junto al mar',plan_todo_incluido:{descripcion:'Alimentos'}},
    {idioma_id:2,nombre_hotel:'Beach Hotel',descripcion:'By the sea',plan_todo_incluido:{descripcion:'Meals'}},
    {idioma_id:99,nombre_hotel:'Otro idioma',descripcion:'Conservar',plan_todo_incluido:null}],
});

test('hotel draft retains all relationship IDs including primary regime and untranslated activities',()=>{
  const draft=hotelEditorDraft(detail());
  assert.deepEqual(draft.regimeIds,[4,2]);
  assert.deepEqual(draft.activityIds,[7,8]);
  assert.deepEqual(draft.roomTypeIds,[11,12]);
  assert.equal(draft.descuento_id,3);
});

test('editing a draft does not mutate loaded translations or schedules',()=>{
  const original=detail();const draft=hotelEditorDraft(original);
  draft.horarios.check_in_desde='17:00';draft.traducciones[1].plan_todo_incluido.descripcion='Updated';
  assert.equal(original.horarios_configurados.check_in_desde,'16:00');
  assert.equal(original.traducciones[1].plan_todo_incluido.descripcion,'Meals');
});

test('save preserves existing relationships, photo classification IDs and every language',()=>{
  const payload=hotelDetailPayload(hotelEditorDraft(detail()));
  assert.deepEqual(payload.regimen_ids,[4,2]);
  assert.deepEqual(payload.actividad_ids,[7,8]);assert.deepEqual(payload.room_type_ids,[11,12]);
  assert.deepEqual(payload.imagenes,[{id:20,url_imagen:'https://example.com/a.jpg',tipo_imagen_id:6}]);
  assert.deepEqual(payload.traducciones.find(t=>t.idioma_id===99),detail().traducciones[2]);
  assert.equal(payload.descuento_id,3);
});

test('updated Spanish plan and manual translations are sent with their correct language IDs',()=>{
  const draft=hotelEditorDraft(detail());draft.planDescripcion=' Bebidas y alimentos ';
  draft.traducciones[1].nombre_hotel='New name';draft.traducciones[1].plan_todo_incluido={descripcion:'All meals'};
  const payload=hotelDetailPayload(draft);
  assert.deepEqual(payload.traducciones.find(t=>t.idioma_id===1).plan_todo_incluido,{descripcion:'Bebidas y alimentos'});
  assert.equal(payload.traducciones.find(t=>t.idioma_id===2).nombre_hotel,'New name');
  assert.deepEqual(payload.traducciones.find(t=>t.idioma_id===2).plan_todo_incluido,{descripcion:'All meals'});
});

test('Spanish plan may be explicitly removed without losing another language',()=>{
  const draft=hotelEditorDraft(detail());draft.planDescripcion='';
  const payload=hotelDetailPayload(draft);
  assert.equal(payload.traducciones.find(t=>t.idioma_id===1).plan_todo_incluido,null);
  assert.equal(payload.traducciones.find(t=>t.idioma_id===2).plan_todo_incluido.descripcion,'Meals');
});

test('inherited general schedules are not persisted as hotel overrides',()=>{
  const draft=hotelEditorDraft(detail());
  assert.deepEqual(hotelDetailPayload(draft).horarios,{check_in_desde:'16:00'});
  assert.equal(hotelDetailPayload(hotelEditorDraft({...detail(),horarios_configurados:null})).horarios,null);
  draft.horarios.check_in_desde='';assert.equal(hotelDetailPayload(draft).horarios,null);
});

test('selected relationships and discount may be explicitly cleared',()=>{
  const draft=hotelEditorDraft(detail());draft.regimeIds=[];draft.regimen_id=null;draft.activityIds=[];draft.roomTypeIds=[];draft.descuento_id='';
  assert.equal(hotelDraftValidation(draft),'');
  const payload=hotelDetailPayload(draft);
  assert.deepEqual(payload.regimen_ids,[]);assert.deepEqual(payload.actividad_ids,[]);assert.deepEqual(payload.room_type_ids,[]);assert.equal(payload.descuento_id,null);
});

test('primary regime must be included in the available regimes',()=>{
  assert.match(hotelDraftValidation({...hotelEditorDraft(detail()),regimeIds:[4]}),/principal/);
  assert.equal(hotelDraftValidation(hotelEditorDraft(detail())),'');
});

test('the existing compact creation form can still choose a single primary regime',()=>{
  const model={nombre_hotel:'Nuevo hotel',regimen_id:4};
  assert.equal(hotelDraftValidation(model),'');
  assert.deepEqual(hotelDetailPayload(model).regimen_ids,[4]);
});

test('invalid times are rejected before save',()=>{
  const draft=hotelEditorDraft(detail());draft.horarios.check_out='25:00';
  assert.match(hotelDraftValidation(draft),/horario/);
  draft.horarios.check_out='00:00';assert.equal(hotelDraftValidation(draft),'');
});

test('IDs are numeric, deduplicated and positive',()=>{
  assert.deepEqual(hotelIds(['2',2,4,null,0,-1,'invalid',1.5]),[2,4]);
});

test('language switching reads independent drafts and never replaces another language',()=>{
  const original=hotelEditorDraft(detail());
  let draft=setHotelContentValue(original,2,'nombre_hotel','English draft');
  draft=setHotelContentValue(draft,1,'nombre_hotel','Nombre español');
  draft=setHotelContentValue(draft,2,'descripcion','New description');
  draft=setHotelContentValue(draft,2,'plan_todo_incluido','New plan');
  assert.equal(hotelContentValue(draft,1,'nombre_hotel'),'Nombre español');
  assert.equal(hotelContentValue(draft,2,'nombre_hotel'),'English draft');
  assert.equal(hotelContentValue(draft,1,'descripcion'),'Junto al mar');
  assert.equal(hotelContentValue(draft,2,'descripcion'),'New description');
  assert.equal(hotelContentValue(draft,1,'plan_todo_incluido'),'Alimentos');
  assert.equal(hotelContentValue(draft,2,'plan_todo_incluido'),'New plan');
  assert.equal(hotelContentValue(original,2,'nombre_hotel'),'Beach Hotel');
  assert.equal(hotelContentValue(original,2,'plan_todo_incluido'),'Meals');
});

test('a new language starts blank and its translated plan is saved even without a translated name',()=>{
  const original=hotelEditorDraft(detail());
  assert.equal(hotelContentValue(original,5,'nombre_hotel'),'');
  const draft=setHotelContentValue(original,5,'plan_todo_incluido','Nouveau plan');
  const payload=hotelDetailPayload(draft);
  assert.deepEqual(payload.traducciones.find(item=>item.idioma_id===5),{idioma_id:5,nombre_hotel:'Hotel Playa',plan_todo_incluido:{descripcion:'Nouveau plan'}});
  assert.equal(original.traducciones.length,3);
});

test('editing the Spanish plan through the inline content selector updates the Spanish payload',()=>{
  const draft=setHotelContentValue(hotelEditorDraft(detail()),1,'plan_todo_incluido','Plan actualizado');
  assert.equal(hotelContentValue(draft,1,'plan_todo_incluido'),'Plan actualizado');
  assert.equal(hotelDetailPayload(draft).traducciones.find(item=>item.idioma_id===1).plan_todo_incluido.descripcion,'Plan actualizado');
});

test('removed saved photos remain explicit deletions and new URLs are deduplicated',()=>{
  const draft=hotelEditorDraft(detail());draft.galleryUrls='https://example.com/new.jpg\nhttps://example.com/new.jpg';
  const payload=hotelDetailPayload(draft);
  assert.deepEqual(payload.imagenes,[{id:null,url_imagen:'https://example.com/new.jpg',tipo_imagen_id:null},{...detail().imagenes[0],eliminar:true}]);
});
