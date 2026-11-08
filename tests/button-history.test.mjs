import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source=readFileSync(new URL('../src/app/shared/components/button/button.ts',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('const back='),source.indexOf("element.addEventListener('click'"));
const createHandler=new Function('window',ts.transpile(`${handler}\nreturn back;`,{target:ts.ScriptTarget.ES2022}));

function setup(historyBack){
  const calls=[];
  const button={variant:()=> 'back',historyBack:()=>historyBack,busy:()=>false,disabled:()=>false};
  const click=createHandler.call(button,{history:{back:()=>calls.push('history')}});
  const event={preventDefault:()=>calls.push('prevent'),stopImmediatePropagation:()=>calls.push('stop')};
  return {click,event,calls};
}

test('explicit catalog navigation is not intercepted by back button styling',()=>{
  const {click,event,calls}=setup(false);
  click(event);
  assert.deepEqual(calls,[]);
});

test('ordinary back buttons retain history navigation',()=>{
  const {click,event,calls}=setup(true);
  click(event);
  assert.deepEqual(calls,['prevent','stop','history']);
});

test('public quote catalog link disables history navigation and targets destination hotels',()=>{
  const template=readFileSync(new URL('../src/app/features/quotations/quote-editor/quote-editor.html',import.meta.url),'utf8');
  assert.match(template,/\[historyBack\]="!publicRequest"/);
  assert.match(template,/destinationId \? '\/hoteles\/'\+destinationId : '\/hoteles'/);
});
