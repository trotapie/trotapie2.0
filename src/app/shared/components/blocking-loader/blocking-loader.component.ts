import {Component,Input} from '@angular/core';
import {ScreenLoader} from '../screen-loader/screen-loader';
@Component({selector:'tp-blocking-loader,app-blocking-loader',imports:[ScreenLoader],templateUrl:'./blocking-loader.component.html',styleUrl:'./blocking-loader.component.scss'})
export class BlockingLoaderComponent {
  @Input() open=false;
  @Input() title='Cargando…';
  @Input() message='Espera un momento mientras terminamos la operación.';
  @Input() showBackdrop=true;
}
