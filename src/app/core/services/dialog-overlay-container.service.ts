import {Injectable,inject} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {OverlayContainer} from '@angular/cdk/overlay';

@Injectable()
export class DialogOverlayContainer extends OverlayContainer {
  private document=inject(DOCUMENT);
  override getContainerElement():HTMLElement {
    const container=super.getContainerElement();
    const dialogs=this.document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const parent=dialogs.length?dialogs[dialogs.length-1]:this.document.body;
    if(container.parentElement!==parent)parent.appendChild(container);
    return container;
  }
}
