import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/app/app.ts',import.meta.url),'utf8');
const code=ts.transpile(source.slice(source.indexOf('export class App')).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
const documentToken=Symbol('DOCUMENT');
const loadingToken=Symbol('ScreenLoadingService');
const createApp=document=>{
  const App=new Function('inject','DOCUMENT','ScreenLoadingService',`${code};return App;`)(token=>token===documentToken?document:{},documentToken,loadingToken);
  return new App();
};

test('test environment banner is enabled on dev and the local preview only',()=>{
  assert.equal(createApp({location:{hostname:'trotapie-dev.vercel.app'}}).isTestEnvironment,true);
  assert.equal(createApp({location:{hostname:'localhost',port:'4307'}}).isTestEnvironment,true);
  assert.equal(createApp({location:{hostname:'localhost',port:'4200'}}).isTestEnvironment,false);
  for(const hostname of ['trotapie.com','www.trotapie.com','localhost','trotapie.vercel.app','preview.vercel.app','trotapie-dev.vercel.app.example.com']){
    assert.equal(createApp({location:{hostname}}).isTestEnvironment,false,hostname);
  }
  assert.equal(createApp({}).isTestEnvironment,false);
});

test('global template shows the warning conditionally before routed content',()=>{
  const template=readFileSync(new URL('../src/app/app.html',import.meta.url),'utf8');
  assert.match(template,/@if\(isTestEnvironment\)/);
  assert.match(template,/AMBIENTE DE PRUEBAS/);
  assert.match(template,/Los cambios en producción no se reflejan aquí\./);
  assert.ok(template.indexOf('AMBIENTE DE PRUEBAS')<template.indexOf('<router-outlet'));
});
