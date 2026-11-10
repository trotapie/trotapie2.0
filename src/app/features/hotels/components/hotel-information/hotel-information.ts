import { Component, computed, input, output, signal, inject, afterNextRender, DestroyRef, ElementRef, Injector } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HotelHorarios, HotelPlanTodoIncluido } from '../../../../data/models/hotel-estancia.interface';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { TpToastService } from '../../../../shared/services/tp-toast.service';
import { LanguageService } from '../../../../core/services/language.service';

export interface HotelInformationData {
  id: number;
  nombre_hotel?: string;
  descripcion?: string;
  ubicacion?: string;
  horarios?: HotelHorarios | null;
  actividades?: Array<{ id?: number; descripcion?: string; nombre?: string }>;
  regimenes?: Array<{ id?: number; descripcion?: string }>;
  plan_todo_incluido?: HotelPlanTodoIncluido | null;
}

@Component({
  selector: 'tp-hotel-information',
  imports: [Button, Icon, RouterLink],
  templateUrl: './hotel-information.html',
  styleUrl: './hotel-information.scss',
})
export class HotelInformation {
  hotel = input.required<HotelInformationData>();
  english = input(false);
  locationRequested = output<void>();
  selected = signal<number | null>(null);
  sharing = signal(false);
  private toast = inject(TpToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private selectionVersion = 0;
  private static nextId = 0;
  private instanceId = `hotel-information-${HotelInformation.nextId++}`;
  tabs = computed(() => [
    { label: this.text('Check-in / Horarios', 'Check-in / Times'), icon: 'clock' },
    { label: this.text('Descripción', 'Description'), icon: 'quote' },
    { label: this.text('Amenidades', 'Amenities'), icon: 'star' },
    { label: this.regimen(), icon: 'utensils' },
  ]);
  regimen = computed(() => this.hotel().regimenes?.find(item => !!item.descripcion)?.descripcion || this.text('Hospedaje', 'Stay plan'));
  schedules = computed(() => {
    const hours = this.hotel().horarios;
    return [
      { label: 'Check-in', value: this.range(hours?.check_in_desde, hours?.check_in_hasta) },
      { label: 'Check-out', value: hours?.check_out || '' },
      { label: this.text('Desayuno', 'Breakfast'), value: this.range(hours?.desayuno_desde, hours?.desayuno_hasta) },
    ];
  });
  private languageService = inject(LanguageService);
  text(es: string, en?: string) { return this.languageService.translateText(es, en); }
  tabId(index: number) { return `${this.instanceId}-tab-${index}`; }
  panelId(index: number) { return `${this.instanceId}-panel-${index}`; }
  private range(start?: string, end?: string) { return [start, end].filter(Boolean).join(' – '); }
  select(index: number) {
    this.selected.update(current => current === index ? null : index);
    const version = ++this.selectionVersion;
    if (this.selected() === null) return;
    afterNextRender(() => {
      void this.scrollToSection(index, version);
    }, { injector: this.injector });
  }
  private async scrollToSection(index: number, version: number) {
    // Wait for both the previous panel to close and the new one to open.
    // Their final heights determine the trigger's position, especially on mobile.
    const host = this.host.nativeElement;
    await Promise.allSettled(host.getAnimations({ subtree: true }).map(animation => animation.finished));
    if (this.destroyRef.destroyed || version !== this.selectionVersion || this.selected() !== index) return;
    const trigger = host.querySelector<HTMLElement>(`#${this.tabId(index)}`);
    if (!trigger) return;
    const target = trigger.parentElement || trigger;
    // The public page scrolls inside main, not the window. Scrolling that
    // container also keeps the section clear of the fixed header and footer.
    let container = host.parentElement;
    while (container && !/(auto|scroll)/.test(getComputedStyle(container).overflowY)) {
      container = container.parentElement;
    }
    const behavior: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    if (container) {
      container.scrollTo({ top: container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop - 12, behavior });
    } else {
      window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - 12, behavior });
    }
  }
  navigateTabs(event: KeyboardEvent, index: number) {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 };
    if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const count = this.tabs().length;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (index + offsets[event.key] + count) % count;
    (event.currentTarget as HTMLElement).closest('.hotel-tabs')?.querySelector<HTMLButtonElement>(`#${this.tabId(next)}`)?.focus();
  }
  async share() {
    if (this.sharing()) return;
    this.sharing.set(true);
    const url = new URL(`/hotel/${this.hotel().id}`, location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: this.hotel().nombre_hotel || 'Trotapie', url });
      else {
        await navigator.clipboard.writeText(url);
        this.toast.show({ variant: 'success', title: this.text('Enlace copiado', 'Link copied'), message: this.text('Ya puedes compartir este hotel.', 'You can now share this hotel.') });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) this.toast.show({ variant: 'error', title: this.text('No se pudo compartir', 'Unable to share'), message: this.text('Puedes copiar el enlace desde la barra del navegador.', 'You can copy the link from your browser address bar.') });
    } finally { this.sharing.set(false); }
  }
}
