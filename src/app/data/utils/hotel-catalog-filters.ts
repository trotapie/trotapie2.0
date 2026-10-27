export interface HotelExtraFilters {regimeId?:number|null;stars?:number|null;sort?:string;}

export function hasHotelDestination(destinationId:number|undefined):boolean{return Number.isSafeInteger(destinationId)&&Number(destinationId)>0;}

export function hotelCatalogFilters<T extends {ilike(column:string,value:string):T;eq(column:string,value:string|number|boolean):T}>(query:T,search:string,destinationId:number|undefined,status:string,statusAvailable:boolean,extras:HotelExtraFilters={}):T {
  if(search.trim())query=query.ilike('nombre_hotel',`%${search.replace(/[%_,]/g,'').trim()}%`);
  if(destinationId)query=query.eq('catalogo_destino_id_resuelto',destinationId);
  if(statusAvailable&&status)query=query.eq('activo',status==='activo');
  if(extras.regimeId)query=query.eq('regimen_id',extras.regimeId);
  return query;
}

export async function hotelStatusColumnAvailable(client:{from(table:string):any}):Promise<boolean>{
  const {error}=await client.from('hoteles').select('activo').limit(0);
  if(error&&['42703','PGRST204'].includes(error.code))return false;
  if(error)throw error;
  return true;
}

export async function activeHotelDestinationOptions(loadPage:(page:number)=>Promise<{items:{id:string;title:string;raw:{activo?:boolean}}[];total:number}>){
  const options:{value:number;label:string}[]=[];
  let read=0;
  for(let page=0;;page++){
    const result=await loadPage(page);
    for(const row of result.items)if(row.raw.activo===true)options.push({value:Number(row.id),label:row.title});
    read+=result.items.length;
    if(!result.items.length||read>=result.total)break;
  }
  return options.sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
