import {afterNextRender, Component, ElementRef, inject, Injector, input, output, signal} from '@angular/core';
import {Button} from '../../../shared/components/button/button';
import {COPY_LIMIT, validCopyText} from '../../../../../supabase/functions/_shared/quote-copy';

@Component({
  selector: 'tp-inline-copy',
  imports: [Button],
  templateUrl: './inline-copy.html',
  styleUrl: './inline-copy.scss',
})
export class InlineCopy {
  readonly value = input.required<string>();
  readonly busy = input(false);
  readonly icon = input('');
  readonly variant = input<'primary'|'secondary'|undefined>();
  readonly valueChanged = output<string>();
  readonly editing = signal<{previous:string; value:string}|null>(null);
  readonly limit = COPY_LIMIT;
  readonly valid = validCopyText;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  edit() {
    if (this.busy()) return;
    const value = this.value();
    this.editing.set({previous:value,value});
    this.focus('textarea');
  }

  update(value:string) {
    const current = this.editing();
    if (!current || this.busy()) return;
    this.editing.set({...current,value});
    this.valueChanged.emit(value);
  }

  finish(restoreFocus = false, cancel = false) {
    const current = this.editing();
    if (!current) return;
    this.editing.set(null);
    const value = cancel ? current.previous : this.valid(current.value) ? current.value.trim() : current.value;
    if (!this.busy() && current.value !== value) this.valueChanged.emit(value);
    if (restoreFocus) this.focus('button');
  }

  onKey(event:KeyboardEvent) {
    if (event.isComposing || !(event.key === 'Escape' || event.key === 'Enter' && !event.shiftKey)) return;
    event.preventDefault();
    if (event.key === 'Escape' || this.valid(this.editing()?.value)) this.finish(true,event.key === 'Escape');
  }

  private focus(selector:string) {
    afterNextRender({write:()=>this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus()},{injector:this.injector});
  }
}
