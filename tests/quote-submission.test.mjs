import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteAdminSegment} from '../src/app/features/quotations/models/quote-route.ts';

// Exercise the actual handler without bootstrapping Angular or contacting the backend.
const source=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.ts',import.meta.url),'utf8');
const template=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.html',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async save(){'),source.indexOf('removeRoom(')).trim();
const signal=value=>Object.assign(()=>value,{set:next=>{value=next;}});

function setup({publicRequest=true,preview=false,multiple=false}={}){
  const opened=[];
  const writes=[];
  const navigations=[];
  const save=new Function('window','quoteAdminSegment',`return ${handler.replace('async save()', 'async function()')}`)(
    {open(...args){opened.push(args);}},quoteAdminSegment,
  );
  const editor={
    configuredRoomsValid:()=>true,
    save,publicRequest,preview,busy:signal(false),success:signal(false),error:signal(''),savedQuoteSegment:signal(''),
    name:'Ana',phone:'6181234567',email:'',start:'2026-12-20',end:'2026-12-23',notes:'',
    destinationId:1,employeeId:2,multiple,treatmentId:null,hotelRegimes:{3:4},hotelPrices:{},
    destinations:()=>[{id:'1',title:'Acapulco'}],
    selectedHotels:()=>[{id:'3',title:'Hotel de prueba'}],
    rooms:()=>[{adults:2,children:0,childAges:[]}],
    data:{language:{language:()=> 'es'}},
    workflow:{create(draft,isPublic){
      return new Promise((resolve,reject)=>writes.push({draft,isPublic,resolve,reject}));
    }},
    changes:{capture(){}},draft:()=>({}),pendingChanges:{sync(){}},
    router:{async navigate(...args){navigations.push(args);}},
  };
  return {editor,opened,writes,navigations};
}

for(const publicRequest of [true,false]){
  const flow=publicRequest?'public request':'administrative quote';

  test(`${flow} confirms only after saving, without opening a tab or navigating`,async()=>{
    const {editor,opened,writes,navigations}=setup({publicRequest});
    const pending=editor.save();
    assert.equal(writes.length,1);
    assert.equal(writes[0].isPublic,publicRequest);
    assert.equal(writes[0].draft.employeeId,2);
    assert.equal(editor.busy(),true);
    assert.equal(editor.success(),false);
    await editor.save();
    assert.equal(writes.length,1);
    writes[0].resolve({id:1,public_id:'public-id'});
    await pending;
    assert.equal(editor.success(),true);
    assert.equal(editor.savedQuoteSegment(),publicRequest?'':'1-public-id');
    assert.equal(editor.busy(),false);
    assert.deepEqual(opened,[]);
    assert.deepEqual(navigations,[]);
    await editor.save();
    assert.equal(writes.length,1);
  });

  test(`${flow} preserves the draft and allows retry when saving fails`,async()=>{
    const {editor,writes}=setup({publicRequest});
    const pending=editor.save();
    writes[0].reject(new Error('Sin conexión'));
    await pending;
    assert.equal(editor.error(),'Sin conexión');
    assert.equal(editor.success(),false);
    assert.equal(editor.busy(),false);
    const retry=editor.save();
    assert.equal(editor.error(),'');
    assert.deepEqual(writes[1].draft,writes[0].draft);
    writes[1].resolve({id:1,public_id:'public-id'});
    await retry;
    assert.equal(editor.success(),true);
  });
}

test('the editor replaces the form with a confirmation and no WhatsApp link',()=>{
  assert.match(template,/@else if\(success\(\)\)\{[\s\S]*?¡Solicitud registrada correctamente![\s\S]*?Un asesor se pondrá en contacto contigo[\s\S]*?@else\{[\s\S]*?<form/);
  assert.doesNotMatch(template,/WhatsApp|whatsappUrl/);
});

test('confirmation hides the header back button and offers actions under the message',()=>{
  assert.match(template,/<tp-page-header \[showBack\]="!success\(\)"[^>]*>\s*@if\(!success\(\)\)/);
  assert.match(template,/quote-success-actions[\s\S]*?Explorar más destinos[\s\S]*?Regresar al catálogo[\s\S]*?Ver cotización[\s\S]*?Ver listado de cotizaciones/);
});

test('the detail link for a comparison uses its public ID',async()=>{
  const {editor,writes}=setup({publicRequest:false,multiple:true});
  const pending=editor.save();
  writes[0].resolve({id:1,public_id:'public-id'});
  await pending;
  assert.equal(editor.savedQuoteSegment(),'public-id');
});

test('preview cannot submit a request',async()=>{
  const {editor,writes}=setup({preview:true});
  await editor.save();
  assert.deepEqual(writes,[]);
  assert.equal(editor.success(),false);
});
