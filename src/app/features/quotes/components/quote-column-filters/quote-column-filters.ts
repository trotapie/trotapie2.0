import {Component,input,output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TpInputComponent} from '../../../../shared/components/tp-input/tp-input.component';
import {DateRangeFilterComponent} from '../../../../shared/components/date-range-filter/date-range-filter.component';
import {QuoteFilters,emptyQuoteFilters} from '../../models/quote-filters';
import {TpSelectSearchComponent} from '../../../../shared/components/tp-select-search/tp-select-search.component';
@Component({selector:'tp-quote-column-filters',imports:[FormsModule,TpInputComponent,DateRangeFilterComponent,TpSelectSearchComponent],templateUrl:'./quote-column-filters.html',styleUrl:'./quote-column-filters.scss'})
export class QuoteColumnFilters {
  readonly statusOptions=[{value:'',label:'Todos los estados'},{value:'Pendiente',label:'Pendientes'},{value:'Cotiz',label:'Cotizadas'},{value:'Cancel',label:'Canceladas'},{value:'Elimin',label:'Eliminadas'}];
  value=input<QuoteFilters>(emptyQuoteFilters());
  status=input('');
  multiple=input(false);
  changed=output<QuoteFilters>();
  statusChanged=output<string>();
  set(key:'client'|'hotel'|'adviser',value:string|null){this.changed.emit({...this.value(),[key]:value||''});}
  dates(value:{start:string|null;end:string|null}){this.changed.emit({...this.value(),...value});}
}
