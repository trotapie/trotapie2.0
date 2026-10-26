import {Component,input,output} from '@angular/core';
import type {IActividadPreviewAdmin} from '../../../../data/queries/supabase.service';
import {Button} from '../../../../shared/components/button/button';
import {Icon} from '../../../../shared/components/icon/icon';
import {Badge} from '../../../../shared/components/badge/badge';
import {FormsModule} from '@angular/forms';
import {CustomSwitchComponent} from '../../../../shared/components/custom-switch/custom-switch.component';
@Component({selector:'tp-attraction-photos',imports:[Button,Icon,Badge,FormsModule,CustomSwitchComponent],templateUrl:'./attraction-photos.html',styleUrl:'./attraction-photos.scss'})
export class AttractionPhotos {
  images=input<NonNullable<IActividadPreviewAdmin['imagenes']>>([]);title=input('Atracción');active=input(true);busy=input(false);
  edited=output<Record<string,any>>();
  toggled=output<{image:Record<string,any>;active:boolean}>();
}
