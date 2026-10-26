import {test} from 'node:test';
import assert from 'node:assert/strict';
import {driveImageThumbnailUrl} from '../src/app/data/utils/drive-image-url.ts';

const id = '1r5EPhJgMdjxmCzF1P_wmghdjeCs4YFNL';
const expected = `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

test('converts public Drive URLs to w1000 thumbnails preserving the file ID', () => {
  for (const url of [
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/file/d/${id}/view?usp=sharing`,
    `https://drive.usercontent.google.com/download?id=${id}&export=view`,
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w200`,
    expected,
  ]) assert.equal(driveImageThumbnailUrl(url), expected);
});

test('leaves other providers and unrecognized links unchanged', () => {
  for (const url of ['https://example.com/photo.jpg', 'https://example.com/uc?id=other',
    'https://drive.google.com/drive/folders/folder-id', 'not a URL', '']) {
    assert.equal(driveImageThumbnailUrl(url), url);
  }
});
