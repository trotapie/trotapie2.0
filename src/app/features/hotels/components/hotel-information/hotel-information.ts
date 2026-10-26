import { Component, computed, input, output, signal, inject, ElementRef, viewChild, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HotelHorarios, HotelPlanTodoIncluido } from '../../../../data/models/hotel-estancia.interface';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { TpToastService } from '../../../../shared/services/tp-toast.service';
import { MotionService } from '../../../../core/services/motion.service';
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
  selected = signal(0);
  sharing = signal(false);
  private toast = inject(TpToastService);
  private motion = inject(MotionService);
  private panel = viewChild<ElementRef<HTMLElement>>('panel');
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
  panelId() { return `${this.instanceId}-panel`; }
  private range(start?: string, end?: string) { return [start, end].filter(Boolean).join(' – '); }
  select(index: number) {
    if (index === this.selected()) return;
    this.selected.set(index);
    const panel = this.panel()?.nativeElement;
    if (panel) void this.motion.page(panel);
  }
  navigateTabs(event: KeyboardEvent, index: number) {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (index + offsets[event.key] + 4) % 4;
    this.select(next);
    (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`#${this.tabId(next)}`)?.focus();
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
