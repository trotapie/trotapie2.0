import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTemplate} from '@angular/compiler';
import {DESTINATION_COPY} from '../supabase/functions/_shared/destination-copy.ts';
import {cleanCopy,copyGroups} from '../supabase/functions/_shared/quote-copy.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page='src/app/features/public/explore/public';
const hotels='src/app/features/hotels/components/hotel-suggestions/hotel-suggestions';

test('Destinos exposes only the seven marked texts, with one label shared by all hotel cards',()=>{
  assert.deepEqual(copyGroups(DESTINATION_COPY).flatMap(({key,fields})=>fields.map(field=>`${key}.${field.key}`)),[
    'ficha.antetitulo','ficha.ubicacion','hoteles.antetitulo','hoteles.titulo','hoteles.descripcion','hoteles.tarjeta','hoteles.verMas',
  ]);
  assert.throws(()=>cleanCopy({ficha:{nombre:'Otro nombre'}},DESTINATION_COPY));
  assert.throws(()=>cleanCopy({hoteles:{opciones:'Otro contador'}},DESTINATION_COPY));
  for(const path of [page,hotels]) assert.equal(parseTemplate(read(path+'.html'),path).errors,null);
  assert.match(read(hotels+'.html'),/@for \(record of page\(\)\.items; track record\.id\)[\s\S]*?\[label\]="hotelText\('tarjeta', 'View hotel'\)"[\s\S]*?\[labelTemplate\]="copyEditor\(\)\?cardLabel:null"/);
});

test('Public destination and hotel details wait for the shared texts in the active language',()=>{
  const source=read(page+'.ts');
  assert.match(source,/usesDestinationCopy\(\)\{return !this\.isCopyPreview\(\) && \(this\.mode==='destino' \|\| this\.mode==='hotel'\);\}/);
  assert.match(source,/if\(!this\.usesDestinationCopy\(\)\)return;\s+const language=this\.data\.language\.language\(\);[\s\S]*?loadLanguage\(language,'destino'\)\.then\(resolve,\(\)=>resolve\(\{\}\)\)/);
  assert.match(source,/this\.destinationSnapshot\(\)\?\.language!==this\.data\.language\.language\(\)/);
  const template=read(page+'.html');
  assert.match(template,/\{\{\s*destinationText\('antetitulo', 'Experience it your way'\)\s*\}\}/);
  assert.match(template,/\(click\)="mapOpen\.set\(true\)"\s*>\s*\{\{\s*destinationText\('ubicacion', 'View location'\)\s*\}\}/);
  assert.match(read(hotels+'.html'),/\[routerLink\]="\['\/hoteles', destinationId\(\)\]"/);
});
