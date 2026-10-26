import { Component, DestroyRef, ElementRef, inject, input } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Icon } from '../icon/icon';
@Component({selector:'button[tpButton],a[tpButton]',imports:[Icon],templateUrl: './button.html',host:{class:'btn','[class.btn-back]':"variant()==='back'",'[class.btn-primary]':"variant()==='primary'",'[class.btn-quiet]':"variant()==='quiet'",'[class.btn-danger]':"variant()==='danger'",'[class.btn-icon]':"variant()==='icon'",'[attr.aria-busy]':'busy()','[attr.disabled]':'busy() || disabled() ? true : null'}, styleUrl: './button.scss'})
export class Button {
 disabled=input(false,{transform:(value:boolean|null)=>!!value});icon=input('');variant=input('secondary');busy=input(false);
 constructor(){
  const element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const window=inject(DOCUMENT).defaultView;
  // Capture before RouterLink so every back button uses the browser history.
  const back=(event:MouseEvent)=>{
   if(this.variant()!=='back')return;
   event.preventDefault();event.stopImmediatePropagation();
   if(!this.busy()&&!this.disabled())window?.history.back();
  };
  element.addEventListener('click',back,{capture:true});
  inject(DestroyRef).onDestroy(()=>element.removeEventListener('click',back,{capture:true}));
 }
}
