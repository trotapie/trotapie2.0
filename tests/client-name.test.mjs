import {test} from 'node:test';
import assert from 'node:assert/strict';
import {construirNombreClienteVisible} from '../src/app/data/utils/cliente-nombre.util.ts';
import {quoteWhatsAppUrl} from '../src/app/features/quotations/models/quote-whatsapp.ts';

test('includes the selected prefix and advisor in the WhatsApp request',()=>{
  const name=construirNombreClienteVisible({nombreCompleto:' Ana Pérez ',tratamientoAbreviacion:' Lic. '});
  assert.equal(name,'Lic. Ana Pérez');
  const url=quoteWhatsAppUrl({name,phone:'6181234567',email:'',destination:'Acapulco',start:'2026-12-20',end:'2026-12-23',nights:3,rooms:[{adults:2,children:0,childAges:[]}],hotels:[{name:'Emporio',regime:'Todo incluido'}],notes:'',advisor:'María López'});
  const message=new URL(url).searchParams.get('text');
  assert.ok(message.startsWith('Hola, soy Lic. Ana Pérez'));
  assert.ok(message.includes('Asesor: María López'));
});

test('allows a name without a prefix',()=>{
  assert.equal(construirNombreClienteVisible({nombreCompleto:' Ana Pérez ',tratamientoAbreviacion:null}),'Ana Pérez');
});
