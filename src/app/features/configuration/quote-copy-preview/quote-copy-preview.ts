import {afterNextRender, Component, inject, Injector, input, output, signal} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {Button} from '../../../shared/components/button/button';
import {Icon} from '../../../shared/components/icon/icon';
import {COPY_LIMIT, QUOTE_COPY, validCopyText, type CopyBlock} from '../../../../../supabase/functions/_shared/quote-copy';

@Component({
  selector:'tp-quote-copy-preview',
  imports:[NgTemplateOutlet, Button, Icon],
  templateUrl:'./quote-copy-preview.html',
  styleUrls:[
    '../../quotations/quote-editor/quote-editor.scss',
    '../../quotations/components/room-picker/room-picker.scss',
    './quote-copy-preview.scss',
  ],
})
export class QuoteCopyPreview {
  readonly texts = input.required<CopyBlock>();
  readonly busy = input(false);
  readonly textChanged = output<{group:string;key:string;value:string}>();
  readonly screen = signal(0);
  readonly editing = signal<{slot:HTMLElement;group:string;key:string;previous:string;value:string}|null>(null);
  readonly limit = COPY_LIMIT;
  readonly valid = validCopyText;
  private readonly injector = inject(Injector);
  private readonly defaults: CopyBlock = QUOTE_COPY;

  text(group:string,key:string){
    return this.texts()[group]?.[key] ?? this.defaults[group][key];
  }

  edit(slot:HTMLElement,group:string,key:string){
    if(this.busy())return;
    const value=this.text(group,key);
    this.editing.set({slot,group,key,previous:value,value});
    afterNextRender({write:()=>slot.querySelector('textarea')?.focus()},{injector:this.injector});
  }

  update(slot:HTMLElement,value:string){
    const field=this.editing();
    if(!field||field.slot!==slot||this.busy())return;
    this.editing.set({...field,value});
    this.textChanged.emit({group:field.group,key:field.key,value});
  }

  finish(slot:HTMLElement,restoreFocus=false,cancel=false){
    const field=this.editing();
    if(!field||field.slot!==slot)return;
    this.editing.set(null);
    const value=cancel?field.previous:this.valid(field.value)?field.value.trim():field.value;
    if(!this.busy()&&value!==field.value)this.textChanged.emit({group:field.group,key:field.key,value});
    if(restoreFocus)afterNextRender({write:()=>slot.querySelector<HTMLButtonElement>('.copy-trigger')?.focus()},{injector:this.injector});
  }

  onEditorKey(event:KeyboardEvent,slot:HTMLElement){
    if(event.isComposing||!(event.key==='Escape'||event.key==='Enter'&&!event.shiftKey))return;
    event.preventDefault();
    if(event.key==='Escape'||this.valid(this.editing()?.value)){
      this.finish(slot,true,event.key==='Escape');
    }
  }
}
