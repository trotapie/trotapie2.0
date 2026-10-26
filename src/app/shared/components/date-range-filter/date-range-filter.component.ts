import {PopupKeyboardDirective} from '../../directives/popup-keyboard.directive';
import {OverlayModule,ConnectedPosition} from '@angular/cdk/overlay';
import {Button} from '../button/button';
import {Icon} from '../icon/icon';
import {MotionDirective} from '../../directives/motion.directive';
import { Component, Input, forwardRef, ElementRef, ViewChild, OnChanges } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, ValidationErrors } from '@angular/forms';
import { DateRangeFilterValue, EMPTY_DATE_RANGE } from './date-range-filter.model';
import { DateRangeEndpoint, emptyDateRange, selectDateInRange } from './date-range-selection.util';

interface CalendarDay {
  key: string;
  day: number;
  currentMonth: boolean;
}

@Component({
  selector: 'tp-date-range-filter, app-date-range-filter',
  standalone: true,
  imports: [OverlayModule,Button,Icon,MotionDirective,PopupKeyboardDirective],
  templateUrl: './date-range-filter.component.html',
  styleUrl: './date-range-filter.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DateRangeFilterComponent),
    multi: true,
  }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateRangeFilterComponent), multi: true }],
})
export class DateRangeFilterComponent implements ControlValueAccessor, Validator, OnChanges {
  private static nextId = 0;

  @Input() label = 'Rango de fechas';
  @Input() mostrarEstadia = false;
  @Input() min: Date | string | null = null;
  @Input() max: Date | string | null = null;
  @Input() single = false;
  @Input() required = false;
  @Input() inputId = '';
  @ViewChild('startTrigger') private startTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('endTrigger') private endTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('calendarPanel') private calendarPanel?: ElementRef<HTMLElement>;

  readonly labelId = `date-range-filter-label-${DateRangeFilterComponent.nextId++}`;
  readonly weekdays = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  visibleMonth = this.startOfMonth(new Date());
  value: DateRangeFilterValue = { ...EMPTY_DATE_RANGE };
  pendingValue: DateRangeFilterValue = { ...EMPTY_DATE_RANGE };
  disabled = false;
  activeEndpoint: DateRangeEndpoint = 'start';

  abierto=false;
  readonly posiciones:ConnectedPosition[]=[
    {originX:'start',originY:'bottom',overlayX:'start',overlayY:'top',offsetY:8},
    {originX:'start',originY:'top',overlayX:'start',overlayY:'bottom',offsetY:-8}
  ];

