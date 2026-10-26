import {Component,input,output,signal} from '@angular/core';
import type {IActividadPreviewAdmin} from '../../../../data/queries/supabase.service';
import {Button} from '../../../../shared/components/button/button';
import {Icon} from '../../../../shared/components/icon/icon';
import {Badge} from '../../../../shared/components/badge/badge';
import {ImagePreview} from '../../../../shared/components/image-preview/image-preview';
@Component({selector:'tp-attraction-photos',imports:[Button,Icon,Badge,ImagePreview],templateUrl:'./attraction-photos.html',styleUrl:'./attraction-photos.scss'})
export class AttractionPhotos {
  images=input<NonNullable<IActividadPreviewAdmin['imagenes']>>([]);title=input('Atracción');active=input(true);busy=input(false);
  edited=output<Record<string,any>>();preview=signal<{src:string;title:string;image:Record<string,any>}|null>(null);
  editPreview(){const image=this.preview()?.image;this.preview.set(null);if(image)this.edited.emit(image);}
}
