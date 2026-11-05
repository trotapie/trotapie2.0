type HotelPhoto=Record<string,any>;

/** Keep persisted IDs and other metadata when changing a photo's classification. */
export function classifyHotelPhoto(images:HotelPhoto[],url:string,typeId:number|null):HotelPhoto[]{
  const existing=images.find(image=>image['url_imagen']===url);
  const updated={...existing,url_imagen:url,tipo_imagen_id:typeId};
  return existing?images.map(image=>image===existing?updated:image):[...images,updated];
}

/** Only classify selected photos that still belong to the current gallery. */
export function classifyHotelPhotos(images:HotelPhoto[],gallery:string[],selected:string[],typeId:number|null):HotelPhoto[]{
  const available=new Set(gallery);
  return [...new Set(selected)].filter(url=>available.has(url)).reduce((draft,url)=>classifyHotelPhoto(draft,url,typeId),images);
}

export function groupHotelPhotos(gallery:string[],images:HotelPhoto[],types:{value:string|number;label:string}[]){
  const groups=new Map<number|null,{id:number|null;label:string;urls:string[]}>();
  groups.set(null,{id:null,label:'Sin tipo',urls:[]});
  for(const type of types){
    const id=Number(type.value)||null;
    if(id)groups.set(id,{id,label:type.label,urls:[]});
  }
  const metadata=new Map(images.map(image=>[image['url_imagen'],image]));
  for(const url of new Set(gallery)){
    const image=metadata.get(url);
    const id=Number(image?.['tipo_imagen_id'])||null;
    if(!groups.has(id)){
      const label=image?.['tipo']?.traducciones?.find((translation:HotelPhoto)=>translation['lang']==='es')?.descripcion;
      groups.set(id,{id,label:label||`Tipo #${id}`,urls:[]});
    }
    groups.get(id)!.urls.push(url);
  }
  return [...groups.values()];
}
