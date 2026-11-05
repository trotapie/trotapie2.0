import {ImagePreview} from '../image-preview/image-preview';
import {HotelDestinationSelect} from '../hotel-destination-select/hotel-destination-select';
import {changeSnapshot} from '../../../core/utils/change-snapshot';
import {Component,input,output,signal,effect} from '@angular/core';import {FormsModule} from '@angular/forms';import type {FieldDefinition} from '../../models/resource-definition';import {Button} from '../button/button';
import {TpInputComponent} from '../tp-input/tp-input.component';
import {TpTextareaComponent} from '../tp-textarea/tp-textarea.component';
import {TpSelectSearchComponent} from '../tp-select-search/tp-select-search.component';
import {CustomSwitchComponent} from '../custom-switch/custom-switch.component';
import {LocationEditor} from '../location-editor/location-editor';
@Component({selector:'tp-resource-form',imports:[LocationEditor,HotelDestinationSelect,ImagePreview,FormsModule,Button,TpInputComponent,TpTextareaComponent,TpSelectSearchComponent,CustomSwitchComponent],templateUrl:'./resource-form.html',styleUrl:'./resource-form.scss'})
export class ResourceForm {preview=signal<{url:string;title:string}|null>(null);submitLabel=input('Guardar cambios');busyLabel=input('Guardando…');fields=input<FieldDefinition[]>([]);value=input<Record<string,any>>({});editing=input(false);busy=input(false);disabled=input(false);saved=output<Record<string,any>>();cancelled=output<void>();model=signal<Record<string,any>>({});constructor(){effect(()=>this.model.set(structuredClone(this.value())));}set(key:string,value:any){this.model.update(m=>({...m,[key]:value}));}
 hasChanges(){return !this.disabled()&&changeSnapshot(this.value())!==changeSnapshot(this.model());}
 visible(field:FieldDefinition){return !field.visibleWhen||String(this.model()[field.visibleWhen.key])===String(field.visibleWhen.value);}
 previewRequested=output<string>();
}


