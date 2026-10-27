import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyPhotoBulkAction} from '../src/app/features/destinations/utils/photo-bulk-action.ts';

test('activates and deactivates only selected photos without changing the original draft',()=>{
  const images=[{id:1,activa:false},{id:2,activa:true},{activa:false}];
  const result=applyPhotoBulkAction(images,[images[0],images[2]],'activate');
  assert.deepEqual(result.map(image=>image.activa),[true,true,true]);
  assert.equal(images[0].activa,false);
  assert.equal(result[1],images[1]);
  assert.deepEqual(applyPhotoBulkAction(result,[result[0],result[1]],'deactivate').map(image=>image.activa),[false,false,true]);
});

test('deletes selected saved and unsaved photos, including the whole selection',()=>{
  const images=[{id:1},{id:2},{}];
  assert.deepEqual(applyPhotoBulkAction(images,[images[0],images[2]],'delete'),[images[1]]);
  assert.deepEqual(applyPhotoBulkAction(images,images,'delete'),[]);
  assert.equal(images.length,3);
});

test('selection from another attraction cannot affect the current photos',()=>{
  const images=[{id:1,activa:true}];
  assert.deepEqual(applyPhotoBulkAction(images,[{id:1}],'delete'),images);
  assert.deepEqual(applyPhotoBulkAction(images,[],'deactivate'),images);
});
