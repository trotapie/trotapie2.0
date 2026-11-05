import type {Room} from './room';

export interface WhatsAppQuote {
  name: string;
  phone: string;
  email: string;
  destination: string;
  start: string;
  end: string;
  nights: number;
  rooms: Room[];
  hotels: Array<{name: string; regime: string}>;
  notes: string;
  advisor: string;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${day}/${months[Number(month) - 1]}/${year}`;
}

export function quoteWhatsAppUrl(quote: WhatsAppQuote): string {
  const rooms = quote.rooms.map((room, index) => {
    const adults = `${room.adults} ${room.adults === 1 ? 'adulto' : 'adultos'}`;
    const children = room.children
      ? ` · ${room.children} ${room.children === 1 ? 'niño' : 'niños'} · edades: ${room.childAges.join(', ')} ${room.children === 1 ? 'año' : 'años'}`
      : '';
    return `Habitación ${index + 1}: ${adults}${children}`;
  }).join('\n');
  const message = [
    `Hola, soy ${quote.name.trim()} y me interesa una cotización en el hotel ${quote.hotels.map(hotel => hotel.name).join(', ')} en ${quote.destination}.`,
    `Noches: ${quote.nights}`,
    `Régimen: ${quote.hotels.map(hotel => quote.hotels.length > 1 ? `${hotel.name}: ${hotel.regime}` : hotel.regime).join('; ')}`,
    `Fecha de entrada: ${formatDate(quote.start)}`,
    `Fecha de salida: ${formatDate(quote.end)}`,
    `Habitaciones: ${quote.rooms.length}`,
    rooms,
    `Peticiones especiales: ${quote.notes.trim() || 'Ninguna'}`,
    `Teléfono: ${quote.phone.trim()}`,
    `Correo: ${quote.email.trim() || 'No proporcionado'}`,
    `Asesor: ${quote.advisor}`,
  ].join('\n');
  return `https://wa.me/526188032003?text=${encodeURIComponent(message)}`;
}
