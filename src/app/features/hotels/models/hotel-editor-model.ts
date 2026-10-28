type HotelData = Record<string, any>;

export const HOTEL_TIME_FIELDS = [
  {key:'check_in_desde',label:'Entrada desde'},
  {key:'check_in_hasta',label:'Entrada hasta'},
  {key:'check_out',label:'Salida'},
  {key:'desayuno_desde',label:'Desayuno desde'},
  {key:'desayuno_hasta',label:'Desayuno hasta'},
] as const;

export function hotelIds(values:unknown):number[] {
  return [...new Set((Array.isArray(values)?values:[]).map(Number).filter(id=>Number.isSafeInteger(id)&&id>0))];
}

export function hotelContentValue(model:HotelData|null,languageId:number,key:'nombre_hotel'|'descripcion'|'plan_todo_incluido'):string {
  if(languageId===1)return String(model?.[key==='plan_todo_incluido'?'planDescripcion':key]??'');
  const translation=model?.['traducciones']?.find((item:HotelData)=>Number(item['idioma_id'])===languageId);
  return key==='plan_todo_incluido'?translation?.[key]?.descripcion||'':translation?.[key]||'';
}

export function setHotelContentValue(model:HotelData,languageId:number,key:'nombre_hotel'|'descripcion'|'plan_todo_incluido',value:string):HotelData {
  if(languageId===1)return {...model,[key==='plan_todo_incluido'?'planDescripcion':key]:value};
  const translations=[...(model['traducciones']||[])];
  const index=translations.findIndex((item:HotelData)=>Number(item['idioma_id'])===languageId);
  const entry={...(index>=0?translations[index]:{idioma_id:languageId}),[key]:key==='plan_todo_incluido'?(value.trim()?{descripcion:value}:null):value};
  if(index>=0)translations[index]=entry;else translations.push(entry);
  return {...model,traducciones:translations};
}

export function hotelEditorDraft(detail:HotelData):HotelData {
  const spanish=detail['traducciones']?.find((item:HotelData)=>Number(item['idioma_id'])===1);
  return {...detail,
    horarios:{...(Object.hasOwn(detail,'horarios_configurados')?detail['horarios_configurados']:detail['horarios'])},
    traducciones:structuredClone(detail['traducciones']||[]),
    planDescripcion:spanish?.['plan_todo_incluido']?.descripcion||'',
    activityIds:hotelIds(detail['actividad_ids']??detail['actividades']?.map((item:HotelData)=>item['id'])),
    regimeIds:hotelIds([...(detail['regimen_ids']??detail['regimenes']?.map((item:HotelData)=>item['id'])??[]),detail['regimen_id']]),
    roomTypeIds:hotelIds(detail['tipos_habitacion_ids']),
    galleryUrls:(detail['imagenes']||[]).map((item:HotelData)=>item['url_imagen']).join('\n'),
  };
}

export function hotelDraftValidation(model:HotelData):string {
  if(Object.hasOwn(model,'regimeIds')&&model['regimen_id']&&!hotelIds(model['regimeIds']).includes(Number(model['regimen_id'])))return 'El régimen principal debe estar incluido entre los regímenes del hotel.';
  for(const field of HOTEL_TIME_FIELDS){
    const value=model['horarios']?.[field.key];
    if(value&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return `Revisa el horario de ${field.label.toLowerCase()}.`;
  }
  return '';
}

/** Keep all saved languages and photo IDs; only explicit draft changes replace them. */
export function hotelDetailPayload(model:HotelData){
  const text=(value:unknown)=>String(value??'').trim();
  const number=(value:unknown)=>value===''||value==null?null:Number(value);
  const plan=(value:unknown)=>text(value)?{descripcion:text(value)}:null;
  const existing:HotelData[]=model['imagenes']||[];
  const urls=[...new Set(text(model['galleryUrls']).split(/\r?\n/).map(url=>url.trim()).filter(Boolean))];
  const images=urls.map(url=>{const image=existing.find(item=>item['url_imagen']===url);return {id:image?.['id']||null,url_imagen:url,tipo_imagen_id:image?.['tipo_imagen_id']||null};});
  const removed=existing.filter(image=>!urls.includes(image['url_imagen'])).map(image=>({...image,eliminar:true}));
  const translations=(model['traducciones']||[]).filter((item:HotelData)=>Number(item['idioma_id'])!==1).map((item:HotelData)=>({...item,nombre_hotel:text(item['nombre_hotel'])||text(model['nombre_hotel'])}));
  const spanish=model['traducciones']?.find((item:HotelData)=>Number(item['idioma_id'])===1);
  translations.push({idioma_id:1,nombre_hotel:text(model['nombre_hotel']),descripcion:text(model['descripcion'])||null,
    plan_todo_incluido:Object.hasOwn(model,'planDescripcion')?plan(model['planDescripcion']):spanish?.['plan_todo_incluido']||null});
  const schedules=Object.fromEntries(HOTEL_TIME_FIELDS.map(field=>[field.key,model['horarios']?.[field.key]]).filter(([,value])=>!!value));
  return {nombre_hotel:text(model['nombre_hotel']),descripcion:text(model['descripcion'])||null,
    orden:number(model['orden']),estrellas:number(model['estrellas']),fondo:text(model['fondo'])||null,ubicacion:text(model['ubicacion'])||null,
    destino_id:number(model['destino_id']),catalogo_destino_id:number(model['catalogo_destino_id']),descuento_id:number(model['descuento_id']),
    regimen_id:number(model['regimen_id']),regimen_ids:hotelIds(model['regimeIds']??[model['regimen_id']]),actividad_ids:hotelIds(model['activityIds']),room_type_ids:hotelIds(model['roomTypeIds']),
    horarios:Object.keys(schedules).length?schedules:null,imagenes:[...images,...removed] as any,traducciones:translations};
}
