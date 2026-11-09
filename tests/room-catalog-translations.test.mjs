import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/app/data/queries/catalogos-admin.service.ts',import.meta.url),'utf8');
const method=source.slice(source.indexOf('private async guardarHabitacionOCama('),source.indexOf('async obtenerDetalleCatalogoAtraccionesAdmin('));
const javascript=ts.transpile(`class Catalogs {${method}}`,{target:ts.ScriptTarget.ES2022});
const Catalogs=new Function(`${javascript};return Catalogs;`)();
function setup(translations={en:{title:'Double',description:'Room'}}){
  const writes=[];
  const catalogs=Object.assign(new Catalogs(),{
    supabase:{traducirDesdeEspanol:async()=>translations,obtenerIdiomasPreviewAdmin:async()=>[{id:1,codigo:'es',nombre:'Español'},{id:2,codigo:'en',nombre:'Inglés'}]},
    client:{rpc:async(name,payload)=>{writes.push({name,payload});return {data:{id:4},error:null};}},
  });
  return {catalogs,writes};
}
for(const catalog of ['tipos_habitacion','tipos_cama']){
  test(`generates Spanish and translated names and descriptions atomically for ${catalog}`,async()=>{
    const {catalogs,writes}=setup();
    await catalogs.guardarHabitacionOCama(catalog,null,{nombre_habitacion:'Doble',descripcion:'Habitación',capacidad_maxima:2,cama_ids:[3]});
    assert.equal(writes.length,1);
    assert.equal(writes[0].name,'guardar_tipo_habitacion_o_cama');
    assert.deepEqual(writes[0].payload.p_traducciones,[{idioma_id:1,nombre:'Doble',descripcion:'Habitación'},{idioma_id:2,nombre:'Double',descripcion:'Room'}]);
    assert.equal(writes[0].payload.p_catalogo,catalog);
  });
  test(`does not save ${catalog} when a translation is missing`,async()=>{
    const {catalogs,writes}=setup({});
    await assert.rejects(catalogs.guardarHabitacionOCama(catalog,4,{nombre:'Doble',descripcion:'Habitación',capacidad_maxima:2}),/traducción a Inglés/);
    assert.equal(writes.length,0);
  });
}
test('rejects non-integer capacity before translation or database writes',async()=>{
  const {catalogs,writes}=setup();
  await assert.rejects(catalogs.guardarHabitacionOCama('tipos_habitacion',4,{nombre:'Doble',capacidad_maxima:2.5}),/entero/);
  assert.equal(writes.length,0);
});
