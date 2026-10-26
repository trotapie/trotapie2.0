import { Component, inject, input, output } from '@angular/core';
import { Dialog } from '../dialog/dialog';
import { State } from '../state/state';
import { LocationMapViewer } from './viewer/location-map-viewer';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'tp-location-map',
  imports: [Dialog, State, LocationMapViewer],
  templateUrl: './location-map.html',
  styleUrl: './location-map.scss',
})
export class LocationMap {
  private languageService = inject(LanguageService);
  open = input(false);
  location = input('');
  name = input('');
  zoom = input(13);
  english = input(false);
  closed = output<void>();
  text(es: string, en?: string) {
    return this.languageService.translateText(es, en);
  }
}
