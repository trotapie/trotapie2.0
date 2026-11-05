export function imageTypeLabel(type:any,catalog:any[],language:string):string {
  const saved=catalog.find(item=>Number(item.id)===Number(type?.id));
  const sources=[saved,type].filter(Boolean);
  for(const lang of [language,'es']){
    for(const source of sources){
      const description=source.traducciones?.find((translation:any)=>translation.lang===lang)?.descripcion||source.traducciones_preview?.[lang]?.descripcion;
      if(description?.trim())return description;
    }
  }
  return sources.map(source=>source.descripcion||source.nombre||source.clave).find(value=>typeof value==='string'&&value.trim())
    ||(Number(type?.id)===-1?(language==='en'?'Uncategorized':'Sin clasificación'):(language==='en'?'Photos':'Fotografías'));
}
