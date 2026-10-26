import {Component,input,output} from '@angular/core';
export interface QuickFilterOption {key:string;label:string;}
@Component({selector:'tp-quick-filters',templateUrl:'./quick-filters.html',styleUrl:'./quick-filters.scss'})
export class QuickFilters {
  title=input('Selecciona experiencia');
  options=input<QuickFilterOption[]>([]);
  selected=input('');
  changed=output<string>();
}
