import {Component,inject,afterRenderEffect,ElementRef,viewChild} from '@angular/core';
import {TpToastService} from '../../services/tp-toast.service';
import {Icon} from '../icon/icon';
import {MotionDirective} from '../../directives/motion.directive';
@Component({selector:'tp-toast-host',imports:[Icon,MotionDirective],templateUrl:'./tp-toast.component.html',styleUrl:'./tp-toast.component.scss'})
export class TpToastComponent {
  toast=inject(TpToastService);
  stack=viewChild<ElementRef<HTMLElement>>('stack');
  constructor(){afterRenderEffect(()=>{
    const element=this.stack()?.nativeElement;
    if(!element)return;
    if(this.toast.notifications().length){
      // Reopen above any native dialog that was opened since the last toast.
      if(element.matches(':popover-open'))element.hidePopover();
      element.showPopover();
    }else if(element.matches(':popover-open'))element.hidePopover();
  });}
}
