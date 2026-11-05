import {AttractionPhotos} from '../attraction-photos/attraction-photos';
import type {PhotoBulkAction} from '../../utils/photo-bulk-action';
import {selectedIndexAfterMove} from '../../utils/attraction-selection';
import {Component,input,output,signal,computed} from '@angular/core';
import {FormsModule} from '@angular/forms';
import type {IActividadPreviewAdmin} from '../../../../data/queries/supabase.service';
import {Button} from '../../../../shared/components/button/button';
import {Icon} from '../../../../shared/components/icon/icon';
import {Field} from '../../../../shared/components/field/field';
import {State} from '../../../../shared/components/state/state';
import {TpSelectSearchComponent} from '../../../../shared/components/tp-select-search/tp-select-search.component';
import {CustomSwitchComponent} from '../../../../shared/components/custom-switch/custom-switch.component';
import {MotionDirective} from '../../../../shared/directives/motion.directive';

@Component({selector:'tp-attractions-workspace',imports:[FormsModule,Button,Icon,Field,State,AttractionPhotos,TpSelectSearchComponent,CustomSwitchComponent,MotionDirective],templateUrl:'./attractions-workspace.html',styleUrl:'./attractions-workspace.scss'})
export class AttractionsWorkspace {
  activities=input<IActividadPreviewAdmin[]>([]);
  types=input<Array<{id:number;nombre:string}>>([]);
  language=input(1);busy=input(false);
  importing=input(false);
  added=output<void>();reordered=output<{from:number;to:number}>();
  toggled=output<{activity:IActividadPreviewAdmin;active:boolean}>();
  imageEdited=output<{activity:IActividadPreviewAdmin;image:Record<string,any>}>();
  imageToggled=output<{activity:IActividadPreviewAdmin;image:Record<string,any>;active:boolean}>();
  imagesBulkAction=output<{activity:IActividadPreviewAdmin;images:Record<string,any>[];action:PhotoBulkAction}>();
  imageAdded=output<{activity:IActividadPreviewAdmin;url:string}>();
  driveImported=output<{activity:IActividadPreviewAdmin;url:string}>();
  index=signal(0);
  selected=computed(()=>this.activities()[Math.min(this.index(),this.activities().length-1)]);
  typeOptions=computed(()=>this.types().map(type=>({value:type.id,label:type.nombre})));
  newImage='';driveFolder='';private dragIndex:number|null=null;
  select(index:number){this.index.set(index);this.newImage='';this.driveFolder='';}
  selectLast(){this.select(Math.max(0,this.activities().length-1));}
  add(){this.added.emit();this.selectLast();}
  text(activity:IActividadPreviewAdmin){activity.traducciones??={};activity.traducciones[this.language()]??={nombre:'',descripcion:''};return activity.traducciones[this.language()];}
  title(activity:IActividadPreviewAdmin,index?:number){return this.text(activity).nombre?.trim()||this.types().find(type=>type.id===activity.catalogo_atraccion_id)?.nombre||`Atracción ${(index??this.index())+1}`;}
  thumbnail(activity:IActividadPreviewAdmin){return activity.imagen_fondo||activity.imagenes?.[0]?.imagen_url||'';}
  move(from:number,to:number){
    if(this.busy()||from===to||to<0||to>=this.activities().length)return;
    const current=this.index();this.index.set(selectedIndexAfterMove(current,from,to));
    this.reordered.emit({from,to});
  }
  startDrag(event:DragEvent,index:number){if(this.busy()){event.preventDefault();return;}this.dragIndex=index;event.dataTransfer?.setData('text/plain',String(index));if(event.dataTransfer)event.dataTransfer.effectAllowed='move';}
  drop(event:DragEvent,index:number){event.preventDefault();if(this.dragIndex!==null)this.move(this.dragIndex,index);this.dragIndex=null;}
  endDrag(){this.dragIndex=null;}
  addImage(activity:IActividadPreviewAdmin){if(!/^https?:\/\//i.test(this.newImage.trim()))return;this.imageAdded.emit({activity,url:this.newImage.trim()});this.newImage='';}
}