  private onChange: (value: DateRangeFilterValue | string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  ngOnChanges(): void { this.onValidatorChange(); }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }
  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.single) return null;
    const key = control.value;
    if (!key) return this.required ? { required: true } : null;
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key) || this.keyFromDate(this.dateFromKey(key)) !== key) return { date: true };
    return this.isDisabled(key) ? { dateBounds: { min: this.boundKey(this.min), max: this.boundKey(this.max) } } : null;
  }
  get panelId(): string { return `${this.labelId}-calendar`; }
  get todayKey(): string { return this.keyFromDate(new Date()); }

  get months(): Date[] {
    return this.single ? [this.visibleMonth] : [this.visibleMonth, this.addMonths(this.visibleMonth, 1)];
  }

  get triggerValue(): string {
    if (!this.value.start || !this.value.end) return '';

    const range = `${this.formatDate(this.value.start)} - ${this.formatDate(this.value.end)}`;
    const nights = this.nights(this.value);
    return this.mostrarEstadia ? `${range} (${nights} ${nights === 1 ? 'noche' : 'noches'})` : range;
  }

  get estadiaLabel(): string {
    if (!this.pendingValue.start || !this.pendingValue.end) return 'Selecciona inicio y fin';

    const nights = this.nights(this.pendingValue);
    return `Estadía de ${nights} ${nights === 1 ? 'noche' : 'noches'}`;
  }

  writeValue(value: DateRangeFilterValue | string | null): void {
    const nextValue = typeof value === 'string' ? { start: value || null, end: null } : value ?? emptyDateRange();
    this.value = { start: nextValue.start ?? null, end: nextValue.end ?? null };
    this.pendingValue = { ...this.value };

    if (this.value.start) {
      this.visibleMonth = this.startOfMonth(this.dateFromKey(this.value.start));
    }
  }

  registerOnChange(fn: (value: DateRangeFilterValue | string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.abierto = false;
  }

  open(endpoint: DateRangeEndpoint): void {
    if (this.disabled) return;
    this.abierto = true;
    this.activeEndpoint = endpoint;
    this.pendingValue = { ...this.value };
    const initial = this.value[endpoint] || this.value.start || this.boundKey(this.min) || this.todayKey;
    this.visibleMonth = this.startOfMonth(this.dateFromKey(initial));
  }

  select(day: CalendarDay): void {
    if (!day.currentMonth || this.isDisabled(day.key)) return;
    if (this.single) {
      this.pendingValue = { start: day.key, end: null };
      this.apply();
      return;
    }
    const selectingFirstDate = !this.pendingValue.start;
    this.pendingValue = selectDateInRange(this.pendingValue, day.key, this.activeEndpoint);

    if (this.activeEndpoint === 'start' || selectingFirstDate) {
      this.activeEndpoint = 'end';
    }
  }

  clear(): void {
    this.pendingValue = emptyDateRange();
    if (this.single) this.apply();
  }

  apply(): void {
    this.value = { ...this.pendingValue };
    this.onChange(this.single ? this.value.start || '' : { ...this.value });
    this.onTouched();
    this.abierto=false;
    this.restoreFocus();
  }

  close():void { const wasOpen=this.abierto;this.abierto=false;this.pendingValue={...this.value};this.onTouched();if(wasOpen)this.restoreFocus(); }

  private restoreFocus(): void { (this.activeEndpoint === 'end' && !this.single ? this.endTrigger : this.startTrigger)?.nativeElement.focus(); }
  focusCalendar(key?: string): void {
    setTimeout(() => {
      if (!this.abierto) return;
      const panel = this.calendarPanel?.nativeElement;
      const preferred = key || this.pendingValue[this.activeEndpoint] || this.pendingValue.start || this.todayKey;
      const button = panel?.querySelector<HTMLButtonElement>(`button[data-date="${preferred}"]:not(:disabled)`) || panel?.querySelector<HTMLButtonElement>('button[data-date]:not(:disabled)');
      button?.focus();
    });
  }
  calendarKeydown(event: KeyboardEvent): void {
    const key = (event.target as HTMLElement).getAttribute('data-date');
    if (!key) return;
    const date = this.dateFromKey(key);
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6-date.getDay() };
    if (!(event.key in offsets) && !['PageUp','PageDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key in offsets) date.setDate(date.getDate()+offsets[event.key]);
    else {
      const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+(event.key==='PageUp'?-1:1));
      date.setDate(Math.min(day,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));
    }
    const target=this.keyFromDate(date);
    if(this.isDisabled(target))return;
    this.visibleMonth=this.startOfMonth(date);this.focusCalendar(target);
  }
  chooseToday(): void {
    if(this.isDisabled(this.todayKey))return;
    this.visibleMonth=this.startOfMonth(new Date());
    this.select({key:this.todayKey,day:new Date().getDate(),currentMonth:true});
  }

  moveMonth(offset: number): void {
    this.visibleMonth = this.addMonths(this.visibleMonth, offset);
  }

  daysForMonth(month: Date): CalendarDay[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const previousMonthDays = new Date(year, monthIndex, 0).getDate();
    const days: CalendarDay[] = [];

    for (let index = 0; index < 42; index++) {
      const dayNumber = index - firstWeekday + 1;
      const date = new Date(year, monthIndex, dayNumber);
      days.push({
        key: this.keyFromDate(date),
        day: dayNumber < 1 ? previousMonthDays + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber,
        currentMonth: dayNumber >= 1 && dayNumber <= daysInMonth,
      });
    }

    return days;
  }

  isStart(key: string): boolean {
    return this.pendingValue.start === key;
  }

  isEnd(key: string): boolean {
    return this.pendingValue.end === key;
  }

  isInRange(key: string): boolean {
    return !!this.pendingValue.start && !!this.pendingValue.end && key > this.pendingValue.start && key < this.pendingValue.end;
  }

  isDisabled(key: string): boolean {
    const min=this.boundKey(this.min),max=this.boundKey(this.max);
    return !!(min && key<min || max && key>max);
  }
  private boundKey(bound: Date | string | null): string | null { return typeof bound==='string' ? bound || null : bound ? this.keyFromDate(bound) : null; }

  monthLabel(month: Date): string {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(month);
  }

  formatDate(key: string): string {
    const [year, month, day] = key.split('-');
    return `${day}/${month}/${year}`;
  }

  nights(range: DateRangeFilterValue): number {
    if (!range.start || !range.end) return 0;

    return Math.round(
      (this.dateFromKey(range.end).getTime() - this.dateFromKey(range.start).getTime()) / 86_400_000,
    );
  }

  private keyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private dateFromKey(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private addMonths(date: Date, offset: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + offset, 1);
  }
}
