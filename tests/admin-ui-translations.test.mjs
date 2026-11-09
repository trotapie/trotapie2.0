import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {adminUiTranslations} from '../scripts/admin-ui-translations.mjs';
import {TRANSLOCO_BUNDLES,UI_TRANSLATIONS} from '../src/app/core/i18n/translations.ts';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const signal=value=>Object.assign(()=>value,{set:next=>{value=next;}});
const classCode=(source,name)=>ts.transpile(source.slice(source.indexOf(`export class ${name}`)).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
const storage=new Map();
const Language=new Function('signal','getDefaultLang','TRANSLOCO_BUNDLES','UI_TRANSLATIONS','localStorage',`${classCode(read('../src/app/core/services/language.service.ts'),'LanguageService')};return LanguageService;`)(signal,()=> 'es',TRANSLOCO_BUNDLES,UI_TRANSLATIONS,{setItem:(key,value)=>storage.set(key,value)});

test('administrator translations are generated for every supported target language',()=>{
  for(const [source,translations] of Object.entries(adminUiTranslations)){
    for(const code of ['en','fr','de','pt']){
      assert.ok(translations[code]?.trim(),`${code}: ${source}`);
      assert.equal(UI_TRANSLATIONS[source]?.[code],translations[code],`Stale bundle: ${code}: ${source}`);
    }
  }
});

test('interface pipe updates unchanged labels on language switches and preserves user content',()=>{
  const language=new Language();
  const Pipe=new Function('inject','LanguageService',`${classCode(read('../src/app/shared/pipes/ui-text.pipe.ts'),'UiTextPipe')};return UiTextPipe;`)(()=>language,Language);
  const pipe=new Pipe();
  assert.equal(pipe.transform('Cotizaciones'),'Cotizaciones');
  language.setActiveLang('fr');
  assert.equal(storage.get('trotapie-language'),'fr');
  assert.equal(pipe.transform('Cotizaciones'),'Devis');
  language.setActiveLang('de');
  assert.equal(pipe.transform('Cotizaciones'),'Reiseangebote');
  assert.equal(pipe.transform('María Hernández'),'María Hernández');
  assert.equal(pipe.transform(null),'');
  language.setActiveLang('es');
  assert.equal(pipe.transform('Cotizaciones'),'Cotizaciones');
});

test('administrator hides the global selector and declares its interface language',()=>{
  const template=read('../src/app/layout/workspace/workspace.html');
  assert.doesNotMatch(template,/<tp-language-menu\b/);
  assert.doesNotMatch(template,/changeGlobal/);
  assert.match(template,/\[attr\.lang\]="language\.language\(\)"/);
  assert.match(template,/item\.name \| uiText/);
  assert.match(read('../src/app/shared/pipes/ui-text.pipe.ts'),/pure:false/);
});

test('workspace uses Spanish until destroyed without overwriting the public language preference',()=>{
  const source=ts.createSourceFile('workspace.ts',read('../src/app/layout/workspace/workspace.ts'),ts.ScriptTarget.Latest,true);
  const workspace=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='Workspace');
  const constructor=workspace.members.find(ts.isConstructorDeclaration);
  const body=ts.transpile(constructor.body.getText(source),{target:ts.ScriptTarget.ES2022});
  for(const code of ['en','fr','de','pt','es']){
    const language=new Language();
    language.setActiveLang(code);
    let destroy;
    new Function('inject','DestroyRef',body).call({language},()=>({onDestroy:callback=>{destroy=callback;}}),{});
    assert.equal(language.language(),'es');
    assert.equal(language.translateText('Cotizaciones'),'Cotizaciones');
    assert.equal(storage.get('trotapie-language'),code);
    destroy();
    assert.equal(language.language(),code);
    assert.equal(storage.get('trotapie-language'),code);
  }
});
