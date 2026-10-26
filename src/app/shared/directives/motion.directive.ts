import { afterNextRender, Directive, ElementRef, inject, input, DestroyRef } from '@angular/core';
import { MotionService, MotionPreset } from '../../core/services/motion.service';

@Directive({selector:'[tpMotion]'})
export class MotionDirective {
  tpMotion=input<MotionPreset>('card');
  private element=inject<ElementRef<HTMLElement>>(ElementRef);
  private motion=inject(MotionService);
  constructor(){
    afterNextRender(()=>this.motion.enter(this.element.nativeElement,this.tpMotion()));
    inject(DestroyRef).onDestroy(()=>this.motion.cancel(this.element.nativeElement));
  }
}
