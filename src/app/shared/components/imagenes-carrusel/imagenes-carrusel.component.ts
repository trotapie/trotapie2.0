import {Component,Input,computed,signal,viewChild,afterNextRender,DestroyRef} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PhotoCarousel} from '../photo-carousel/photo-carousel';
import {Dialog} from '../dialog/dialog';
import {Button} from '../button/button';
import {LanguageService} from '../../../core/services/language.service';
import {inject} from '@angular/core';

@Component({selector:'app-imagenes-carrusel,tp-image-gallery',imports:[PhotoCarousel,Dialog,Button,RouterLink],templateUrl:'./imagenes-carrusel.component.html',styleUrl:'./imagenes-carrusel.component.scss',host:{'(keydown)':'onViewerKeydown($event)'}})
export class ImagenesCarruselComponent {
  private records=signal<any[]>([]);
  @Input() set imagenesCargadas(value:any[]){this.records.set(value||[]);this.selectedTipoId.set(0);}
  @Input() hotel:{id?:number;nombre_hotel?:string}|null=null;
  @Input() soloModal=false;
  @Input() layout:'strip'|'grid'='strip';
  @Input() triggerLabel='Ver galería';
  language=inject(LanguageService);
  isOpen=signal(false);
  selectedTipoId=signal(0);
  initialIndex=signal(0);
  viewer=viewChild(PhotoCarousel);
  private destroyRef=inject(DestroyRef);
  readonly thumbnailLimit=signal(4);
  constructor(){
    afterNextRender(()=>{
      const phone=matchMedia('(max-width:600px)');
      const update=()=>this.thumbnailLimit.set(phone.matches?6:4);
      update();phone.addEventListener('change',update);
      this.destroyRef.onDestroy(()=>phone.removeEventListener('change',update));
    });
  }
  tiposImagen=computed(()=>{
    const types=new Map<number,any>();
    for(const item of this.records()){
      const id=Number(item?.tipo_imagen_id??item?.tipo?.id)||-1;
      types.set(id,{...item?.tipo,id});
    }
    return [...types.values()];
  });
  allPhotos=computed(()=>this.records().map(item=>({src:typeof item==='string'?item:item.url_imagen||item.imagen_url||item.url||'',title:typeof item==='string'?'':item.nombre||this.getTipoLabel(item.tipo||{id:Number(item.tipo_imagen_id)||-1}),typeId:Number(item?.tipo_imagen_id??item?.tipo?.id)||-1})).filter(photo=>!!photo.src));
  photos=computed(()=>this.allPhotos().filter(photo=>!this.selectedTipoId()||photo.typeId===this.selectedTipoId()));
  previewPhotos=computed(()=>this.layout==='grid'?this.allPhotos().slice(0,this.thumbnailLimit()):this.photos());
  open(index=0){if(this.layout==='grid')this.selectedTipoId.set(0);this.initialIndex.set(index);this.isOpen.set(true);}
  close(){this.isOpen.set(false);}
  onTipoChange(id:number){this.selectedTipoId.set(id);this.initialIndex.set(0);}
  goTo(index:number){this.viewer()?.index.set(index);this.viewer()?.paused.set(true);}
  getTipoLabel(tipo:any){return tipo.traducciones?.find((translation:any)=>translation.lang===this.language.language())?.descripcion||tipo.traducciones?.find((translation:any)=>translation.lang==='es')?.descripcion||tipo.clave||(tipo.id===-1?this.language.translateText('Sin clasificación','Uncategorized'):this.language.translateText('Tipo ','Type ')+tipo.id);}
  onViewerKeydown(event:KeyboardEvent){
    if(!this.isOpen()||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();this.viewer()?.paused.set(true);this.viewer()?.move(event.key==='ArrowLeft'?-1:1);
  }
  imageError(event:Event){
    const image=event.target as HTMLImageElement;
    image.classList.add('image-unavailable');
    if(!image.src.endsWith('/brand/iso.png'))image.src='/brand/iso.png';
  }
}
