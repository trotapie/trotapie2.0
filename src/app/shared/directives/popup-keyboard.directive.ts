import {Directive,ElementRef,inject,output} from '@angular/core';
@Directive({selector:'[tpPopupKeyboard]',host:{'(keydown)':'keydown($event)'}})
export class PopupKeyboardDirective {
  dismissed=output<void>();
  private element=inject<ElementRef<HTMLElement>>(ElementRef);
  keydown(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.dismissed.emit();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    if(event.target instanceof HTMLInputElement && ['Home','End'].includes(event.key))return;
    const options=Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('[role="option"]:not([disabled]),[role="menuitem"]:not([disabled]),input[type="checkbox"]:not([disabled])'));
    if(!options.length)return;
    event.preventDefault();
    const index=options.indexOf(document.activeElement as HTMLElement);
    const next=event.key==='Home'?0:event.key==='End'?options.length-1:index<0?(event.key==='ArrowDown'?0:options.length-1):(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
    options[next].focus();
  }
}
