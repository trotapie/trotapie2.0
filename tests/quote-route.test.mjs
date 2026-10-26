import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseQuoteRoute,quoteAdminSegment} from '../src/app/features/quotations/models/quote-route.ts';

const publicId='168160c7-dee6-4ed3-bdee-680316a30096';

test('extracts the internal ID without splitting the public UUID',()=>{
  assert.deepEqual(parseQuoteRoute(`123-${publicId}`),{internalId:123,publicId});
  assert.equal(quoteAdminSegment('123',publicId),`123-${publicId}`);
});

test('keeps old public-ID links readable and avoids unsafe numeric IDs',()=>{
  assert.deepEqual(parseQuoteRoute(publicId),{internalId:null,publicId});
  for(const id of ['0','-1','1.5','9007199254740992']){
    const segment=`${id}-${publicId}`;
    assert.equal(parseQuoteRoute(segment).internalId,null);
    assert.equal(quoteAdminSegment(id,publicId),publicId);
  }
});
