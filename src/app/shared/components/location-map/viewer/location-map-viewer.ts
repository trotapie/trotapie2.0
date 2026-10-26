import {
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
  OnDestroy,
} from '@angular/core';
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import { Button } from '../../button/button';
import { State } from '../../state/state';
import { LanguageService } from '../../../../core/services/language.service';
import { parseMapPoint, externalMapUrl } from '../../../utils/location';
import { MapStyleService } from '../services/map-style.service';

@Component({
  selector: 'tp-location-map-viewer',
  imports: [Button, State],
  templateUrl: './location-map-viewer.html',
  styleUrl: './location-map-viewer.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LocationMapViewer implements OnDestroy {
  location = input('');
  name = input('');
  zoom = input(13);
  english = input(false);
  point = computed(() => parseMapPoint(this.location()));
  externalUrl = computed(() => externalMapUrl(this.location(), this.point()));
  loading = signal(true);
  error = signal('');
  level = signal(13);
  private canvas = viewChild<ElementRef<HTMLDivElement>>('canvas');
  private markerTemplate = viewChild.required<ElementRef<HTMLDivElement>>('markerTemplate');
  private styles = inject(MapStyleService);
  private destroyed = false;
  private map?: L.Map;
  private tiles?: L.TileLayer;
  private resize?: ResizeObserver;
  private tileLoads = 0;

  constructor() {
    afterNextRender(() => {
      void this.initialize();
    });
  }

  private async initialize() {
    const point = this.point();
    const canvas = this.canvas()?.nativeElement;
    if (!point || !canvas) {
      this.loading.set(false);
      return;
    }
    try {
      await this.styles.load();
      if (this.destroyed) return;
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.map = L.map(canvas, {
        zoomControl: false,
        attributionControl: false,
        minZoom: 3,
        maxZoom: 19,
        scrollWheelZoom: false,
        zoomAnimation: !reducedMotion,
        fadeAnimation: !reducedMotion,
      }).setView([point.lat, point.lng], this.zoom());
      this.level.set(this.map.getZoom());
      this.map.on('zoomend', () => this.level.set(this.map!.getZoom()));
      this.tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 1,
      });
      this.tiles.on('tileload', () => {
        this.tileLoads++;
        this.loading.set(false);
        this.error.set('');
      });
      this.tiles.on('load', () => {
        this.loading.set(false);
        if (!this.tileLoads)
          this.error.set(
            this.text(
              'No pudimos cargar el mapa. Comprueba tu conexión.',
              'We could not load the map. Check your connection.',
            ),
          );
      });
      this.tiles.addTo(this.map);
      const icon = L.divIcon({
        className: 'tp-map-marker',
        iconSize: [40, 48],
        iconAnchor: [20, 46],
        html: this.markerTemplate().nativeElement.firstElementChild!.cloneNode(true) as HTMLElement,
      });
      const label = document.createElement('span');
      label.textContent = this.name();
      L.marker([point.lat, point.lng], { icon, title: this.name(), alt: this.name() })
        .addTo(this.map)
        .bindTooltip(label, { direction: 'top', offset: [0, -42] });
      this.resize = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
      this.resize.observe(canvas);
    } catch {
      this.map?.remove();
      this.map = undefined;
      this.loading.set(false);
      this.error.set(
        this.text(
          'No pudimos cargar el mapa. Vuelve a intentarlo.',
          'We could not load the map. Please try again.',
        ),
      );
    }
  }

  changeZoom(delta: number) {
    if (delta > 0) this.map?.zoomIn();
    else this.map?.zoomOut();
  }
  center() {
    const point = this.point();
    if (point) this.map?.setView([point.lat, point.lng], this.zoom(), { animate: false });
  }
  retry() {
    this.tileLoads = 0;
    this.error.set('');
    this.loading.set(true);
    if (this.map) this.tiles?.redraw();
    else void this.initialize();
  }
  private languageService = inject(LanguageService);
  text(es: string, en?: string) {
    return this.languageService.translateText(es, en);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.resize?.disconnect();
    this.map?.remove();
  }
}
