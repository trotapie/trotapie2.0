import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {nights,roomDescription,validRooms} from '../src/app/features/quotations/models/room.ts';

const source=readFileSync(new URL('../src/app/features/quotations/services/quote-workflow.service.ts',import.meta.url),'utf8');
const method=source.slice(source.indexOf('async create('),source.lastIndexOf('}'));
const javascript=ts.transpile(`class Workflow {${method}}`,{target:ts.ScriptTarget.ES2022});
const Workflow=new Function('nights','roomDescription','validRooms',`${javascript}; return Workflow;`)(nights,roomDescription,validRooms);

function setup({advisors=[{id:2,nombre:'Asesor'}],error=null,employeeId=2}={}){
  const writes=[];
  const workflow=Object.assign(new Workflow(),{data:{
    auth:{hasPermission:()=>true,identity:()=>({employeeId:99})},
    employees:{asesoresCotizacion:async()=>({data:advisors,error})},
    hotels:{obtenerRegimenesCotizacionHotel:async()=>[]},
    legacy:{
      async upsertCliente(){writes.push('client');return {id:1};},
      async crearSolicitudCotizacion(payload){writes.push(payload);return {id:1,public_id:'quote'};},
      async guardarCotizacionMultiple(payload){writes.push(payload);return {id:1,public_id:'quote'};},
    },
    invalidate(){},
  }});
  const draft={name:'Ana',email:'',phone:'6181234567',start:'2026-12-20',end:'2026-12-23',
    destinationId:1,destinationName:'Cancún',rooms:[{adults:2,children:0,childAges:[]}],notes:'',
    hotels:[{id:3,name:'Hotel',regimeId:null,price:null}],multiple:false,employeeId,language:'es'};
  return {workflow,draft,writes};
}

for(const publicRequest of [false,true]){
  for(const multiple of [false,true]){
    test(`accepts enabled advisors (${publicRequest?'public':'internal'}, ${multiple?'multiple':'individual'})`,async()=>{
      const {workflow,draft,writes}=setup();
      await workflow.create({...draft,multiple},publicRequest);
      assert.equal(writes[1].empleado_id,2);
    });
    test(`rejects disabled or inactive advisors before any writes (${publicRequest}, ${multiple})`,async()=>{
      const {workflow,draft,writes}=setup({advisors:[]});
      await assert.rejects(workflow.create({...draft,multiple},publicRequest),/ya no está disponible/);
      assert.equal(writes.length,0);
    });
  }
}

test('does not silently assign the logged-in employee when no advisor was selected',async()=>{
  const {workflow,draft,writes}=setup({employeeId:null});
  await assert.rejects(workflow.create(draft),/Selecciona un asesor/);
  assert.equal(writes.length,0);
});

test('fails closed if advisor availability cannot be checked',async()=>{
  const {workflow,draft,writes}=setup({error:new Error('Sin conexión')});
  await assert.rejects(workflow.create(draft,true),/Sin conexión/);
  assert.equal(writes.length,0);
});

const editorSource=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.ts',import.meta.url),'utf8');
const initMethod=editorSource.slice(editorSource.indexOf('async ngOnInit()'),editorSource.indexOf('async loadDestinations()'));
const initJavascript=ts.transpile(`class Editor {${initMethod}}`,{target:ts.ScriptTarget.ES2022});
const Editor=new Function(`${initJavascript}; return Editor;`)();
const signal=initial=>{let value=initial;return Object.assign(()=>value,{set:next=>value=next});};

for(const publicRequest of [false,true]){
  test(`loads the same restricted advisor list (${publicRequest?'public':'internal'})`,async()=>{
    const editor=Object.assign(new Editor(),{
      publicRequest,hotelId:0,employeeId:99,employees:signal([]),treatments:signal([]),error:signal(''),loading:signal(true),
      async loadDestinations(){},changes:{capture(){}},draft:()=>({}),
      data:{auth:{identity:()=>({employeeId:99})},legacy:{obtenerTratamientosActivos:async()=>[]},
        employees:{asesoresCotizacion:async()=>({data:[{id:2,nombre:'Asesor'}],error:null})}},
    });
    await editor.ngOnInit();
    assert.deepEqual(editor.employees(),[{id:2,nombre:'Asesor'}]);
    assert.equal(editor.employeeId,null);
    assert.equal(editor.error(),'');
    assert.equal(editor.loading(),false);
  });
}
