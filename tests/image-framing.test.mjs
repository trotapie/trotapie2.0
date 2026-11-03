import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImageFraming, imageFramingStyle, imageFramingSize} from '../src/app/shared/models/image-framing.ts';
import {homeImagePanPosition} from '../src/app/shared/models/home-image-style.ts';
import {imageStylePayload} from '../src/app/shared/models/image-style-payload.ts';

test('photos default to the complete original at 100 percent zoom', () => {
  assert.deepEqual(normalizeImageFraming({}), {imagen_zoom:1,imagen_x:50,imagen_y:50});
  assert.equal(imageFramingStyle({}).transform, 'scale(1)');
  assert.equal(imageFramingStyle({})['object-fit'], 'contain');
});

test('framing rejects invalid values and clamps to the slider limits', () => {
  assert.deepEqual(normalizeImageFraming({imagen_zoom:10,imagen_x:-20,imagen_y:200}), {imagen_zoom:3,imagen_x:0,imagen_y:100});
  assert.deepEqual(normalizeImageFraming({imagen_zoom:NaN,imagen_x:null,imagen_y:Infinity}), {imagen_zoom:1,imagen_x:50,imagen_y:50});
  assert.equal(normalizeImageFraming({imagen_zoom:0}).imagen_zoom, 0.5);
});

test('zoom and pan survive the save payload and render identically after reload', () => {
  const image = {id:12,imagen_url:'photo.jpg',imagen_zoom:1.75,imagen_x:24,imagen_y:68,titulo_x:10};
  const payload = imageStylePayload(image);
  const loaded = JSON.parse(JSON.stringify(payload));
  assert.equal(payload.imagen_zoom, 1.75);
  assert.equal(payload.imagen_x, 24);
  assert.equal(payload.imagen_y, 68);
  assert.equal(payload.titulo_x, 10);
  assert.equal(payload.id, undefined);
  assert.deepEqual(imageFramingStyle(loaded), imageFramingStyle(image));
  assert.deepEqual(imageFramingStyle(loaded), {'object-fit':'contain','object-position':'24% 68%',transform:'scale(1.75)','transform-origin':'24% 68%'});
});

test('portrait, landscape and square originals fit without cropping before zoom', () => {
  for (const ratio of [0.5, 1, 1.6, 2]) {
    const fitted = imageFramingSize(800, 500, ratio);
    assert.ok(fitted.width <= 800 && fitted.height <= 500);
    assert.equal(fitted.width / fitted.height, ratio);
    assert.ok(fitted.width === 800 || fitted.height === 500);
  }
  assert.deepEqual(imageFramingSize(800, 500, 0.5), {width:250,height:500});
});

test('panning uses the complete fitted portrait dimensions at low and high zoom', () => {
  const photo = imageFramingSize(800, 500, 0.5);
  for (const zoom of [0.5, 0.66, 1, 2, 3]) {
    for (const [frame, size] of [[800, photo.width], [500, photo.height]]) {
      const travel = frame - size * zoom;
      const position = homeImagePanPosition(50, 5, frame, size, zoom);
      if (Math.abs(travel) < 0.01) assert.equal(position, 50);
      else assert.ok(Math.abs((position - 50) / 100 * travel - 5) < 0.00001);
    }
  }
});

test('zoom below 100 percent is preserved when saving and reopening the photo', () => {
  for (const zoom of [0.5, 0.75, 1]) {
    const saved = JSON.parse(JSON.stringify(imageStylePayload({imagen_zoom:zoom,imagen_x:25,imagen_y:60})));
    assert.equal(normalizeImageFraming(saved).imagen_zoom, zoom);
    assert.equal(imageFramingStyle(saved).transform, `scale(${zoom})`);
  }
});
