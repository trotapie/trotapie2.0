import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {validRooms} from '../src/app/features/quotations/models/room.ts';

const limits={maxRooms:8,maxPeoplePerRoom:8};
const room=(adults,children)=>({adults,children,childAges:Array(children).fill(5)});
test('combined adults and children must fit the configured maximum',()=>{
  assert.equal(validRooms([room(6,2)],limits),true);
  assert.equal(validRooms([room(6,3)],limits),false);
  assert.equal(validRooms([room(8,0)],limits),true);
  assert.equal(validRooms([room(0,8)],limits),false);
  assert.equal(validRooms([room(1.5,0)],limits),false);
  assert.equal(validRooms(Array(9).fill(room(2,0)),limits),false);
  assert.equal(validRooms(Array(9).fill(room(10,0)),{maxRooms:10,maxPeoplePerRoom:12}),true);
});

const source=readFileSync(new URL('../src/app/features/quotations/components/room-picker/room-picker.ts',import.meta.url),'utf8');
const code=ts.transpile(source.slice(source.indexOf('export class')).replace('export class','class'),{target:ts.ScriptTarget.ES2022});
const signal=initial=>{let value=initial;return Object.assign(()=>value,{set:next=>value=next,update:fn=>value=fn(value)});};
const Picker=new Function('inject','LanguageService','model','input','computed','reconcileRoom',`${code};return RoomPicker;`)(()=>({formatText:text=>text}),null,signal,signal,fn=>fn,room=>room);
test('picker offers only combinations within the configured capacity',()=>{
  const picker=new Picker();
  assert.equal(picker.childOptions(room(6,0)).at(-1).value,2);
  assert.equal(picker.adultOptions(room(2,3)).at(-1).value,5);
  picker.maxPeoplePerRoom.set(12);
  assert.equal(picker.adultOptions(room(2,3)).at(-1).value,9);
});
test('picker rejects invalid updates and respects configurable room count',()=>{
  const picker=new Picker();
  picker.rooms.set([room(6,2)]);
  picker.update(0,'children',3);
  assert.equal(picker.rooms()[0].children,2);
  picker.maxRooms.set(1);
  picker.add();
  assert.equal(picker.rooms().length,1);
  picker.maxRooms.set(2);
  picker.add();
  assert.equal(picker.rooms().length,2);
});
test('new rooms respect a one-person maximum',()=>{
  const picker=new Picker();
  picker.maxPeoplePerRoom.set(1);
  picker.add();
  assert.equal(picker.rooms().at(-1).adults,1);
});
