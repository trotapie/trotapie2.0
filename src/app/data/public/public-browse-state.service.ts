import { Injectable } from '@angular/core';
import { Page } from '../models/travel-record';
import { InternationalCountry } from '../models/international-geography';

export interface PublicBrowseState {
  search: string;
  type: 'NACIONAL' | 'INTERNACIONAL';
  region: number | null;
  country: number | null;
  experience: string;
  experiences: Array<{id:number;slug:string;nombre:string;label:string}>;
  experienceConfigured: boolean;
  countries: InternationalCountry[];
  page: Page;
  cover: {url_imagen?:string;nombre_destino?:string} | null;
  heroPhotos: Array<{src:string;location:string;homeStyle?:unknown}>;
  hotelFilters: {search:string;starsMin:number|null;starsMax:number|null;regime:number|null};
  hotelRegimes: Array<{value:number;label:string}>;
  hotelPageSize: number;
  homeSection: 'home' | 'destinations';
  scrollTop: number;
}

@Injectable({ providedIn: 'root' })
export class PublicBrowseStateService {
  private states = new Map<string, PublicBrowseState>();
  private destinationState?: PublicBrowseState;

  get(key: string) {
    const state = this.states.get(key);
    if (!this.isDestinationCatalog(key) || !this.destinationState) return state;
    // Both entry points display the same catalog; scroll belongs to each page.
    return {
      ...this.destinationState,
      scrollTop: state?.scrollTop ?? 0,
      homeSection: state?.homeSection ?? 'home',
    };
  }

  save(key: string, state: PublicBrowseState) {
    this.states.set(key, state);
    if (this.isDestinationCatalog(key)) this.destinationState = state;
  }

  private isDestinationCatalog(key: string) { return key === '/' || key === '/destinos'; }
}
