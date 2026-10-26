import {Component,input,output,linkedSignal,computed,signal} from '@angular/core';
import {Button} from '../button/button';
import {Dialog} from '../dialog/dialog';
import {ScreenLoader} from '../screen-loader/screen-loader';
@Component({selector:'tp-image-preview',imports:[Dialog,ScreenLoader,Button],templateUrl:'./image-preview.html',styleUrl:'./image-preview.scss'})
export class ImagePreview {
  open=input(false);src=input('');title=input('Vista previa de la imagen');closed=output<void>();
  editable=input(false);busy=input(false);edited=output<void>();editing=signal(false);
  edit(){if(!this.busy())this.editing.set(true);}
  hidden(){if(this.editing()){this.edited.emit();this.closed.emit();this.editing.set(false);}}
  failed=linkedSignal(()=>{this.src();this.open();return false;});
  loading=linkedSignal(()=>{this.src();this.open();return true;});
  validSource=computed(()=>/^(https?:\/\/|\/(?!\/))/i.test(this.src().trim()));
}
