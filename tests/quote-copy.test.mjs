import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {cleanCopy,changedCopy,mergeCopyTranslations,copyOverride,COPY_GROUPS} from '../supabase/functions/_shared/quote-copy.ts';
import {QueryCache} from '../src/app/core/utils/query-cache.ts';

test('quote copy uses stable, distinct keys and rejects variables and unknown fields',()=>{
  const fields=COPY_GROUPS.flatMap(group=>group.fields.map(field=>field.text));
  assert.equal(new Set(fields).size,fields.length);
  assert.throws(()=>cleanCopy({habitaciones:{titulo:'Suite {numero}'}}));
  assert.throws(()=>cleanCopy({cliente:{email:'Correo'}}));
  assert.throws(()=>cleanCopy({__proto__:null,constructor:{name:'x'}}));
  assert.equal(copyOverride(cleanCopy({habitaciones:{titulo:' Suite '}}),'Habitación'),'Suite');
  assert.equal(copyOverride({},'Habitación'),undefined);
});

test('publishing merges only changed translations and drops restored defaults',()=>{
  const previous={encabezado:{titulo:'Cotización nueva'},cliente:{telefono:'Teléfono de contacto',correo:'Email'}};
  const next={encabezado:{titulo:'Cotización nueva'},cliente:{telefono:'Teléfono móvil'}};
  const changed=changedCopy(previous,next);
  assert.deepEqual(changed,{cliente:{telefono:'Teléfono móvil'}});
  const english={encabezado:{titulo:'New quotation'},cliente:{telefono:'Contact number',correo:'Email'}};
  assert.throws(()=>mergeCopyTranslations(next,changed,english,{}));
  assert.deepEqual(mergeCopyTranslations(next,changed,english,{cliente:{telefono:'Mobile phone'}}),{
    encabezado:{titulo:'New quotation'},cliente:{telefono:'Mobile phone'},
  });
});

test('Google Apps Script translates a single nested batch without sending keys or repeating identical strings',()=>{
  const calls=[];
  const script=readFileSync(new URL('../scripts/google-apps-script/quote-translation.gs',import.meta.url),'utf8');
  const ctx=vm.createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test-secret'})},
    LanguageApp:{translate:(...args)=>{calls.push(args);return `${args[2]}:${args[0]}`;}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})},
  });
  vm.runInContext(script,ctx);
  const body={secreto:'test-secret',idiomaOrigen:'es',idiomasDestino:['en','fr','de','pt'],textos:{
    habitaciones:{titulo:'Suite'},resumen:{habitacion:'Suite'},cliente:{telefono:'Teléfono'},
  }};
  const post=value=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(value)}}));
  assert.deepEqual(post({...body,secreto:'incorrecto'}),{ok:false});
  assert.equal(calls.length,0);
  const response=post(body);
  assert.equal(response.ok,true);
  assert.equal(response.traducciones.en.habitaciones.titulo,'en:Suite');
  assert.equal(response.traducciones.fr.cliente.telefono,'fr:Teléfono');
  assert.equal(calls.length,8);
  assert.ok(calls.every(([text])=>['Suite','Teléfono'].includes(text)));
});

