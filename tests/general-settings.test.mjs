import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {HOTEL_TIME_FIELDS} from '../src/app/features/hotels/models/hotel-editor-model.ts';
import {normalizarHorarios,resolverHorarios} from '../src/app/data/models/hotel-estancia.interface.ts';
import {parseTemplate} from '@angular/compiler';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const classCode=(path,name)=>ts.transpile(source(path).slice(source(path).indexOf('export class '+name)).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
const signal=initial=>{let value=initial;return Object.assign(()=>value,{set:next=>value=next});};

function editor({allowed=true,loadError=false,saveError=false,hotelLoadError=false,hotelSaveError=false}={}){
  const writes=[];
  const hotelWrites=[];
  const settings={load:async()=>{if(loadError)throw new Error('No disponible');return {maxRooms:8,maxPeoplePerRoom:8};},save:async value=>{writes.push(value);if(saveError)throw new Error('Sin permiso');return value;}};
  const hotels={load:async()=>{if(hotelLoadError)throw new Error('Horarios no disponibles');return {check_in_desde:'15:00',check_out:'12:00'};},save:async value=>{hotelWrites.push(value);if(hotelSaveError)throw new Error('Error al guardar horarios');return normalizarHorarios(value)||{};}};
  const dependencies=[settings,{hasPermission:()=>allowed},{success:()=>{}},hotels];
  const code=classCode('src/app/features/configuration/general-settings/general-settings.ts','GeneralSettings');
  const Editor=new Function('inject','signal','computed','protectUnsavedChanges','QuoteSettingsService','AuthService','TpToastService','HotelSettingsService','HOTEL_TIME_FIELDS',`${code};return GeneralSettings;`)(()=>dependencies.shift(),signal,fn=>fn,(dirty,busy)=>({sync(){},confirm:()=>!busy()&&!dirty()}),null,null,null,null,HOTEL_TIME_FIELDS);
  return {page:new Editor(),writes,hotelWrites};
}

test('general settings loads, saves both limits and clears the pending state',async()=>{
  const {page,writes}=editor();
  await page.load();
  assert.equal(page.maxRooms(),8);
  assert.equal(page.dirty(),false);
  page.maxRooms.set(10);page.maxPeoplePerRoom.set(12);
  assert.equal(page.canDeactivate(),false);
  await page.save();
  assert.deepEqual(writes,[{maxRooms:10,maxPeoplePerRoom:12}]);
  assert.equal(page.dirty(),false);
  assert.equal(page.canDeactivate(),true);
});

test('general settings rejects invalid values and unauthorized writes',async()=>{
  for(const value of [null,0,-1,1.5,NaN,Infinity,2147483648]){
    const {page,writes}=editor();await page.load();page.maxRooms.set(value);
    assert.equal(page.valid(),false);await page.save();assert.equal(writes.length,0);
  }
  const {page,writes}=editor({allowed:false});await page.load();page.maxRooms.set(10);await page.save();
  assert.equal(writes.length,0);
});

test('failed saves retain the draft for retry and discard restores the saved values',async()=>{
  const {page}=editor({saveError:true});await page.load();page.maxRooms.set(4);await page.save();
  assert.equal(page.error(),'Sin permiso');assert.equal(page.dirty(),true);assert.equal(page.maxRooms(),4);
  page.reset();assert.equal(page.maxRooms(),8);assert.equal(page.dirty(),false);assert.equal(page.error(),'');
});

test('failed loads cannot save uninitialized settings',async()=>{
  const {page,writes}=editor({loadError:true});await page.load();
  assert.equal(page.saved(),null);assert.equal(page.loading(),false);assert.equal(page.error(),'No disponible');
  await page.save();assert.equal(writes.length,0);
});

test('settings service updates only the singleton and rejects invalid values before calling the database',async()=>{
  const calls=[];
  const query={update(value){calls.push(['update',value]);return this;},eq(...args){calls.push(['eq',...args]);return this;},select(){return this;},single:async()=>({data:{max_habitaciones:10,max_personas_por_habitacion:12},error:null})};
  const backend={client:{from(table){calls.push(['from',table]);return query;}}};
  const code=classCode('src/app/features/quotations/services/quote-settings.service.ts','QuoteSettingsService');
  const Service=new Function('inject','ClientService',`${code};return QuoteSettingsService;`)(()=>backend,null);
  const service=new Service();
  await assert.rejects(service.save({maxRooms:0,maxPeoplePerRoom:8}));assert.equal(calls.length,0);
  assert.deepEqual(await service.save({maxRooms:10,maxPeoplePerRoom:12}),{maxRooms:10,maxPeoplePerRoom:12});
  assert.deepEqual(calls,[['from','configuracion_cotizaciones'],['update',{max_habitaciones:10,max_personas_por_habitacion:12}],['eq','id',1]]);
  query.single=async()=>({data:null,error:{code:'42501'}});
  await assert.rejects(service.save({maxRooms:10,maxPeoplePerRoom:12}),/No pudimos guardar/);
});

test('configuration management is admin-only even if another role claims the permission',()=>{
  const authSource=source('src/app/core/services/auth.service.ts');
  const code=ts.transpile(authSource.slice(authSource.indexOf('export class AuthService'),authSource.indexOf('export const authGuard')).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
  const Auth=new Function('inject','signal','ClientService','Router',`${code};return AuthService;`)(()=>({}),signal,null,null);
  const auth=new Auth();
  auth.identity.set({role:'cotizador',permissions:['configuracion.manage','cotizaciones.view']});
  assert.equal(auth.hasPermission('configuracion.manage'),false);
  assert.equal(auth.hasPermission('cotizaciones.view'),true);
  auth.identity.set({role:'admin',permissions:[]});assert.equal(auth.hasPermission('configuracion.manage'),true);
});

test('hotel settings save independently, preserve drafts across sections and allow clearing defaults',async()=>{
  const {page,writes,hotelWrites}=editor();await page.load();
  page.maxRooms.set(10);
  page.tab.set('hotels');page.setHour('check_in_desde','16:00');
  assert.equal(page.canDeactivate(),false);
  await page.save();
  assert.deepEqual(hotelWrites,[{check_in_desde:'16:00',check_out:'12:00'}]);
  assert.deepEqual(writes,[]);
  assert.equal(page.hotelDirty(),false);assert.equal(page.dirty(),true);
  assert.equal(page.maxRooms(),10);
  page.tab.set('quotes');await page.save();assert.equal(page.dirty(),false);
  page.tab.set('hotels');page.setHour('check_in_desde','');page.setHour('check_out','');
  await page.save();assert.deepEqual(page.savedHours(),{});assert.equal(page.dirty(),false);
});

test('hotel save failure retains draft and discard restores only the active section',async()=>{
  const {page}=editor({hotelSaveError:true});await page.load();
  page.maxRooms.set(10);page.tab.set('hotels');page.setHour('check_out','11:00');
  await page.save();
  assert.equal(page.hotelError(),'Error al guardar horarios');assert.equal(page.hotelDirty(),true);
  page.reset();assert.equal(page.hours().check_out,'12:00');assert.equal(page.maxRooms(),10);
  assert.equal(page.hotelError(),'');assert.equal(page.dirty(),true);
});

test('hotel failures do not block quote settings and retries preserve other drafts',async()=>{
  const {page,writes}=editor({hotelLoadError:true});await page.load();
  assert.equal(page.savedHours(),null);assert.equal(page.hotelError(),'Horarios no disponibles');
  page.maxRooms.set(10);await page.load();assert.equal(page.maxRooms(),10);
  await page.save();assert.equal(writes.length,1);
});

test('hotel settings reject malformed times and unauthorized saves',async()=>{
  for(const value of ['25:00','12:60','9:00','invalid']){
    const {page,hotelWrites}=editor();await page.load();page.tab.set('hotels');page.setHour('check_out',value);
    assert.equal(page.activeValid(),false);await page.save();assert.equal(hotelWrites.length,0);
  }
  const {page,hotelWrites}=editor({allowed:false});await page.load();page.tab.set('hotels');page.setHour('check_out','11:00');
  await page.save();assert.equal(hotelWrites.length,0);
});

test('hotel service updates only general hours, preserves texts and writes null when cleared',async()=>{
  const calls=[];
  let stored={check_in_desde:'15:00'};
  const query={update(value){calls.push(['update',value]);stored=value.horarios;return this;},eq(...args){calls.push(['eq',...args]);return this;},select(){return this;},single:async()=>({data:{horarios:stored},error:null})};
  const backend={client:{from(table){calls.push(['from',table]);return query;}}};
  const code=classCode('src/app/features/configuration/services/hotel-settings.service.ts','HotelSettingsService');
  const Service=new Function('inject','ClientService','normalizarHorarios',`${code};return HotelSettingsService;`)(()=>backend,null,normalizarHorarios);
  const service=new Service();
  assert.deepEqual(await service.load(),{check_in_desde:'15:00'});
  calls.length=0;
  await assert.rejects(service.save({check_out:'29:00'}));assert.equal(calls.length,0);
  assert.deepEqual(await service.save({check_out:'11:00'}),{check_out:'11:00'});
  assert.deepEqual(calls,[['from','configuracion_hoteles'],['update',{horarios:{check_out:'11:00'}}],['eq','id',1]]);
  await service.save({check_out:''});assert.equal(stored,null);
  query.single=async()=>({data:null,error:{code:'42501'}});
  await assert.rejects(service.save({check_out:'11:00'}),/No pudimos guardar/);
});

test('hotel overrides take priority per field without losing other general defaults',()=>{
  assert.deepEqual(resolverHorarios({check_in_desde:'16:00'},{check_in_desde:'15:00',check_out:'12:00'}),{check_in_desde:'16:00',check_out:'12:00'});
});

test('general settings template has destination-style sections without a content language selector',()=>{
  const template=source('src/app/features/configuration/general-settings/general-settings.html');
  assert.equal(parseTemplate(template,'general-settings.html').errors,null);
  assert.match(template,/settings-header-actions/);assert.match(template,/settings-tabs/);
  assert.doesNotMatch(template,/tp-language-menu|Idioma del contenido/);
});
