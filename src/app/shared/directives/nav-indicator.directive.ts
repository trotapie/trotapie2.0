import {Directive,ElementRef,DestroyRef,inject,input,afterRenderEffect,afterNextRender} from '@angular/core';
import {gsap} from 'gsap';
@Directive({selector:'[tpNavIndicator]'})
export class NavIndicatorDirective {
 tpNavIndicator=input('');private element=inject<ElementRef<HTMLElement>>(ElementRef);private initialized=false;
 constructor(){const destroy=inject(DestroyRef);afterRenderEffect(()=>{this.tpNavIndicator();this.move();});afterNextRender(()=>{const observer=new ResizeObserver(()=>this.move());observer.observe(this.element.nativeElement);destroy.onDestroy(()=>{observer.disconnect();const indicator=this.element.nativeElement.querySelector('.nav-indicator');if(indicator)gsap.killTweensOf(indicator);});});}
 private move(){const nav=this.element.nativeElement;const active=nav.querySelector<HTMLElement>(':scope > a.active,:scope > button.selected,:scope > details > summary.active'),indicator=nav.querySelector<HTMLElement>('.nav-indicator');if(!active||!indicator)return;const rect=active.getBoundingClientRect(),parent=nav.getBoundingClientRect();const values={x:rect.left-parent.left,y:rect.top-parent.top,width:active.offsetWidth,height:active.offsetHeight,opacity:1};if(!this.initialized||matchMedia('(prefers-reduced-motion: reduce)').matches){gsap.set(indicator,values);this.initialized=true;}else gsap.to(indicator,{...values,duration:.35,ease:'power3.out',overwrite:true});}
}
