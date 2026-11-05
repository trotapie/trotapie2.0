import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteWhatsAppUrl} from '../src/app/features/quotations/models/quote-whatsapp.ts';

// Exercise the actual handler without bootstrapping Angular or contacting the backend.
const source=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.ts',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async save(){'),source.indexOf('removeRoom(')).trim();
const signal=value=>Object.assign(()=>value,{set:next=>{value=next;}});

function setup({blocked=false,publicRequest=true}={}){
  const opened=[];
  const writes=[];
  const navigations=[];
  const save=new Function('window','quoteWhatsAppUrl','quoteAdminSegment',`return ${handler.replace('async save()', 'async function()')}`)(
    {open(...args){opened.push(args);if(blocked)throw new Error('Blocked');}},quoteWhatsAppUrl,()=> 'quote-id',
  );
  const editor={
    save,publicRequest,busy:signal(false),success:signal(''),error:signal(''),whatsappUrl:signal(''),
    name:'Ana',phone:'6181234567',email:'',start:'2026-12-20',end:'2026-12-23',notes:'',
    destinationId:1,employeeId:2,multiple:false,treatmentId:null,hotelRegimes:{3:4},hotelPrices:{},
    destinations:()=>[{id:'1',title:'Acapulco'}],
    selectedHotels:()=>[{id:'3',title:'Hotel de prueba'}],
    rooms:()=>[{adults:2,children:0,childAges:[]}],
    regimeOptions:()=>({'3':[{value:4,label:'Todo incluido'}]}),
    clientDisplayName:()=> 'Ana',advisorName:()=> 'Asesor',nightCount:()=>3,
    data:{language:{language:()=> 'es'}},
    workflow:{create(draft,isPublic){
      return new Promise((resolve,reject)=>writes.push({draft,isPublic,resolve,reject,openedAtStart:opened.length}));
    }},
    changes:{capture(){}},draft:()=>({}),pendingChanges:{sync(){}},
    toast:{success(){},error(){}},router:{async navigate(...args){navigations.push(args);}},
  };
  return {editor,opened,writes,navigations};
}

test('opens WhatsApp immediately and saves while the request is still pending',async()=>{
  const {editor,opened,writes}=setup();
  const pending=editor.save();
  assert.equal(opened.length,1);
  assert.equal(writes.length,1);
  assert.equal(writes[0].openedAtStart,1);
  assert.deepEqual(opened[0].slice(1),['_blank','noopener,noreferrer']);
  assert.equal(editor.busy(),true);
  assert.equal(editor.success(),'');
  await editor.save();
  assert.equal(writes.length,1);
  writes[0].resolve({id:1,public_id:'public-id'});
  await pending;
  assert.ok(editor.success());
  assert.equal(editor.busy(),false);
  await editor.save();
  assert.equal(writes.length,1);
});

test('a failed save preserves the request and retries without reopening WhatsApp',async()=>{
  const {editor,opened,writes}=setup();
  const pending=editor.save();
  writes[0].reject(new Error('Sin conexión'));
  await pending;
  assert.equal(editor.error(),'Sin conexión');
  assert.equal(editor.success(),'');
  assert.equal(editor.busy(),false);
  assert.ok(editor.whatsappUrl());
  const retry=editor.save();
  assert.equal(opened.length,1);
  assert.equal(editor.error(),'');
  assert.deepEqual(writes[1].draft,writes[0].draft);
  writes[1].resolve({id:1,public_id:'public-id'});
  await retry;
  assert.ok(editor.success());
});

test('popup blocking does not prevent saving or remove the manual WhatsApp link',async()=>{
  const {editor,writes}=setup({blocked:true});
  const pending=editor.save();
  assert.equal(writes.length,1);
  assert.ok(editor.whatsappUrl().startsWith('https://wa.me/'));
  writes[0].resolve({id:1,public_id:'public-id'});
  await pending;
  assert.ok(editor.success());
});

test('administrative quotes still save before navigating without opening WhatsApp',async()=>{
  const {editor,opened,writes,navigations}=setup({publicRequest:false});
  const pending=editor.save();
  assert.equal(opened.length,0);
  assert.equal(navigations.length,0);
  assert.equal(writes[0].isPublic,false);
  writes[0].resolve({id:1,public_id:'public-id'});
  await pending;
  assert.equal(navigations.length,1);
});
