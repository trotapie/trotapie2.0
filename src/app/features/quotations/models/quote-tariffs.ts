export type QuoteData = Record<string, any>;
export interface QuoteTariffDefinition {
  type: string;
  label: string;
  priceKey: string;
  roomKey: string;
  originKey: string;
  policyKey: string;
  percentKey: string | null;
}
export const QUOTE_TARIFFS: readonly QuoteTariffDefinition[] = [
  {type:'sin_seguro',label:'No reembolsable',priceKey:'precio',roomKey:'tipoHabitacion',originKey:'origenReservacionPrecio',policyKey:'condicionesPrecioSinSeguro',percentKey:null},
  {type:'con_seguro',label:'Apartado',priceKey:'precioConSeguro',roomKey:'tipoHabitacionConSeguro',originKey:'origenReservacionConSeguro',policyKey:'condicionesPrecioConSeguro',percentKey:'porcentajeSeguro'},
  {type:'a_meses',label:'A meses',priceKey:'precioMeses',roomKey:'tipoHabitacionMeses',originKey:'origenReservacionMeses',policyKey:'condicionesPrecioMeses',percentKey:'porcentajeMeses'}
];
export function tariffNumber(value: unknown): number | null {
  if(value==null||String(value).trim()==='')return null;
  const n=Number(String(value).replace(/[$,\s]/g,''));
  return Number.isFinite(n)?n:null;
}
function roomId(value:any):number|null{return tariffNumber(value?.id??value);}
export function quoteTariffRooms(quote:QuoteData):QuoteData[]{
  let saved=quote.cotizacion_multiple;
  if(typeof saved==='string'){try{saved=JSON.parse(saved);}catch{saved=[];}}
  const hasSaved=Array.isArray(saved)&&saved.length>0;
  const text:string=typeof quote.habitaciones==='string'?quote.habitaciones:quote.habitaciones?.es||quote.habitaciones?.traduccion||'';
  const normalized=text.replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim();
  const segments=Array.from(normalized.matchAll(/habitaci[oó]n\s*(\d+)\s*:\s*(.*?)(?=habitaci[oó]n\s*\d+\s*:|$)/gi),match=>match[2].trim());
  const details=segments.length?segments:text.split(/\r?\n/).map((line:string)=>line.trim()).filter((line:string)=>/\d+\s*(?:adultos?|niños?|menores?)/i.test(line));
  const count=Math.max(hasSaved?saved.length:1,details.length,Number(text.match(/(\d+)\s*habitaciones\b/i)?.[1])||1);
  return Array.from({length:count},(_,index)=>{
    const source=hasSaved?saved[index]||{}:index===0?quote:{};
    const baseRoom=roomId(source.tipo_habitacion_id??source.tipo_habitacion??source.tipoHabitacion??quote.tipo_habitacion_id??quote.tipo_habitacion);
    const room:QuoteData={source:hasSaved?structuredClone(source):{},detalle:source.detalle_habitacion||source.detalleHabitacion||details[index]||(count===1?text:''),tipoTarifa:source.tipo_tarifa??source.tipoTarifa??quote.tipo_tarifa??'no_reembolsable'};
    for(const [i,tariff] of QUOTE_TARIFFS.entries()){
      const price=(!hasSaved&&index===0?quote.precios?.find((item:QuoteData)=>item.tipo===tariff.type):null);
      const priceColumn=['precio','precio_con_seguro','precio_a_meses'][i];
      const policyColumn=['condiciones_precio','condiciones_precio_seguro','condiciones_precio_meses'][i];
      const roomColumn=['tipo_habitacion_id','tipo_habitacion_id_con_seguro','tipo_habitacion_id_a_meses'][i];
      const originColumn=['origen_reservacion_precio_id','origen_reservacion_con_seguro_id','origen_reservacion_meses_id'][i];
      room[tariff.priceKey]=tariffNumber(source[priceColumn]??source[tariff.priceKey]??price?.precio??(i===0?source.precio_cotizacion:null));
      room[tariff.roomKey]={id:roomId(source[roomColumn]??source[tariff.roomKey])??baseRoom};
      room[tariff.originKey]=tariffNumber(source[originColumn]??source[tariff.originKey]);
      room[tariff.policyKey]=structuredClone(source[policyColumn]??source[tariff.policyKey]??price?.condiciones??[]);
      if(tariff.percentKey)room[tariff.percentKey]=tariffNumber(source[i===1?'porcentaje_seguro':'porcentaje_meses']??source[tariff.percentKey]??quote[i===1?'porcentaje_seguro':'porcentaje_meses']??price?.porcentaje)??0;
    }
    room.tipoTarifa=source.tipo_tarifa??source.tipoTarifa??room.condicionesPrecioMeses[0]?.tipoPoliticas??quote.tipo_tarifa??'no_reembolsable';
    return room;
  });
}
export function quoteTariffTotal(rooms:QuoteData[],key:string):number|null{
  const values=rooms.map(room=>tariffNumber(room[key])).filter((value):value is number=>value!==null);
  return values.length?Math.round(values.reduce((total,value)=>total+value,0)*100)/100:null;
}
export function quoteTariffValidation(rooms:QuoteData[]):string{
  for(const [index,room] of rooms.entries())for(const tariff of QUOTE_TARIFFS){
    const raw=room[tariff.priceKey];const price=tariffNumber(raw);
    if(raw!=null&&String(raw).trim()!==''&&(price===null||price<0))return `Revisa el precio de ${tariff.label} en la habitación ${index+1}.`;
    const percent=tariff.percentKey?tariffNumber(room[tariff.percentKey]):null;
    if(tariff.percentKey&&(percent===null||percent<0||percent>100))return `El porcentaje de apartado de ${tariff.label} debe estar entre 0 y 100.`;
  }
  return '';
}
export function quoteTariffPayload(rooms:QuoteData[],form:QuoteData):QuoteData{
  const first=rooms[0]||{};
  const months=form.tipoTarifa||first.tipoTarifa||'no_reembolsable';
  const cleanPolicies=(value:any,type?:string)=>(Array.isArray(value)?value:[]).filter(policy=>typeof policy==='string'?policy.trim():policy?.id!=null||policy?.descripcion||policy?.titulo).map(policy=>type&&typeof policy==='object'?{...policy,tipoPoliticas:type}:policy);
  const rows=rooms.map(room=>({
    ...room.source,
    tipo_habitacion_id:room.tipoHabitacion?.id??null,
    tipo_habitacion_id_con_seguro:room.tipoHabitacionConSeguro?.id??null,
    tipo_habitacion_id_a_meses:room.tipoHabitacionMeses?.id??null,
    precio:tariffNumber(room.precio),precio_con_seguro:tariffNumber(room.precioConSeguro),precio_a_meses:tariffNumber(room.precioMeses),
    origen_reservacion_precio_id:tariffNumber(room.origenReservacionPrecio),origen_reservacion_con_seguro_id:tariffNumber(room.origenReservacionConSeguro),origen_reservacion_meses_id:tariffNumber(room.origenReservacionMeses),
    condiciones_precio:cleanPolicies(first.condicionesPrecioSinSeguro),condiciones_precio_seguro:cleanPolicies(room.condicionesPrecioConSeguro),condiciones_precio_meses:cleanPolicies(room.condicionesPrecioMeses,months),
    porcentaje_seguro:tariffNumber(room.porcentajeSeguro),porcentaje_meses:tariffNumber(room.porcentajeMeses),
    fecha_limite_seguro:form.fechaLimiteSeguro||null,fecha_limite_meses:months==='apartado'?form.fechaLimiteMeses||null:null,tipo_tarifa:months
  }));
  return {...form,...first,condicionesPrecioSinSeguro:rows[0]?.condiciones_precio||[],condicionesPrecioConSeguro:rows[0]?.condiciones_precio_seguro||[],condicionesPrecioMeses:rows[0]?.condiciones_precio_meses||[],fechaLimiteMeses:months==='apartado'?form.fechaLimiteMeses||null:null,cotizacionMultiple:rows};
}
