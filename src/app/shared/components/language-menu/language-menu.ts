import { Component, ElementRef, inject, input, output, signal, viewChild, computed } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';
import { Icon } from '../icon/icon';
import { MotionDirective } from '../../directives/motion.directive';

@Component({
  selector:'tp-language-menu', imports:[Icon,MotionDirective], templateUrl:'./language-menu.html', styleUrl:'./language-menu.scss',
  host:{'(document:pointerdown)':'outside($event)','(keydown.escape)':'close(true)'},
})
export class LanguageMenu {
  language = inject(LanguageService);
  english = input(false);
  value = input<string|null>(null);
  changeGlobal = input(true);
  availableCodes = input<string[]|null>(null);
  selectedCode = computed(()=>this.value() || this.language.language());
  visibleOptions = computed(()=>this.options.filter(option=>!this.availableCodes()||this.availableCodes()!.includes(option.code)));
  changed = output<string>();
  open = signal(false);
  text(es: string, en?: string) { return this.language.translateText(es, en); }
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  readonly options = [
    {code:'es',name:'Español',flag:'/flags/MX.svg'},
    {code:'en',name:'English',flag:'/flags/US.svg'},
    {code:'fr',name:'Français',flag:'/flags/FR.svg'},
    {code:'de',name:'Deutsch',flag:'/flags/DE.svg'},
    {code:'pt',name:'Português',flag:'/flags/BR.svg'},
  ];
  current(){ return this.visibleOptions().find(option=>option.code===this.selectedCode()) || this.visibleOptions()[0] || this.options[0]; }
  select(code:string){
    if(!this.visibleOptions().some(option=>option.code===code))return;
    if(this.changeGlobal())this.language.setActiveLang(code);
    this.close(true);
    this.changed.emit(code);
  }
  close(focus=false){this.open.set(false);if(focus)this.trigger()?.nativeElement.focus();}
  outside(event:PointerEvent){if(!this.element.nativeElement.contains(event.target as Node))this.close();}
  move(event:KeyboardEvent){
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();
    const buttons=Array.from(this.element.nativeElement.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    if(!buttons.length)return;
    const index=buttons.indexOf(event.target as HTMLButtonElement);
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();
  }
}
