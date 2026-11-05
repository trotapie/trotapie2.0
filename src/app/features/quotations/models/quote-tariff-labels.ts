import type {QuoteData} from './quote-tariffs';

/** Resolve saved catalog IDs without exposing internal IDs to the traveler. */
export function quoteRoomTypeName(room:QuoteData,key:string,types:QuoteData[],quote:QuoteData={}):string {
  const id=room[key]?.id;
  const catalog=id!=null?types.find(type=>Number(type.id)===Number(id)):undefined;
  const saved=room.source?.[key];
  const baseId=room.source?.tipo_habitacion_id??quote.tipo_habitacion_id;
  const baseName=(key==='tipoHabitacion'||(id!=null&&Number(id)===Number(baseId)))
    ?room.source?.nombre_habitacion||quote.nombre_habitacion:undefined;
  return catalog?.nombre_habitacion||saved?.nombre_habitacion||baseName||'Por confirmar';
}

export function quoteOriginName(room:QuoteData,key:string,origins:QuoteData[]):string {
  const id=room[key];
  const catalog=id!=null?origins.find(origin=>Number(origin.id)===Number(id)):undefined;
  const saved=room.source?.[key];
  return catalog?.clave||saved?.clave||catalog?.nombre_cotizador||saved?.nombre_cotizador||'Por confirmar';
}
