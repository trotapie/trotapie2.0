import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {parseTemplate,TmplAstText} from '@angular/compiler';
import {quoteUiTranslations} from '../scripts/quote-ui-translations.mjs';
import {TRANSLOCO_BUNDLES,UI_TRANSLATIONS} from '../src/app/core/i18n/translations.ts';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const signal=value=>Object.assign(()=>value,{set:next=>{value=next;}});
const classCode=(source,name)=>ts.transpile(source.slice(source.indexOf(`export class ${name}`)).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
const languageSource=read('../src/app/core/services/language.service.ts');
const Language=new Function('signal','getDefaultLang','TRANSLOCO_BUNDLES','UI_TRANSLATIONS',`${classCode(languageSource,'LanguageService')};return LanguageService;`)(signal,()=> 'es',TRANSLOCO_BUNDLES,UI_TRANSLATIONS);

test('quotation UI translations cover all four target languages and preserve parameters',()=>{
  for(const [spanish,translations] of Object.entries(quoteUiTranslations)){
    const params=[...spanish.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort();
    for(const lang of ['en','fr','de','pt']){
      assert.ok(translations[lang]?.trim(),`${lang}: ${spanish}`);
      assert.equal(UI_TRANSLATIONS[spanish]?.[lang],translations[lang],`Generated bundle is stale: ${lang}: ${spanish}`);
      assert.deepEqual([...translations[lang].matchAll(/\{\w+\}/g)].map(match=>match[0]).sort(),params);
    }
  }
});
test('French quotation headings, controls, counters and validation use the selected language',()=>{
  const language=new Language();
  language.language.set('fr');
  assert.equal(language.formatText('Tu viaje empieza aquí'),'Votre voyage commence ici');
  assert.equal(language.formatText('Tipo de habitación'),'Type de chambre');
  assert.equal(language.formatText('Camas (opcional)'),'Lits (facultatif)');
  assert.equal(language.formatText('Buscar opciones'),'Rechercher des options');
  assert.equal(language.formatText('Limpiar selección'),'Effacer la sélection');
  assert.equal(language.formatText('Habitación {number}',{number:2}),'Chambre 2');
  assert.equal(language.formatText('{count} noches',{count:3}),'3 nuits');
  assert.equal(language.formatText('{count} hotel seleccionado',{count:1}),'1 hôtel sélectionné');
  assert.equal(language.formatText('Selecciona al menos un hotel.'),'Sélectionnez au moins un hôtel.');
});
test('room occupancy options recompute in the selected language without modifying the draft',()=>{
  const language=new Language();
  const source=read('../src/app/features/quotations/components/room-picker/room-picker.ts');
  const Picker=new Function('inject','LanguageService','model','input','computed',`${classCode(source,'RoomPicker')};return RoomPicker;`)(()=>language,Language,signal,signal,fn=>fn);
  const picker=new Picker();
  const before=structuredClone(picker.rooms());
  assert.equal(picker.adultOptions()[1].label,'2 adultos');
  language.language.set('fr');
  assert.equal(picker.adultOptions()[1].label,'2 adultes');
  assert.equal(picker.childOptions()[0].label,'0 enfants');
  assert.equal(picker.ageOptions()[1].label,'1 an');
  assert.equal(picker.ageOptions()[5].label,'5 ans');
  language.language.set('de');
  assert.equal(picker.adultOptions()[1].label,'2 Erwachsene');
  assert.deepEqual(picker.rooms(),before);
});
test('Spanish remains unchanged and translated parameters cannot corrupt user text',()=>{
  const language=new Language();
  assert.equal(language.formatText('Habitación {number}',{number:1}),'Habitación 1');
  assert.equal(language.formatText('Hotel Océano Palace'),'Hotel Océano Palace');
  language.language.set('fr');
  assert.equal(language.formatText('Hotel Océano Palace'),'Hotel Océano Palace');
  assert.equal(language.formatText('Habitación {number}',{number:'$&'}),'Chambre $&');
  assert.equal(language.formatText('Inicio'),'Accueil','The date picker must not override the navigation translation');
});
test('calendar months, weekdays, selected dates and actions use the active locale',()=>{
  const language=new Language();
  language.language.set('fr');
  const source=read('../src/app/shared/components/date-range-filter/date-range-filter.component.ts');
  const decorator=()=>()=>{};
  const Calendar=new Function('inject','LanguageService','computed','Input','ViewChild','EMPTY_DATE_RANGE',`${classCode(source,'DateRangeFilterComponent')};return DateRangeFilterComponent;`)(()=>language,Language,fn=>fn,decorator,decorator,{start:null,end:null});
  const calendar=new Calendar();
  assert.equal(calendar.monthLabel(new Date(2026,10,9)),'novembre 2026');
  assert.equal(calendar.weekdays()[0],'dim.');
  assert.equal(calendar.formatDate('2026-11-09'),'09/11/2026');
  assert.equal(calendar.text('Hoy'),'Aujourd’hui');
  language.language.set('en');
  assert.equal(calendar.formatDate('2026-11-09'),'11/09/2026');
  assert.equal(calendar.weekdays()[0],'Sun');
});
test('quotation and room templates route static text through the existing translation service',()=>{
  for(const file of ['../src/app/features/quotations/quote-editor/quote-editor.html','../src/app/features/quotations/components/room-picker/room-picker.html']){
    const template=read(file);
    for(const match of template.matchAll(/text\('([^']+)'/g)){
      assert.ok(UI_TRANSLATIONS[match[1]],`Missing UI translation: ${match[1]}`);
    }
    const parsed=parseTemplate(template,file);
    assert.equal(parsed.errors,null);
    const checkText=node=>{
      if(!node)return;
      if(Array.isArray(node)){node.forEach(checkText);return;}
      if(node instanceof TmplAstText)assert.equal(node.value.trim(),'','Static text must use a translated binding');
      for(const key of ['children','branches','cases','empty','placeholder','loading','error'])checkText(node[key]);
    };
    checkText(parsed.nodes);
  }
  const picker=read('../src/app/features/quotations/components/room-picker/room-picker.html');
  assert.match(picker,/showConfigurationHints\(\)&&room\.roomTypeId/);
  assert.doesNotMatch(picker,/label="Camas/);
});
