import type { TravelRecord } from './travel-record';

export interface StatisticItem { label: string; value: number; color: string; }
export interface ActivityDay { date: string; label: string; value: number; }
export interface DashboardSnapshot {
  total: number | null;
  pending: number | null;
  quoted: number | null;
  recent: TravelRecord[];
  records?: TravelRecord[];
}

const palette = ['var(--brand)', '#c99a65', '#809b9b', '#b57364', '#92916d', '#87849a'];
const text = (value: unknown) => String(value ?? '').trim();
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function isQuoted(status: string): boolean {
  const value = normalized(status);
  return value.includes('cotiz') || value.includes('confirm');
}

export function groupStatistics(records: TravelRecord[], field: string, fallback: string): StatisticItem[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const label = text(field === 'status' ? record.status : record.raw[field]) || fallback;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([label, value], index) => ({ label, value, color: palette[index % palette.length] }));
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function activitySeries(records: TravelRecord[], days = 30, now = new Date()): ActivityDay[] {
  const series: ActivityDay[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    series.push({ date: dateKey(date), label: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }), value: 0 });
  }
  const byDate = new Map(series.map(day => [day.date, day]));
  for (const record of records) {
    const raw = text(record.raw['created_at']);
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const day = byDate.get(dateKey(date));
    if (day) day.value++;
  }
  return series;
}

export function summarizeDashboard(records: TravelRecord[]): DashboardSnapshot {
  return {
    total: records.length,
    pending: records.filter(record => normalized(record.status).includes('pend')).length,
    quoted: records.filter(record => isQuoted(record.status)).length,
    recent: records.slice(0, 5),
    records,
  };
}
