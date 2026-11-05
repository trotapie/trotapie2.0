import {Component,input,output,linkedSignal,computed} from '@angular/core';
import type {PhotoBulkAction} from '../../utils/photo-bulk-action';
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
  bulkAction=output<{images:Record<string,any>[];action:PhotoBulkAction}>();
  selection=linkedSignal<Set<Record<string,any>>>(()=>{this.images();return new Set();});
  allSelected=computed(()=>this.images().length>0&&this.selection().size===this.images().length);
  select(image:Record<string,any>,checked:boolean){if(this.busy())return;this.selection.update(current=>{const next=new Set(current);if(checked)next.add(image);else next.delete(image);return next;});}
  selectAll(checked:boolean){if(!this.busy())this.selection.set(new Set(checked?this.images():[]));}
  apply(action:PhotoBulkAction){if(this.busy()||!this.selection().size)return;this.bulkAction.emit({images:[...this.selection()],action});}
}
