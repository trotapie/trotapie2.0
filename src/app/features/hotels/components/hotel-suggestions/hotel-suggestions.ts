import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';
import { ImageCard } from '../../../../shared/components/image-card/image-card';
import { State } from '../../../../shared/components/state/state';
import { LanguageService } from '../../../../core/services/language.service';
import type { Page, TravelRecord } from '../../../../data/models/travel-record';

@Component({
  selector: 'tp-hotel-suggestions',
  imports: [RouterLink, Button, ImageCard, State],
  templateUrl: './hotel-suggestions.html',
  styleUrl: './hotel-suggestions.scss',
})
export class HotelSuggestions {
  private languageService = inject(LanguageService);
  page = input.required<Page>();
  destinationId = input.required<number>();
  english = input(false);
  selected = output<TravelRecord>();
  text(es: string, en?: string) {
    return this.languageService.translateText(es, en);
  }
}
