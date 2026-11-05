import {Component,computed,effect,inject,input,output,signal,untracked,DestroyRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TravelDataService} from '../../../data/facades/travel-data.service';
import {searchHotelDestinations,selectedHotelDestination,destinationSearchTerm} from '../../../data/utils/hotel-destination-lookup';
import {TpSelectSearchComponent,TpSelectSearchOption} from '../tp-select-search/tp-select-search.component';
import {Button} from '../button/button';

@Component({
  selector:'tp-hotel-destination-select',
  imports:[FormsModule,TpSelectSearchComponent,Button],
  template:`
    <app-tp-select-search [label]="label()" [required]="required()" [disabled]="disabled()"
      [options]="options()" [ngModel]="value()" (ngModelChange)="select($event)"
      [remoteSearch]="true" [loading]="loading()" [showClear]="!required()"
      searchPlaceholder="Buscar destino por nombre" [emptyMessage]="error()||'No hay destinos activos que coincidan.'"
      (opened)="search('')" (searchChanged)="scheduleSearch($event)"/>
    @if(error()){
      <div role="status"><small>{{error()}}</small> <button tpButton type="button" variant="quiet" (click)="retry()" [disabled]="loading()">Reintentar</button></div>
    }
    <small>Busca por nombre.</small>
  `,
  styles:`:host{display:block;min-width:0}small{display:block;color:var(--muted);font-size:11px;line-height:1.5;margin-top:8px}`
})
export class HotelDestinationSelect {
  private data=inject(TravelDataService);
  value=input<number|string|null>(null);
  label=input('Destino del catálogo');
  required=input(true);
  disabled=input(false);
  changed=output<number|null>();
  loading=signal(false);
  error=computed(()=>this.selectionError()||this.searchError());
  private selected=signal<TpSelectSearchOption|null>(null);
  private results=signal<TpSelectSearchOption[]>([]);
  options=computed(()=>{
    const selected=this.selected();
    return selected?[selected,...this.results().filter(option=>Number(option.value)!==Number(selected.value))]:this.results();
  });
  private timer?:ReturnType<typeof setTimeout>;
  private searchGeneration=0;
  private selectionGeneration=0;
  private term='';
  private selectionError=signal('');
  private searchError=signal('');
  constructor(){
    effect(()=>{const id=Number(this.value());untracked(()=>void this.resolveSelected(id));});
    inject(DestroyRef).onDestroy(()=>{clearTimeout(this.timer);this.searchGeneration++;this.selectionGeneration++;});
  }
  private async resolveSelected(id:number){
    const generation=++this.selectionGeneration;
    this.selectionError.set('');
    if(this.selected()?.value===id)return;
    this.selected.set(id?{value:id,label:`Destino #${id}`}:null);
    if(!id)return;
    try{
      const option=await this.data.cached(`hotel-selected-destination:${id}`,()=>selectedHotelDestination(this.data.backend.client,id),300_000);
      if(generation===this.selectionGeneration)this.selected.set(option||{value:id,label:`Destino #${id}`});
    }catch{
      if(generation===this.selectionGeneration)this.selectionError.set('No pudimos cargar el nombre del destino seleccionado.');
    }
  }
  scheduleSearch(term:string){
    clearTimeout(this.timer);this.searchGeneration++;this.term=term;this.results.set([]);this.loading.set(true);
    this.timer=setTimeout(()=>void this.search(term),300);
  }
  async search(term:string){
    clearTimeout(this.timer);this.term=term;
    const generation=++this.searchGeneration;
    this.loading.set(true);this.searchError.set('');
    try{
      const normalized=destinationSearchTerm(term);
      const options=await this.data.cached(`hotel-destination-search:${normalized}`,()=>searchHotelDestinations(this.data.backend.client,normalized),60_000);
      if(generation===this.searchGeneration)this.results.set(options);
    }catch{
      if(generation===this.searchGeneration){this.results.set([]);this.searchError.set('No pudimos buscar destinos. Intenta nuevamente.');}
    }finally{if(generation===this.searchGeneration)this.loading.set(false);}
  }
  select(value:string|number|null){
    const id=Number(value)||null;
    this.selected.set(this.options().find(option=>Number(option.value)===id)||null);
    this.selectionError.set('');this.changed.emit(id);
  }
  retry(){this.selected.set(null);void this.resolveSelected(Number(this.value()));void this.search(this.term);}
}
