import { Component, effect, inject, input, signal } from '@angular/core';
import { DestinationWeatherService } from '../../../../data/public/destination-weather.service';
import { parseMapPoint } from '../../../../shared/utils/location';
import type { DestinationFact } from '../../models/public-attraction';

@Component({
  selector: 'tp-destination-facts',
  templateUrl: './destination-facts.html',
  styleUrl: './destination-facts.scss',
})
export class DestinationFacts {
  facts = input<DestinationFact[]>([]);
  english = input(false);
  location = input<string | null>(null);
  temperature = signal<number | null>(null);
  private weather = inject(DestinationWeatherService);

  constructor() {
    effect((onCleanup) => {
      const point = parseMapPoint(this.location());
      this.temperature.set(null);
      if (!point) return;
      const controller = new AbortController();
      onCleanup(() => controller.abort());
      void this.weather.temperature(point, controller.signal).then(temperature => {
        if (!controller.signal.aborted) this.temperature.set(temperature);
      }).catch(() => {
        // Weather is optional: a failed request must not interrupt destination details.
      });
    });
  }
}
