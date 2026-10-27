import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteWhatsAppUrl} from '../src/app/features/quotations/models/quote-whatsapp.ts';

const quote={
  name:' Ana & José ',phone:'6181234567',email:'ana@example.com',destination:'Acapulco',
  start:'2026-12-20',end:'2026-12-23',nights:3,
  rooms:[{adults:2,children:2,childAges:[5,12]},{adults:1,children:0,childAges:[]}],
  hotels:[{name:'Hotel Emporio Acapulco',regime:'Todo incluido'}],
  notes:'Cuna & habitación accesible',advisor:'Equipo Trotapie',
};

test('uses the original WhatsApp number with encoded trip and contact details',()=>{
  const url=new URL(quoteWhatsAppUrl(quote));
  assert.equal(url.origin+url.pathname,'https://wa.me/526188032003');
  const message=url.searchParams.get('text');
  for(const text of ['Ana & José','Hotel Emporio Acapulco en Acapulco','Noches: 3','Régimen: Todo incluido','20/dic/2026','23/dic/2026','Habitaciones: 2','Habitación 1: 2 adultos · 2 niños · edades: 5, 12 años','Habitación 2: 1 adulto','Cuna & habitación accesible','6181234567','ana@example.com','Asesor: Equipo Trotapie']){
    assert.ok(message.includes(text),text);
  }
  assert.equal([...url.searchParams.keys()].length,1);
});

test('handles optional contact details and identifies each hotel regime',()=>{
  const message=new URL(quoteWhatsAppUrl({...quote,email:'',notes:'',hotels:[...quote.hotels,{name:'Otro hotel',regime:'Por confirmar'}]})).searchParams.get('text');
  assert.ok(message.includes('Hotel Emporio Acapulco: Todo incluido; Otro hotel: Por confirmar'));
  assert.ok(message.includes('Peticiones especiales: Ninguna'));
  assert.ok(message.includes('Correo: No proporcionado'));
});
