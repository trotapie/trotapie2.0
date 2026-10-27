import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activitySeries, groupStatistics, summarizeDashboard } from '../src/app/data/models/dashboard-statistics.ts';

const record = (id, status = 'Pendiente', raw = {}) => ({ id: String(id), title: 'Cliente', subtitle: '', image: '', status, raw });

test('dashboard counts the full history, including confirmed requests, but keeps only five recent rows', () => {
  const records = [record(1, 'Cotizada'), record(2, 'Confirmada'), record(3), record(4, 'Cancelada'), record(5, 'Nueva'), record(6)];
  const snapshot = summarizeDashboard(records);
  assert.equal(snapshot.total, 6);
  assert.equal(snapshot.quoted, 2);
  assert.equal(snapshot.pending, 2);
  assert.deepEqual(snapshot.recent, records.slice(0, 5));
  assert.equal(snapshot.records.length, 6);
});

test('rankings use the entire dataset and preserve names and unassigned requests', () => {
  const records = Array.from({ length: 28 }, (_, i) => record(i, 'Pendiente', { hotel_nombre: i < 20 ? 'Hotel del Mar' : 'Hotel del Sol' }));
  records.push(record(29));
  assert.deepEqual(groupStatistics(records, 'hotel_nombre', 'Sin hotel').map(({ label, value }) => ({ label, value })), [
    { label: 'Hotel del Mar', value: 20 }, { label: 'Hotel del Sol', value: 8 }, { label: 'Sin hotel', value: 1 },
  ]);
  assert.equal(groupStatistics(records, 'status', 'Sin estado')[0].value, 29);
});

test('trend fills missing dates with zero and excludes old, invalid and future timestamps', () => {
  const now = new Date(2026, 9, 27, 12);
  const records = [
    record(1, '', { created_at: new Date(2026, 9, 27, 10).toISOString() }),
    record(2, '', { created_at: new Date(2026, 9, 25, 8).toISOString() }),
    record(3, '', { created_at: new Date(2026, 9, 24, 8).toISOString() }),
    record(4, '', { created_at: 'invalid' }), record(5),
    record(6, '', { created_at: new Date(2026, 9, 28, 8).toISOString() }),
    record(7, '', { created_at: new Date(2026, 9, 27, 18).toISOString() }),
  ];
  const series = activitySeries(records, 3, now);
  assert.deepEqual(series.map(day => day.date), ['2026-10-25', '2026-10-26', '2026-10-27']);
  assert.deepEqual(series.map(day => day.value), [1, 0, 1]);
});

test('empty history has zero counts and calendar windows cross years correctly', () => {
  assert.equal(summarizeDashboard([]).total, 0);
  assert.deepEqual(groupStatistics([], 'status', 'Sin estado'), []);
  const series = activitySeries([], 3, new Date(2027, 0, 1, 12));
  assert.deepEqual(series.map(day => day.date), ['2026-12-30', '2026-12-31', '2027-01-01']);
  assert.ok(series.every(day => day.value === 0));
});
