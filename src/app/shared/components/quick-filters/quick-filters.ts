import {Component,input,output,TemplateRef} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
export interface QuickFilterOption {key:string;label:string;}
@Component({selector:'tp-quick-filters',imports:[NgTemplateOutlet],templateUrl:'./quick-filters.html',styleUrl:'./quick-filters.scss'})
export class QuickFilters {
  title=input('Selecciona experiencia');
  titleTemplate=input<TemplateRef<unknown>|null>(null);
  options=input<QuickFilterOption[]>([]);
  selected=input('');
  changed=output<string>();
}
