import test from 'node:test';
import assert from 'node:assert/strict';
import {appendHotelPage} from '../src/app/data/utils/append-hotel-page.ts';

const hotel = id => ({id:String(id),title:`Hotel ${id}`,subtitle:'',image:'',status:'',raw:{}});

test('hotel batches accumulate from 12 to 24 to all 33 results', () => {
  const batch = (page, count) => ({items:Array.from({length:count},(_,i)=>hotel(page*12+i)),total:33,page});
  const first = batch(0,12);
  const second = appendHotelPage(first,batch(1,12));
  const last = appendHotelPage(second,batch(2,9));
  assert.equal(first.items.length,12);
  assert.equal(second.items.length,24);
  assert.equal(last.items.length,33);
  assert.equal(last.page,2);
  assert.deepEqual(last.items.slice(0,12),first.items);
  assert.equal(last.items.length<last.total,false);
  assert.deepEqual(JSON.parse(JSON.stringify(last)),last);
});

test('overlapping hotel batches update records without duplicate cards', () => {
  const current={items:[hotel(1),hotel(2)],total:3,page:0};
  const result=appendHotelPage(current,{items:[{...hotel(2),title:'Updated'},hotel(3)],total:3,page:1});
  assert.deepEqual(result.items.map(item=>item.id),['1','2','3']);
  assert.equal(result.items[1].title,'Updated');
  assert.equal(current.items[1].title,'Hotel 2');
});

test('an empty final batch preserves existing hotels and the updated total', () => {
  const result=appendHotelPage({items:[hotel(1)],total:2,page:0},{items:[],total:1,page:1});
  assert.equal(result.items.length,1);
  assert.equal(result.total,1);
});
