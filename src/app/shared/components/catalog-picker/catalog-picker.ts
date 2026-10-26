import {Component,input,output,signal,viewChild,ElementRef,afterRenderEffect,untracked} from '@angular/core';
import {Dialog} from '../dialog/dialog';import {Button} from '../button/button';import {Icon} from '../icon/icon';
@Component({selector:'tp-catalog-picker',imports:[Dialog,Button,Icon],templateUrl:'./catalog-picker.html',styleUrl:'./catalog-picker.scss'})
export class CatalogPicker {
 options=input<{value:string;label:string}[]>([]);value=input('');label=input('Catálogos');changed=output<string>();open=signal(false);index=signal(0);wheel=viewChild<ElementRef<HTMLElement>>('wheel');
 constructor(){afterRenderEffect(()=>{if(this.open()){const node=this.wheel()?.nativeElement;if(node)node.scrollTop=untracked(()=>this.index())*48;}});}
 opacity(index:number){const distance=Math.abs(this.index()-index);return distance===0?1:distance===1?0.55:0.25;}
 show(){this.index.set(Math.max(0,this.options().findIndex(o=>o.value===this.value())));this.open.set(true);}
 scroll(event:Event){const index=Math.round((event.target as HTMLElement).scrollTop/48);this.index.set(Math.min(this.options().length-1,Math.max(0,index)));}
 choose(value:string){this.open.set(false);if(value!==this.value())this.changed.emit(value);}
}
