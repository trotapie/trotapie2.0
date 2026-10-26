import { Directive, ElementRef, inject, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MotionService } from '../../core/services/motion.service';

@Directive({selector:'details[tpDetailsMotion]',host:{'(toggle)':'toggle()'}})
export class DetailsMotionDirective {
  private element=inject<ElementRef<HTMLDetailsElement>>(ElementRef);
  private motion=inject(MotionService);
  private document=inject(DOCUMENT);
  constructor(){
    // Capture outside interactions even when another control stops propagation.
    const outside=(event:Event)=>{
      const element=this.element.nativeElement;
      if(element.open&&!event.composedPath().includes(element))this.close();
    };
    const click=(event:Event)=>{
      outside(event);
      const element=this.element.nativeElement;
      if(!element.open)return;
      const action=event.composedPath().find(node=>node instanceof this.document.defaultView!.Element&&node.matches('a,button')) as Element|undefined;
      if(action&&this.menu()?.contains(action))this.close();
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||!this.element.nativeElement.open)return;
      this.close();
      this.element.nativeElement.querySelector<HTMLElement>('summary')?.focus();
    };
    this.document.addEventListener('pointerdown',outside,true);
    this.document.addEventListener('click',click,true);
    this.document.addEventListener('keydown',escape,true);
    inject(DestroyRef).onDestroy(()=>{
      this.document.removeEventListener('pointerdown',outside,true);
      this.document.removeEventListener('click',click,true);
      this.document.removeEventListener('keydown',escape,true);
      const menu=this.menu();if(menu)this.motion.cancel(menu);
    });
  }
  private menu(){return this.element.nativeElement.querySelector<HTMLElement>('.nav-dropdown');}
  private close(){this.element.nativeElement.open=false;const menu=this.menu();if(menu)this.motion.cancel(menu);}
  toggle(){const menu=this.menu();if(!menu)return;if(this.element.nativeElement.open){
    this.document.querySelectorAll<HTMLDetailsElement>('details[tpDetailsMotion][open]').forEach(other=>{if(other!==this.element.nativeElement)other.open=false;});
    this.motion.enter(menu,'menu');
  }else this.motion.cancel(menu);}
}
