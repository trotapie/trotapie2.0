export const HOTEL_DESTINATION_LIMIT=25;

export function destinationSearchTerm(value:string):string{
  return value.replace(/[%_,]/g,'').trim().slice(0,100);
}

/** A single bounded request, never a traversal of the destination catalog. */
export async function searchHotelDestinations(client:{from(table:string):any},search:string){
  let query=client.from('catalogo_destinos').select('id,nombre').eq('activo',true);
  const term=destinationSearchTerm(search);
  if(term)query=query.ilike('nombre',`%${term}%`);
  const {data,error}=await query.order('nombre').order('id').limit(HOTEL_DESTINATION_LIMIT);
  if(error)throw error;
  return (data||[]).map((row:{id:number;nombre:string})=>({value:Number(row.id),label:row.nombre}));
}

/** Resolve the saved destination even if it is no longer active. */
export async function selectedHotelDestination(client:{from(table:string):any},id:number){
  if(!Number.isSafeInteger(id)||id<=0)return null;
  const {data,error}=await client.from('catalogo_destinos').select('id,nombre').eq('id',id).maybeSingle();
  if(error)throw error;
  return data?{value:Number(data.id),label:String(data.nombre)}:null;
}
