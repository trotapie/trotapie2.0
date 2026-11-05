import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { activitySeries, DashboardSnapshot, groupStatistics, StatisticItem } from '../../../../../data/models/dashboard-statistics';
export type { DashboardSnapshot } from '../../../../../data/models/dashboard-statistics';

@Component({
  selector: 'tp-dashboard-statistics',
  imports: [RouterLink],
  templateUrl: './dashboard-statistics.html',
  styleUrl: './dashboard-statistics.scss',
})
export class DashboardStatistics {
  readonly auth = inject(AuthService);
  readonly snapshot = input.required<DashboardSnapshot>();
  readonly days = signal(30);
  readonly selectedDate = signal('');
  readonly records = computed(() => this.snapshot().records || []);
  readonly available = computed(() => this.snapshot().total !== null);
  readonly series = computed(() => activitySeries(this.records(), this.days()));
  readonly periodTotal = computed(() => this.series().reduce((sum, day) => sum + day.value, 0));
  readonly peak = computed(() => Math.max(1, ...this.series().map(day => day.value)));
  readonly selectedDay = computed(() => this.series().find(day => day.date === this.selectedDate()));
  readonly states = computed(() => groupStatistics(this.records(), 'status', 'Sin estado').map(item => ({
    ...item,
    color: /cancel/i.test(item.label) ? '#b57364' : /pend/i.test(item.label) ? '#c99a65' : /cotiz|confirm/i.test(item.label) ? 'var(--brand)' : item.color,
  })));
  readonly destinationTypes = computed(() => groupStatistics(this.records(), 'tipo_destino', 'Sin clasificación'));
  readonly breakdowns = computed(() => [
    { title: 'Estado de las solicitudes', subtitle: 'Cómo avanza cada viaje.', items: this.states(), filterable: true },
    { title: 'Tipos de destino', subtitle: 'La composición de las solicitudes.', items: this.destinationTypes(), filterable: false },
  ]);
  readonly rankings = computed(() => [
    { title: 'Hoteles más solicitados', subtitle: 'Dónde quieren hospedarse.', items: groupStatistics(this.records(), 'hotel_nombre', 'Sin hotel asignado').slice(0, 5), color: 'var(--brand)' },
    { title: 'Destinos más solicitados', subtitle: 'Lugares que despiertan interés.', items: groupStatistics(this.records(), 'destino_nombre', 'Sin destino asignado').slice(0, 5), color: '#c99a65' },
    { title: 'Actividad por asesor', subtitle: 'Solicitudes asignadas al equipo.', items: groupStatistics(this.records(), 'empleado_nombre', 'Sin asesor asignado').slice(0, 5), color: '#809b9b' },
  ]);
  readonly points = computed(() => this.series().map((day, index) => ({
    ...day, x: 24 + index / Math.max(1, this.series().length - 1) * 852,
    y: 174 - day.value / this.peak() * 144,
  })));
  readonly line = computed(() => this.points().map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' '));
  readonly area = computed(() => `${this.line()} L876,174 L24,174 Z`);
  readonly ticks = computed(() => [0, Math.floor((this.days() - 1) / 2), this.days() - 1].map(index => this.series()[index]));
  readonly axis = computed(() => [...new Set([this.peak(), Math.floor(this.peak() / 2), 0])]);

  gradient(items: StatisticItem[]): string {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (!total) return 'var(--line)';
    let offset = 0;
    return `conic-gradient(${items.map(item => {
      const start = offset;
      offset += item.value / total * 100;
      return `${item.color} ${start}% ${offset}%`;
    }).join(',')})`;
  }

  percentage(value: number): number {
    return this.snapshot().total ? Math.round(value / this.snapshot().total! * 100) : 0;
  }
}
