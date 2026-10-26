import {Component,input,output,computed} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InternationalCountry} from '../../../data/models/international-geography';
import {TpSelectSearchComponent} from '../tp-select-search/tp-select-search.component';
import {Button} from '../button/button';
@Component({selector:'tp-international-filters',imports:[FormsModule,TpSelectSearchComponent,Button],templateUrl:'./international-filters.html',styleUrl:'./international-filters.scss'})
export class InternationalFilters {
  countries=input<InternationalCountry[]>([]);region=input<number|null>(null);country=input<number|null>(null);busy=input(false);english=input(false);
  regionChanged=output<number|null>();countryChanged=output<number|null>();cleared=output<void>();
  regions=computed(()=>[...new Map(this.countries().map(c=>[c.regionId,{value:c.regionId,label:c.regionName}])).values()].sort((a,b)=>a.label.localeCompare(b.label,'es')));
  countryOptions=computed(()=>this.countries().filter(c=>!this.region()||c.regionId===this.region()).map(c=>({value:c.id,label:c.name,group:this.region()?undefined:c.regionName})));
  text(es:string,en:string){return this.english()?en:es;}
  id(value:string|number|null){return value?Number(value):null;}
}
