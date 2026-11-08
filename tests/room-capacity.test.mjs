import assert from 'node:assert/strict';
import test from 'node:test';
import {validRooms} from '../src/app/features/quotations/models/room.ts';

test('accepts up to eight guests per room including children',()=>{
  assert.equal(validRooms([{adults:8,children:0,childAges:[]}]),true);
  assert.equal(validRooms([{adults:1,children:7,childAges:Array(7).fill(5)}]),true);
  assert.equal(validRooms([{adults:4,children:4,childAges:Array(4).fill(10)}]),true);
});

test('rejects rooms exceeding eight guests',()=>{
  assert.equal(validRooms([{adults:6,children:3,childAges:[4,6,8]}]),false);
  assert.equal(validRooms([{adults:9,children:0,childAges:[]}]),false);
});

test('capacity applies per room rather than across the booking',()=>{
  assert.equal(validRooms(Array.from({length:2},()=>({adults:8,children:0,childAges:[]}))),true);
});

test('requires an adult, integer counts and valid child ages',()=>{
  assert.equal(validRooms([{adults:0,children:1,childAges:[5]}]),false);
  assert.equal(validRooms([{adults:1.5,children:0,childAges:[]}]),false);
  assert.equal(validRooms([{adults:2,children:1,childAges:[null]}]),false);
});
