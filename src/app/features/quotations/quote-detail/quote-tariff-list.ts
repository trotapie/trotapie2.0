import {Component,computed,input} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {QuoteData,QUOTE_TARIFFS,quoteTariffRooms,quoteTariffTotal} from '../models/quote-tariffs';
import {quoteDate} from '../models/quote-presentation';
import {quoteRoomTypeName,quoteOriginName} from '../models/quote-tariff-labels';

@Component({selector:'tp-quote-tariff-list',imports:[CurrencyPipe],templateUrl:'./quote-tariff-list.html',styleUrl:'./quote-tariff-list.scss'})
export class QuoteTariffList{
  quote=input.required<QuoteData>();
  roomTypes=input<QuoteData[]>([]);
  origins=input<QuoteData[]>([]);
  readonly rooms=computed(()=>quoteTariffRooms(this.quote()));
  readonly tariffs=QUOTE_TARIFFS;
  readonly dateText=quoteDate;
  total(key:string){return quoteTariffTotal(this.rooms(),key);}
  readonly noPrices=(tariff:typeof QUOTE_TARIFFS[number])=>this.total(tariff.priceKey)===null;
  roomName(room:QuoteData,key:string){return quoteRoomTypeName(room,key,this.roomTypes(),this.quote());}
  originName(room:QuoteData,key:string){return quoteOriginName(room,key,this.origins());}
  policyText(policy:any):string{return typeof policy==='string'?policy:policy?.descripcion||policy?.titulo||'';}
}
