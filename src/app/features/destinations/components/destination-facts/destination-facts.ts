import { Component, input } from '@angular/core';
import type { DestinationFact } from '../../models/public-attraction';

@Component({
  selector: 'tp-destination-facts',
  templateUrl: './destination-facts.html',
  styleUrl: './destination-facts.scss',
})
export class DestinationFacts {
  facts = input<DestinationFact[]>([]);
  english = input(false);
}
