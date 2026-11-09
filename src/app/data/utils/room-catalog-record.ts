/** Keep editable association IDs and readable bed labels together in catalog records. */
export function roomCatalogRecord(row:Record<string,any>){
  const beds:Array<{tipo_cama_id:number;tipo_cama?:{nombre?:string;activo?:boolean}|null}>=row['camas']??[];
  const labels=beds.map(bed=>{
    const name=bed.tipo_cama?.nombre?.trim()||'Tipo de cama no disponible';
    return bed.tipo_cama?.activo===false?`${name} (inactiva)`:name;
  });
  return {...row,cama_ids:beds.map(bed=>bed.tipo_cama_id),camas_detalle:labels,camas_configuradas:labels[0]||'Sin camas configuradas'};
}
