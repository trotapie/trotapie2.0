import { Component, input } from '@angular/core';
import { Button } from '../button/button';

@Component({
  selector: 'tp-back-button',
  imports: [Button],
  templateUrl: './back-button.html',
  styleUrl: './back-button.scss',
})
export class BackButton {
  fallback = input('');
  label = input('Regresar');

}
