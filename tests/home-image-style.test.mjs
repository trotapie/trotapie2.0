import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_IMAGE_STYLE, HOME_IMAGE_POSITIONS, normalizeHomeImageStyle, homeImagePhotoStyle, homeImageTextStyle, homeImagePanPosition} from '../src/app/shared/models/home-image-style.ts';

test('drag follows the pointer above and below 100% zoom on both axes',()=>{
  for(const [frameSize,photoSize] of [[400,400],[250,250],[250,350]]){
    for(const zoom of [0.5,0.75,1,1.5,3]){
      const travel=frameSize-photoSize*zoom;
      for(const delta of [-1,1]){
        const position=homeImagePanPosition(50,delta,frameSize,photoSize,zoom);
        if(Math.abs(travel)<0.01) assert.equal(position,50);
        else assert.ok(Math.abs((position-50)/100*travel-delta)<0.00001);
      }
    }
  }
  assert.equal(homeImagePanPosition(50,1000,400,400,0.5),100);
  assert.equal(homeImagePanPosition(50,1000,400,400,2),0);
});

test('legacy home images retain the current homepage appearance',()=>{
  for(const value of [undefined,null,{},'invalid']) assert.deepEqual(normalizeHomeImageStyle(value),HOME_IMAGE_STYLE);
  assert.notEqual(normalizeHomeImageStyle({}),HOME_IMAGE_STYLE);
});

test('home image settings clamp framing and typography and reject invalid styles',()=>{
  assert.deepEqual(normalizeHomeImageStyle({zoom:9,x:-20,y:200,textSize:99,textColor:'red',textBackground:'url(x)',textPosition:'custom',descripcion:'not supported'}),{
    ...HOME_IMAGE_STYLE,zoom:3,x:0,y:100,textSize:11,
  });
  assert.equal(normalizeHomeImageStyle({zoom:NaN,x:null,y:Infinity,textSize:''}).textSize,11);
  assert.equal(normalizeHomeImageStyle({textSize:48}).textSize,11);
  assert.equal(normalizeHomeImageStyle({zoom:0}).zoom,0.5);
});

test('zooming out survives saving and uses the same scale in preview and public rendering',()=>{
  const style=normalizeHomeImageStyle({zoom:0.75,x:25,y:60});
  assert.equal(style.zoom,0.75);
  assert.deepEqual(normalizeHomeImageStyle(JSON.parse(JSON.stringify(style))),style);
  assert.equal(homeImagePhotoStyle(style).transform,'scale(0.75)');
  assert.equal(normalizeHomeImageStyle({zoom:0.5}).zoom,0.5);
  assert.equal(normalizeHomeImageStyle({zoom:-1}).zoom,0.5);
  assert.equal(HOME_IMAGE_STYLE.zoom,1);
});

test('saved framing and name styling survive normalization without changing the record',()=>{
  const style={zoom:1.6,x:25,y:75,textColor:'#e8b636',textBackground:'#125c47',textSize:11,textPosition:'bottom-center'};
  const image={url_imagen:'https://example.com/photo.jpg',nombre_destino:'Antigua, Guatemala',activo:true,presentacion:style};
  assert.deepEqual(normalizeHomeImageStyle(JSON.parse(JSON.stringify(image)).presentacion),style);
  assert.deepEqual(homeImagePhotoStyle(style),{'object-position':'25% 75%',transform:'scale(1.6)','transform-origin':'25% 75%'});
  assert.equal(image.nombre_destino,'Antigua, Guatemala');
  assert.deepEqual(image.presentacion,style);
});

test('all nine name positions render consistently in editor and public carousel',()=>{
  for(const textPosition of HOME_IMAGE_POSITIONS){
    const style=homeImageTextStyle({textPosition,textSize:28,textColor:'#e8b636'});
    assert.equal(style.color,'#e8b636');
    assert.equal(style['font-size'],'11px');
    assert.equal(style.right,textPosition.endsWith('right')?'24px':'auto');
    assert.equal(style.bottom,textPosition.startsWith('bottom')?'84px':'auto');
  }
  assert.equal(homeImageTextStyle({textPosition:'center'}).transform,'translate(-50%,-50%)');
});

test('resetting home design does not clear content or activation',()=>{
  const image={nombre_destino:'Durango',activo:false,url_imagen:'https://example.com/photo.jpg',presentacion:normalizeHomeImageStyle({zoom:2})};
  const reset={...image,presentacion:{...HOME_IMAGE_STYLE}};
  assert.equal(reset.nombre_destino,image.nombre_destino);
  assert.equal(reset.activo,false);
  assert.equal(reset.url_imagen,image.url_imagen);
  assert.equal(image.presentacion.zoom,2);
});
