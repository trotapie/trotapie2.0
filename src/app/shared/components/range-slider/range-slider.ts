import {Component,input,output,computed} from '@angular/core';
@Component({selector:'tp-range-slider',templateUrl:'./range-slider.html',styleUrl:'./range-slider.scss'})
export class RangeSlider {
 min=input(0);max=input(5);step=input(.5);lower=input<number|null>(null);upper=input<number|null>(null);label=input('Rango');lowerLabel=input('Mínimo');upperLabel=input('Máximo');
 changed=output<{lower:number;upper:number}>();
 low=computed(()=>this.lower()??this.min());high=computed(()=>this.upper()??this.max());
 start=computed(()=>(this.low()-this.min())/(this.max()-this.min())*100);end=computed(()=>(this.high()-this.min())/(this.max()-this.min())*100);
 update(bound:'lower'|'upper',event:Event){const value=Number((event.target as HTMLInputElement).value);const lower=bound==='lower'?Math.min(value,this.high()):this.low();const upper=bound==='upper'?Math.max(value,this.low()):this.high();(event.target as HTMLInputElement).value=String(bound==='lower'?lower:upper);this.changed.emit({lower,upper});}
}
