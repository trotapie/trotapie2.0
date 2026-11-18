import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTemplate} from '@angular/compiler';
import ts from 'typescript';
import {HOTEL_COPY,hotelInheritsDestinationCopy} from '../supabase/functions/_shared/hotel-copy.ts';
import {cleanCopy,copyGroups} from '../supabase/functions/_shared/quote-copy.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page='src/app/features/public/explore/public';
const information='src/app/features/hotels/components/hotel-information/hotel-information';

test('Hoteles exposes only the nine marked texts and disables real actions in the preview',()=>{
  assert.deepEqual(copyGroups(HOTEL_COPY).flatMap(({key,fields})=>fields.map(field=>`${key}.${field.key}`)),[
    'ficha.antetitulo','ficha.descripcion','ficha.cotizar','ficha.ubicacion',
    'informacion.antetitulo','informacion.titulo','informacion.ubicacion','informacion.compartir','informacion.cotizar',
  ]);
  assert.throws(()=>cleanCopy({ficha:{nombre:'Otro hotel'}},HOTEL_COPY));
  assert.throws(()=>cleanCopy({informacion:{horarios:'Otros horarios'}},HOTEL_COPY));
  for(const path of [page,information]) assert.equal(parseTemplate(read(path+'.html'),path).errors,null);
  assert.match(read(page+'.html'),/class="hotel-photo-gallery"[^>]+\[inert\]="!!hotelEditor\(\)"/);
  assert.match(read(information+'.html'),/class="hotel-tabs" \[inert\]="!!copyEditor\(\)"/);
  assert.match(read(information+'.html'),/\(click\)="share\(\)"[\s\S]*?\[routerLink\]="\['\/solicitar', hotel\(\)\.id\]"/);
});

test('public hotel copy waits for active-language reads and falls back per field',()=>{
  const source=read(page+'.ts');
  const methods=source.slice(source.indexOf('  hotelText('),source.indexOf('  imageError('));
  const code=ts.transpile(`class Page {${methods}}`,{target:ts.ScriptTarget.ES2022});
  const Page=new Function('HOTEL_COPY','hotelInheritsDestinationCopy',`${code};return Page;`)(HOTEL_COPY,hotelInheritsDestinationCopy);
  const hotel=Object.assign(new Page(),{
    hotelCopy:()=>({ficha:{antetitulo:'Hotel headline'}}),
    destinationCopy:()=>({ficha:{antetitulo:'Destination headline',ubicacion:'Destination map',cotizar:'Never used'}}),
    text:(_es,en)=>en,
  });
  assert.equal(hotel.hotelText('antetitulo','Default headline'),'Hotel headline');
  assert.equal(hotel.hotelText('ubicacion','View location'),'Destination map');
  assert.equal(hotel.hotelText('cotizar','Request a quote'),'Request a quote');
  assert.match(source,/this\.hotelSnapshot\(\)\?\.language!==this\.data\.language\.language\(\)/);
  assert.match(source,/copyPending = computed\(\(\)=>.*destinationCopyPending\(\) \|\| this\.hotelCopyPending\(\)/);
  assert.match(source,/loadLanguage\(language,'hotel'\)\.then\(resolve,\(\)=>resolve\(\{\}\)\)/);
});
