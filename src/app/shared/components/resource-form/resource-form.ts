import {ImagePreview} from '../image-preview/image-preview';
import {Component,input,output,signal,effect} from '@angular/core';import {FormsModule} from '@angular/forms';import type {FieldDefinition} from '../../models/resource-definition';import {Button} from '../button/button';
import {TpInputComponent} from '../tp-input/tp-input.component';
import {TpTextareaComponent} from '../tp-textarea/tp-textarea.component';
import {TpSelectSearchComponent} from '../tp-select-search/tp-select-search.component';
import {CustomSwitchComponent} from '../custom-switch/custom-switch.component';
@Component({selector:'tp-resource-form',imports:[ImagePreview,FormsModule,Button,TpInputComponent,TpTextareaComponent,TpSelectSearchComponent,CustomSwitchComponent],templateUrl:'./resource-form.html',styleUrl:'./resource-form.scss'})
export class ResourceForm {preview=signal<{url:string;title:string}|null>(null);submitLabel=input('Guardar cambios');fields=input<FieldDefinition[]>([]);value=input<Record<string,any>>({});editing=input(false);busy=input(false);disabled=input(false);saved=output<Record<string,any>>();cancelled=output<void>();model=signal<Record<string,any>>({});constructor(){effect(()=>this.model.set(structuredClone(this.value())));}set(key:string,value:any){this.model.update(m=>({...m,[key]:value}));}}


