export interface DateRangeValidationOptions {
  required?: boolean;
  min?: string | null;
  max?: string | null;
  minNights?: number;
}

export function dateRangeErrors(value: unknown, options: DateRangeValidationOptions = {}): Record<string, unknown> | null {
  const range = value as { start?: unknown; end?: unknown } | null;
  const start = range?.start;
  const end = range?.end;
  if (!start && !end) return options.required ? { required: true } : null;
  if (!start || !end) return { dateRangeIncomplete: true };
  const validDate = (key: unknown): key is string => {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const date = new Date(`${key}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
  };
  if (!validDate(start) || !validDate(end)) return { date: true };
  if ((options.min && (start < options.min || end < options.min)) ||
      (options.max && (start > options.max || end > options.max))) {
    return { dateBounds: { min: options.min, max: options.max } };
  }
  const nights = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
  return nights < (options.minNights ?? 0) ? { dateRangeOrder: true } : null;
}
