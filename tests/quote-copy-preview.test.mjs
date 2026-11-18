import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTemplate} from '@angular/compiler';
import ts from 'typescript';
import {QUOTE_COPY,COPY_LIMIT,validCopyText} from '../supabase/functions/_shared/quote-copy.ts';

const path='../src/app/features/configuration/quote-copy-preview/quote-copy-preview';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const signal=initial=>{let value=initial;return Object.assign(()=>value,{set:next=>value=next});};
const input=Object.assign(signal,{required:()=>signal({})});
const source=read(path+'.ts');
const code=ts.transpile(source.slice(source.indexOf('export class')).replace('export class','class'),{target:ts.ScriptTarget.ES2022});

test('inline editing updates the settings draft, normalizes on blur and restores on Escape',()=>{
  const changes=[];
  const Preview=new Function('input','output','signal','QUOTE_COPY','COPY_LIMIT','validCopyText','inject','Injector','afterNextRender',`${code};return QuoteCopyPreview;`)(
    input,()=>({emit:value=>changes.push(value)}),signal,QUOTE_COPY,COPY_LIMIT,validCopyText,
    ()=>({}),{},({write})=>write(),
  );
  const preview=new Preview();
  const focus=[];
  const slot={querySelector:selector=>({focus:()=>focus.push(selector)})};
  preview.texts.set({cliente:{telefono:'Teléfono de contacto'}});
  preview.edit(slot,'cliente','telefono');
  assert.equal(preview.editing().value,'Teléfono de contacto');
  assert.deepEqual(focus,['textarea']);
  preview.update({},'Another slot');
  preview.update(slot,'Teléfono {numero}');
  let prevented=0;
  const press=key=>preview.onEditorKey({key,preventDefault:()=>prevented++},slot);
  press('Enter');
  assert.equal(preview.editing().value,'Teléfono {numero}');
  press('Escape');
  assert.equal(prevented,2);
  assert.equal(preview.editing(),null);
  assert.deepEqual(focus,['textarea','.copy-trigger']);
  assert.deepEqual(changes.map(change=>change.value),['Teléfono {numero}','Teléfono de contacto']);

  preview.edit(slot,'cliente','telefono');
  preview.update(slot,' Teléfono de oficina ');
  preview.finish(slot);
  assert.deepEqual(changes.at(-1),{group:'cliente',key:'telefono',value:'Teléfono de oficina'});
  assert.equal(preview.editing(),null);
  preview.busy.set(true);
  preview.edit(slot,'encabezado','titulo');
  assert.equal(preview.editing(),null);
});

test('settings presents an icon and screen picker; the preview has no real quote controls',()=>{
  const settings=read('../src/app/features/configuration/general-settings/general-settings.html');
  const template=read(path+'.html');
  assert.equal(parseTemplate(template,path+'.html').errors,null);
  assert.match(settings,/<button tpButton icon="edit"[^>]+>Textos/);
  assert.match(settings,/settings-screen-selector[\s\S]*?textScreens[\s\S]*?tp-quote-copy-preview/);
  assert.match(template,/quote-stepper[\s\S]*?quote-workflow[\s\S]*?quote-summary/);
  assert.doesNotMatch(settings,/Vista editable|Próximamente/);
  assert.doesNotMatch(template,/variant="back"|>Individual<|>Comparativa<|>Confirmación</);
  assert.doesNotMatch(template,/<tp-dialog\b|<input\b|<app-tp-select-search|<app-date-range-filter|<tp-room-picker|routerLink|type="submit"/);
  assert.match(template,/<textarea[^>]+class="copy-input"[^>]+\(input\)="update\(slot,copyInput.value\)"/);
  assert.match(template,/<button class="copy-target copy-trigger step-label"[^>]*\(click\)="edit\(stepSlot,'pasos',key\)"/);
  assert.match(template,/<button class="step-number"[^>]*\(click\)="screen\.set\(i\)"/);
  assert.doesNotMatch(template,/<tp-icon name="edit"/);
  assert.doesNotMatch(template,/group:'acciones',key:'(?:anterior|continuar)'/);
  assert.match(template,/\(click\)="screen\.set\(screen\(\)-1\)"/);
  assert.match(template,/\(click\)="screen\.set\(screen\(\)\+1\)"/);
  assert.match(template,/@if\(screen\(\)<2\)\{\s*<details class="extra-copy">/);
  assert.doesNotMatch(template.match(/<details class="extra-copy">[\s\S]*?<\/details>/)[0],/group:'resumen'/);
  assert.doesNotMatch(template,/group:'resumen',key:'(?:noches|personas|hoteles)'/);
  assert.equal((template.match(/<textarea\b/g)??[]).length,1);
});