test('the reader deduplicates concurrent requests and refetches the active language',async()=>{
  const calls=[];
  const source=readFileSync(new URL('../src/app/features/quotations/services/quote-copy.service.ts',import.meta.url),'utf8');
  const code=ts.transpile(source.slice(source.indexOf('export class QuoteCopyService')).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
  const query={
    select(value){calls.push(['select',value]);return this;},
    eq(...args){calls.push(args);return this;},
    maybeSingle:async()=>({data:{textos:{cliente:{telefono:'Phone'}}}}),
  };
  const backend={
    cache:new QueryCache(),
    client:{
      from(table){calls.push(['from',table]);return query;},
      functions:{invoke:async(_, {body})=>({data:{...body,version:body.version+1}})},
    },
  };
  const Service=new Function('inject','ClientService','section','cachePrefix','COPY_LANGUAGES','FunctionsHttpError',`${code};return QuoteCopyService;`)(
    ()=>backend,null,'cotizacion','quote-copy:',['en','fr','de','pt'],class extends Error {},
  );
  const service=new Service();
  await Promise.all([service.loadLanguage('en'),service.loadLanguage('en')]);
  assert.deepEqual(calls,[['from','textos_configurables_traducciones'],['select','textos'],['seccion','cotizacion'],['idioma','en']]);
  await service.loadLanguage('en');
  assert.equal(calls.length,8);
  await service.save({version:1,textos:{}});
  await service.loadLanguage('es');
  assert.deepEqual(calls.slice(8),[['from','textos_configurables'],['select','textos'],['seccion','cotizacion']]);
});

test('public requests and admin quotes load the same published copy and retain their own defaults',async()=>{
  const source=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.ts',import.meta.url),'utf8');
  const template=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.html',import.meta.url),'utf8');
  const methods=source.slice(source.indexOf('  text(es:'),source.indexOf('  countText('));
  const getters=source.slice(source.indexOf('readonly copyPending='),source.indexOf('constructor(){'));
  const constructor=source.slice(source.indexOf('constructor(){'),source.indexOf('employeeOptions=computed'))
    .replace('constructor(){','constructor(state){Object.assign(this,state);');
  const code=ts.transpile(`class Editor {${getters}${constructor}${methods}}`,{target:ts.ScriptTarget.ES2022});
  const calls=[];
  const copy={encabezado:{titulo:'Plan your stay'},cliente:{telefono:'Contact number'}};
  for(const publicRequest of [true,false]){
    let language='en',snapshot=null,runEffect,cleanup;
    const pending=new Map();
    const effect=fn=>{
      runEffect=()=>{cleanup?.();fn(callback=>{cleanup=callback;});};
      runEffect();
    };
    const Editor=new Function('effect','computed','copyOverride',`${code};return Editor;`)(effect,fn=>fn,copyOverride);
    const editor=new Editor({
      publicRequest,preview:false,
      data:{language:{language:()=>language,formatText:label=>`${language}:${label}`}},
      copyService:{loadLanguage:code=>new Promise((resolve,reject)=>{
        calls.push(code);pending.set(code,{resolve,reject});
      })},
      loadedCopy:Object.assign(()=>snapshot,{set:value=>{snapshot=value;}}),
    });
    const title=()=>publicRequest
      ? editor.sharedText('Nueva cotización','Tu viaje empieza aquí')
      : editor.text('Nueva cotización');
    assert.equal(editor.copyPending(),true);
    pending.get('en').resolve(copy);
    await Promise.resolve();
    assert.equal(editor.copyPending(),false);
    assert.equal(title(),'Plan your stay');
    assert.equal(editor.text('Teléfono'),'Contact number');
    assert.equal(editor.text('Correo electrónico'),'en:Correo electrónico');

    language='fr';
    runEffect();
    assert.equal(editor.copyPending(),true);
    language='de';
    runEffect();
    pending.get('fr').resolve(copy);
    await Promise.resolve();
    assert.equal(editor.copyPending(),true);
    pending.get('de').reject(new Error('Unavailable'));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(editor.copyPending(),false);
    assert.equal(title(),publicRequest?'de:Tu viaje empieza aquí':'de:Nueva cotización');
  }
  assert.deepEqual(calls,['en','fr','de','en','fr','de']);
  assert.match(template,/@if\(copyPending\(\)\)[\s\S]*?<tp-state mode="loading"/);
  assert.match(template,/<div class="quote-editor-shell"[^>]*\[hidden\]="copyPending\(\)"/);
  assert.match(template,/\[title\]="publicRequest \? sharedText\('Nueva cotización','Tu viaje empieza aquí'\)/);
  assert.match(template,/\[description\]="publicRequest \? sharedText\(/);
  assert.match(template,/publicRequest \? sharedText\('Crear propuesta','Enviar solicitud'\)/);
});

test('the public-copy migration grants read access only to published copy columns',()=>{
  const read=name=>readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
  const original=read('20261118000000_textos_configurables');
  const migration=read('20261118000001_lectura_publica_textos_cotizacion');
  assert.match(migration,/grant select \(seccion, textos\) on public\.textos_configurables to anon/);
  assert.match(migration,/grant select \(seccion, idioma, textos\) on public\.textos_configurables_traducciones to anon/);
  assert.equal([...migration.matchAll(/alter policy \w+ on public\.\w+\s+to anon, authenticated;/g)].length,2);
  assert.doesNotMatch(migration,/grant (?:all|insert|update|delete|execute)|version/i);
  assert.match(original,/revoke all on function public\.publicar_textos_cotizacion\([^)]*\) from public, anon, authenticated/);
});
