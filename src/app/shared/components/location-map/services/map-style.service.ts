import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MapStyleService {
  private pending?: Promise<void>;
  load(): Promise<void> {
    if (this.pending) return this.pending;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('map-assets/leaflet.css', document.baseURI).href;
    stylesheet.dataset['trotapieMap'] = 'true';
    this.pending = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        stylesheet.remove();
        reject(new Error('Map stylesheet timed out'));
      }, 15_000);
      stylesheet.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      stylesheet.onerror = () => {
        clearTimeout(timeout);
        stylesheet.remove();
        reject(new Error('Map stylesheet unavailable'));
      };
      document.head.append(stylesheet);
    }).catch((error) => {
      this.pending = undefined;
      throw error;
    });
    return this.pending;
  }
}
