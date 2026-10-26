import { afterNextRender, Directive, ElementRef, inject, Injector, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MotionService } from '../../core/services/motion.service';

@Directive({selector:'router-outlet[tpPageMotion]'})
export class PageMotionDirective {
  private outlet=inject(RouterOutlet);
  private element=inject<ElementRef<HTMLElement>>(ElementRef);
  private injector=inject(Injector);
  private motion=inject(MotionService);
  private page:HTMLElement|null=null;
  constructor(){
    const subscription=this.outlet.activateEvents.subscribe(()=>{
      afterNextRender(()=>{
        const page=this.element.nativeElement.nextElementSibling as HTMLElement|null;
        if(page){this.page=page;this.motion.page(page);}
      },{injector:this.injector});
    });
    const deactivation=this.outlet.deactivateEvents.subscribe(()=>{if(this.page)this.motion.cancel(this.page);this.page=null;});
    inject(DestroyRef).onDestroy(()=>{subscription.unsubscribe();deactivation.unsubscribe();if(this.page)this.motion.cancel(this.page);});
  }
}
