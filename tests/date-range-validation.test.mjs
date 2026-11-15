import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateRangeErrors} from '../src/app/shared/components/date-range-filter/date-range-validation.ts';

const stay = {required:true,min:'2026-11-15',minNights:1};
test('a quotation requires both stay dates',()=>{
  assert.deepEqual(dateRangeErrors(null,stay),{required:true});
  assert.deepEqual(dateRangeErrors({start:'2026-11-16',end:null},stay),{dateRangeIncomplete:true});
  assert.deepEqual(dateRangeErrors({start:null,end:'2026-11-17'},stay),{dateRangeIncomplete:true});
});
test('a stay needs at least one night and cannot start in the past',()=>{
  assert.deepEqual(dateRangeErrors({start:'2026-11-16',end:'2026-11-16'},stay),{dateRangeOrder:true});
  assert.deepEqual(dateRangeErrors({start:'2026-11-17',end:'2026-11-16'},stay),{dateRangeOrder:true});
  assert.ok(dateRangeErrors({start:'2026-11-14',end:'2026-11-17'},stay)?.dateBounds);
  assert.equal(dateRangeErrors({start:'2026-11-15',end:'2026-11-16'},stay),null);
});
test('range filters still accept empty and same-day ranges',()=>{
  assert.equal(dateRangeErrors({start:null,end:null}),null);
  assert.equal(dateRangeErrors({start:'2026-11-16',end:'2026-11-16'}),null);
});
test('date validation handles invalid dates, leap years, boundaries and year changes',()=>{
  assert.deepEqual(dateRangeErrors({start:'2026-02-30',end:'2026-03-02'}),{date:true});
  assert.deepEqual(dateRangeErrors({start:'16/11/2026',end:'2026-11-18'}),{date:true});
  assert.equal(dateRangeErrors({start:'2028-02-29',end:'2028-03-01'},{minNights:1}),null);
  assert.equal(dateRangeErrors({start:'2026-12-31',end:'2027-01-01'},stay),null);
  assert.ok(dateRangeErrors({start:'2026-11-16',end:'2026-11-19'},{max:'2026-11-18'})?.dateBounds);
});
