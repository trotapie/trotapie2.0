import {Component,input,model,signal} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {TpMultiselectComponent,TpMultiselectOption} from '../../../shared/components/tp-multiselect/tp-multiselect.component';
import {QUOTE_TARIFFS,QuoteData,QuoteTariffDefinition,quoteTariffTotal} from '../models/quote-tariffs';

@Component({selector:'tp-quote-tariff-editor',imports:[FormsModule,CurrencyPipe,TpSelectSearchComponent,TpMultiselectComponent],templateUrl:'./quote-tariff-editor.html',styleUrl:'./quote-tariff-editor.scss'})
export class QuoteTariffEditor{
  rooms=model<QuoteData[]>([]);
  roomTypes=input<QuoteData[]>([]);
  origins=input<QuoteData[]>([]);
  policies=input<Record<string,QuoteData[]>>({});
  disabled=input(false);
  readonly tariffs=QUOTE_TARIFFS;
  readonly active=signal('sin_seguro');
  readonly standalone={standalone:true};
  private readonly selectionCache=new WeakMap<QuoteData,Map<string,{policies:any[];ids:Array<string|number>}>>();
  total(key:string){return quoteTariffTotal(this.rooms(),key);}
  roomOptions(room:QuoteData,tariff:QuoteTariffDefinition){
    const people=Number(room.detalle.match(/(\d+)\s*adultos?/i)?.[1]||0)+Number(room.detalle.match(/(\d+)\s*(?:niños?|menores?)/i)?.[1]||0);
    const options=this.roomTypes().filter(type=>!people||!Number(type.capacidad_maxima)||Number(type.capacidad_maxima)>=people).map(type=>({value:Number(type.id),label:type.nombre_habitacion}));
    const id=room[tariff.roomKey]?.id;
    if(id!=null&&!options.some(option=>option.value===Number(id)))options.push({value:Number(id),label:`Habitación #${id}`});
    return options;
  }
  originOptions(room:QuoteData,tariff:QuoteTariffDefinition){
    const options=this.origins().map(origin=>({value:Number(origin.id),label:origin.clave||origin.nombre_cotizador}));
    const id=room[tariff.originKey];
    if(id!=null&&!options.some(option=>option.value===Number(id)))options.push({value:Number(id),label:`Origen #${id}`});
    return options;
  }
  setRoomType(room:QuoteData,key:string,id:number|null){room[key]={id};}
  selected(room:QuoteData,key:string):Array<string|number>{
    let cache=this.selectionCache.get(room);
    if(!cache){cache=new Map();this.selectionCache.set(room,cache);}
    const policies=room[key];const previous=cache.get(key);
    if(previous&&previous.policies===policies)return previous.ids;
    const ids=(policies||[]).map((policy:any,index:number)=>policy?.id??`legacy-${index}`);
    cache.set(key,{policies,ids});return ids;
  }
  options(room:QuoteData,key:string):TpMultiselectOption[]{
    const options=new Map<string,TpMultiselectOption>();
    for(const policy of this.policies()[key]||[])options.set(String(policy.id),{value:policy.id,label:policy.descripcion||policy.titulo||policy.codigo});
    (room[key]||[]).forEach((policy:any,index:number)=>{const id=policy?.id??`legacy-${index}`;if(!options.has(String(id)))options.set(String(id),{value:id,label:this.policyText(policy)});});
    return [...options.values()];
  }
  select(room:QuoteData,key:string,ids:Array<string|number>){
    const choices=new Map<string,any>((this.policies()[key]||[]).map(policy=>[String(policy.id),policy]));
    (room[key]||[]).forEach((policy:any,index:number)=>choices.set(String(policy?.id??`legacy-${index}`),policy));
    room[key]=ids.map(id=>choices.get(String(id))).filter(policy=>policy!=null).map(policy=>structuredClone(policy));
    if(key==='condicionesPrecioSinSeguro')for(const item of this.rooms())item[key]=structuredClone(room[key]);
  }
  policyText(policy:any):string{return typeof policy==='string'?policy:policy?.descripcion||policy?.titulo||'';}
}
