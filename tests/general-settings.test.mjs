import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const classCode=(path,name)=>ts.transpile(source(path).slice(source(path).indexOf('export class '+name)).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
const signal=initial=>{let value=initial;return Object.assign(()=>value,{set:next=>value=next});};

function editor({allowed=true,loadError=false,saveError=false}={}){
  const writes=[];
  const settings={load:async()=>{if(loadError)throw new Error('No disponible');return {maxRooms:8,maxPeoplePerRoom:8};},save:async value=>{writes.push(value);if(saveError)throw new Error('Sin permiso');return value;}};
  const dependencies=[settings,{hasPermission:()=>allowed},{success:()=>{}}];
  const code=classCode('src/app/features/configuration/general-settings/general-settings.ts','GeneralSettings');
  const Editor=new Function('inject','signal','computed','protectUnsavedChanges','QuoteSettingsService','AuthService','TpToastService',`${code};return GeneralSettings;`)(()=>dependencies.shift(),signal,fn=>fn,(dirty,busy)=>({sync(){},confirm:()=>!busy()&&!dirty()}),null,null,null);
  return {page:new Editor(),writes};
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
