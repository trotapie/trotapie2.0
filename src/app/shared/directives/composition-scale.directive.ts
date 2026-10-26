import {Directive,ElementRef,inject,afterNextRender,DestroyRef} from '@angular/core';
@Directive({selector:'[tpCompositionScale]'})
export class CompositionScaleDirective {
 constructor(){const element=inject(ElementRef<HTMLElement>).nativeElement;const destroy=inject(DestroyRef);afterNextRender(()=>{const update=()=>element.style.setProperty('--composition-scale',String(element.clientWidth/800));const observer=new ResizeObserver(update);observer.observe(element);update();destroy.onDestroy(()=>observer.disconnect());});}
}
