import {isClassifiedImage} from '../../../data/utils/classified-image';

type QuoteRow = Record<string, any>;
export interface QuotePrice { label: string; amount: number; conditions: string[]; deadline: string | null; room: string | null; }

function amount(value: unknown): number | null {
  if (value == null || (typeof value !== 'number' && typeof value !== 'string') || typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function conditions(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : item?.descripcion || item?.titulo || '').filter(Boolean) : [];
}
export function quotePrices(row: QuoteRow): QuotePrice[] {
  const labels: Record<string,string> = {sin_seguro:'Tarifa de hospedaje',con_seguro:'Con seguro',a_meses:'A meses'};
  if (Array.isArray(row.precios) && row.precios.length) {
    return row.precios.flatMap((price: QuoteRow) => {
      const value = amount(price.precio);
      return value === null ? [] : [{label:labels[price.tipo] || 'Tarifa de hospedaje',amount:value,conditions:conditions(price.condiciones),deadline:(price.tipo==='con_seguro'?row.fecha_limite_seguro:price.tipo==='a_meses'?row.fecha_limite_meses:null) || null,room:null}];
    });
  }
  const rooms = Array.isArray(row.cotizacion_multiple) && row.cotizacion_multiple.length ? row.cotizacion_multiple : [row];
  return rooms.flatMap((room: QuoteRow,index: number) => [
    {label:labels.sin_seguro,value:room.precio ?? room.precio_cotizacion,conditions:room.condiciones_precio,deadline:null},
    {label:labels.con_seguro,value:room.precio_con_seguro,conditions:room.condiciones_precio_seguro,deadline:room.fecha_limite_seguro || row.fecha_limite_seguro},
    {label:labels.a_meses,value:room.precio_a_meses,conditions:room.condiciones_precio_meses,deadline:room.fecha_limite_meses || row.fecha_limite_meses}
  ].flatMap(price => {const value=amount(price.value);return value===null?[]:[{label:price.label,amount:value,conditions:conditions(price.conditions),deadline:price.deadline || null,room:rooms.length>1?`Habitación ${index+1}`:null}];}));
}
export function quotePhotos(row: QuoteRow): Array<{url_imagen:string;nombre:string;tipo_imagen_id:number;tipo?:any}> {
  const images=Array.isArray(row.imagenes)?row.imagenes:[];
  return images.filter(isClassifiedImage).map(image=>({...image,url_imagen:image.url_imagen||image.url||image.imagen_url||'',nombre:image.descripcion||image.nombre||'',tipo_imagen_id:Number(image.tipo_imagen_id??image.tipo?.id)})).filter(photo=>!!photo.url_imagen);
}
export function quoteRoomText(row: QuoteRow): string {
  return typeof row.habitaciones==='string'?row.habitaciones:row.habitaciones?.es||row.habitaciones?.traduccion||'';
}
export function quoteDate(value: string | null | undefined): string {
  if(!value)return 'Por confirmar';
  const key=value.slice(0,10),date=new Date(key+'T12:00:00Z');
  return Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==key?'Por confirmar':new Intl.DateTimeFormat('es-MX',{weekday:'short',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
}
