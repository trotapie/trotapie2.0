import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import {HOME_COPY} from '../supabase/functions/_shared/home-copy.ts';
import {changedCopy,cleanCopy,COPY_LANGUAGES,copyGroups,mergeCopyTranslations,QUOTE_COPY,validCopyText} from '../supabase/functions/_shared/quote-copy.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const publicPath='src/app/features/public/explore/public';

test('Inicio exposes exactly the fields from the ticket and shares the card label',()=>{
  const expected=[
    'principal.antetitulo','principal.titulo','principal.descripcion','principal.boton','principal.nota',
    'carrusel.antetitulo','carrusel.titulo','destinos.antetitulo','destinos.titulo','destinos.descripcion',
    'destinos.enlace','filtros.experiencia','filtros.mexico','filtros.mundo',
  ];
  assert.deepEqual(copyGroups(HOME_COPY).flatMap(({key,fields})=>fields.map(field=>`${key}.${field.key}`)),expected);
  const template=read(publicPath+'.html');
  assert.equal(parseTemplate(template,publicPath+'.html').errors,null);
  assert.match(template,/@for \(record of homeCards\(\); track record.id\)[\s\S]*?\[labelTemplate\]="homeEditor\(\)\?destinationLabel:null"/);
  assert.match(template,/#destinationLabel[^>]*>[\s\S]*?homeField\('destinos','enlace'\)/);
  assert.throws(()=>cleanCopy({filtros:{playas:'Otras playas'}},HOME_COPY));
  assert.throws(()=>cleanCopy({principal:{ubicacion:'Otra ubicación'}},HOME_COPY));
  assert.throws(()=>cleanCopy({principal:{titulo:'Inicio'}},QUOTE_COPY));
});

test('Inicio shows published text first, waits on language changes, and falls back per field',()=>{
  const source=read(publicPath+'.ts');
  const methods=source.slice(source.indexOf('  homeField<'),source.indexOf('  imageError('));
  const code=ts.transpile(`class Page {${methods}}`,{target:ts.ScriptTarget.ES2022});
  const Page=new Function('HOME_COPY',`${code};return Page;`)(HOME_COPY);
  let pending=true;
  const page=Object.assign(new Page(),{
    mode:'home', homeEditor:()=>null, homeCopyPending:()=>pending,
    homeSnapshot:()=>({language:'en',textos:{principal:{titulo:'Your published headline'}}}),
    text:(_spanish,english)=>english,
  });
  assert.equal(page.homeText('principal','titulo','Fallback headline'),'');
  pending=false;
  assert.equal(page.homeText('principal','titulo','Fallback headline'),'Your published headline');
  assert.equal(page.homeText('filtros','mexico','Mexico'),'Mexico');
  page.mode='destinos';
  assert.equal(page.homeText('principal','titulo','Fallback headline'),'Fallback headline');
  assert.match(source,/loadLanguage\(language,'inicio'\)\.then\(resolve,\(\)=>resolve\(\{\}\)\)/);
});

test('the inline editor commits the draft on Enter and restores the previous value on Escape',()=>{
  const source=read('src/app/features/configuration/inline-copy/inline-copy.ts');
  const methods=source.slice(source.indexOf('  edit()'),source.indexOf('  private focus('));
  const code=ts.transpile(`class Editor {${methods}}`,{target:ts.ScriptTarget.ES2022});
  const Editor=new Function(`${code};return Editor;`)();
  let value='Tu próximo destino', editing=null, focused='';
  const editor=Object.assign(new Editor(),{
    value:()=>value,busy:()=>false,valid:validCopyText,
    editing:Object.assign(()=>editing,{set:next=>editing=next}),
    valueChanged:{emit:next=>value=next},focus:selector=>focused=selector,
  });
  const key=key=>({key,preventDefault(){}});
  editor.edit();
  assert.equal(focused,'textarea');
  editor.update('  Elige tu viaje ');
  editor.onKey(key('Enter'));
  assert.equal(value,'Elige tu viaje');
  assert.equal(focused,'button');
  editor.edit();
  editor.update('Prueba');
  editor.onKey(key('Escape'));
  assert.equal(value,'Elige tu viaje');
  assert.equal(editing,null);
});

test('the Edge Function publishes Inicio in one batch, or leaves it unchanged on failure',async()=>{
  const source=read('supabase/functions/guardar-textos-cotizacion/index.ts');
  const code=ts.transpile(source.slice(source.indexOf('const cors')), {target:ts.ScriptTarget.ES2022});
  let handler, allowed=true, incomplete=false;
  const reads=[], batches=[], publishes=[];
  const old={principal:{titulo:'Título anterior'},destinos:{enlace:'Explora el destino'}};
  const next={principal:{titulo:'Un nuevo viaje'},destinos:{enlace:'Explora el destino'}};
  const user={auth:{getUser:async()=>({data:{user:{id:'admin'}}})},rpc:async()=>({data:allowed})};
  const backend={
    from(table){return {select(){return this;},eq(column,section){
      reads.push([table,column,section]);
      if(table==='textos_configurables')return {single:async()=>({data:{version:3,textos:old}})};
      return Promise.resolve({data:COPY_LANGUAGES.map(idioma=>({idioma,textos:{principal:{titulo:'Old'},destinos:{enlace:'Existing'}}}))});
    }};},
    rpc:async (...args)=>{publishes.push(args);return {data:4};},
  };
  const deno={serve:fn=>handler=fn,env:{get:()=> 'mock'}};
  const translate=async (_url,{body})=>{
    batches.push(JSON.parse(body));
    return Response.json({ok:true,traducciones:Object.fromEntries(
      COPY_LANGUAGES.filter(lang=>!incomplete||lang!=='de').map(lang=>[lang,{principal:{titulo:`${lang}: Un nuevo viaje`}}])
    )});
  };
  new Function('Deno','createClient','fetch','changedCopy','cleanCopy','COPY_LANGUAGES','mergeCopyTranslations','QUOTE_COPY','HOME_COPY',code)(
    deno,(_url,_key,options)=>options?user:backend,translate,changedCopy,cleanCopy,COPY_LANGUAGES,mergeCopyTranslations,QUOTE_COPY,HOME_COPY,
  );
  const save=(textos=next)=>handler(new Request('http://localhost',{method:'POST',headers:{Authorization:'Bearer mock'},body:JSON.stringify({seccion:'inicio',version:3,textos})}));
  assert.equal((await save()).status,200);
  assert.ok(reads.every(([,column,section])=>column==='seccion'&&section==='inicio'));
  assert.equal(batches.length,1);
  assert.deepEqual(batches[0].textos,{principal:{titulo:'Un nuevo viaje'}});
  assert.equal(publishes[0][0],'publicar_textos_inicio');
  assert.equal(publishes[0][1].p_traducciones.en.destinos.enlace,'Existing');
  incomplete=true;
  assert.equal((await save()).status,502);
  assert.equal(publishes.length,1);
  assert.equal((await save({cliente:{telefono:'No permitido'}})).status,400);
  allowed=false;
  assert.equal((await save()).status,403);
  assert.equal(batches.length,2);
});
