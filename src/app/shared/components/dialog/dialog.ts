import { Component, input, output, viewChild, ElementRef, afterRenderEffect, inject } from '@angular/core';
import { Button } from '../button/button';
import { MotionService } from '../../../core/services/motion.service';
import {Overlay,OverlayContainer} from '@angular/cdk/overlay';
import {DialogOverlayContainer} from '../../../core/services/dialog-overlay-container.service';
@Component({
  selector: 'tp-dialog',
  imports: [Button],
  providers:[Overlay,{provide:OverlayContainer,useClass:DialogOverlayContainer}],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  title = input('');
  eyebrow = input('Trotapie');
  open = input(false);
  busy = input(false);
  scrollBody = input(true);
  fixedChrome = input(false);
  fullscreenDesktop = input(false);
  size = input<'regular' | 'wide' | 'editor'>('regular');
  placement = input<'center' | 'adaptive'>('center');
  closeLabel = input('Cerrar');
  closed = output<void>();
  hidden = output<void>();
  private element = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private motion = inject(MotionService);
  constructor() {
    afterRenderEffect((onCleanup) => {
      const el = this.element()?.nativeElement;
      if (!el) return;
      const sheet = this.placement() === 'adaptive' && matchMedia('(max-width:600px)').matches;
      if (this.open()) {
        if (!el.open) el.showModal();
        this.motion.enter(el,sheet?'sheet':'dialog');
      } else if (el.open) {
        this.motion.leaveDialog(el,sheet,()=>{if(!this.open()){el.close();this.hidden.emit();}});
      }
      onCleanup(()=>this.motion.cancel(el));
    });
  }
  cancel(e: Event) {
    e.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  keepFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return;
    const dialog = this.element()?.nativeElement;
    if (!dialog?.open) return;
    const elements = [
      ...dialog.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ].filter(
      (element) =>
        element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden',
    );
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || !dialog.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !dialog.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  backdrop(e: Event) {
    if (e.target === this.element()?.nativeElement && !this.busy()) this.closed.emit();
  }
}
