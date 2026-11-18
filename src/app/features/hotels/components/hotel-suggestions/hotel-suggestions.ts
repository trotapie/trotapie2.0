import { Component, inject, input, output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';
import { ImageCard } from '../../../../shared/components/image-card/image-card';
import { State } from '../../../../shared/components/state/state';
import { LanguageService } from '../../../../core/services/language.service';
import type { Page, TravelRecord } from '../../../../data/models/travel-record';
import type { PublicCopyField } from '../../../../shared/models/public-copy-editor';
import { DESTINATION_COPY } from '../../../../../../supabase/functions/_shared/destination-copy';
import type { CopyBlock } from '../../../../../../supabase/functions/_shared/quote-copy';

type HotelCopyKey = keyof typeof DESTINATION_COPY.hoteles;

@Component({
  selector: 'tp-hotel-suggestions',
  imports: [RouterLink, Button, ImageCard, State, NgTemplateOutlet],
  templateUrl: './hotel-suggestions.html',
  styleUrl: './hotel-suggestions.scss',
})
export class HotelSuggestions {
  private languageService = inject(LanguageService);
  page = input.required<Page>();
  destinationId = input.required<number>();
  english = input(false);
  copy = input<CopyBlock>({});
  copyEditor = input<TemplateRef<PublicCopyField>|null>(null);
  selected = output<TravelRecord>();
  field(key:HotelCopyKey):PublicCopyField {
    return {group:'hoteles',key,fallback:DESTINATION_COPY.hoteles[key],
      ...(key==='verMas' ? {icon:'right',variant:'secondary'} : {})};
  }
  hotelText(key:HotelCopyKey,english:string) {
    return this.copy().hoteles?.[key] ?? this.text(DESTINATION_COPY.hoteles[key],english);
  }
  text(es: string, en?: string) {
    return this.languageService.translateText(es, en);
  }
}
