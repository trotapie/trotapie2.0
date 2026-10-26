import {PopupKeyboardDirective} from '../../directives/popup-keyboard.directive';
import {Icon} from '../icon/icon';
import {MotionDirective} from '../../directives/motion.directive';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

export interface TpSelectSearchOption {
  value: string | number;
  label: string;
  group?: string;
  disabled?: boolean;
}

@Component({
  selector: 'tp-select-search, app-tp-select-search',
  standalone: true,
  imports: [CommonModule, OverlayModule, Icon, MotionDirective,PopupKeyboardDirective],
  templateUrl: './tp-select-search.component.html',
  styleUrl: './tp-select-search.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TpSelectSearchComponent), multi: true }]
})
export class TpSelectSearchComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Seleccionar';
  @Input() searchPlaceholder = 'Buscar opciones';
  @Input() emptyMessage = 'No hay opciones que coincidan.';
  @Input() options: TpSelectSearchOption[] = [];
  @Input() required = false;
  @Input() disabled = false;
  @Input() bookingStyle = false;
  @Input() hoverHighlight = true;
  @Input() showClear = true;
  @Input() showSearch = true;
  @Output() selectionChange = new EventEmitter<string | number | null>();
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('triggerButton') private triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('optionsPanel') private optionsPanel?: ElementRef<HTMLElement>;

  abierto = false;
  busqueda = '';
  valorSeleccionado: string | number | null = null;
  private controlDisabled = false;
  readonly posiciones: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 }
  ];
  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get opcionesFiltradas(): TpSelectSearchOption[] {
    const normalize=(value:string)=>value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
    const filtro=normalize(this.busqueda);
    return filtro?this.options.filter(option=>normalize(option.label).includes(filtro)):this.options;
  }

  get textoSeleccion(): string {
    return this.options.find((option) => this.sameValue(option.value, this.valorSeleccionado))?.label ?? this.placeholder;
  }

  get isDisabled(): boolean { return this.disabled || this.controlDisabled; }

  writeValue(value: string | number | null): void { this.valorSeleccionado = value; }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.controlDisabled = isDisabled; }

  abrir(): void {
    if (this.isDisabled) return;
    this.abierto = true;
    setTimeout(() => {
      if (!this.abierto) return;
      if (this.showSearch) this.searchInput?.nativeElement.focus();
      else {
        const panel=this.optionsPanel?.nativeElement;
        (panel?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)') || panel?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)'))?.focus();
      }
    });
  }

  cerrar(): void {
    const wasOpen=this.abierto;
    this.abierto = false;
    this.busqueda = '';
    this.onTouched();
    if(wasOpen)this.triggerButton?.nativeElement.focus();
  }

  seleccionar(option: TpSelectSearchOption): void {
    if (option.disabled) return;
    this.valorSeleccionado = option.value;
    this.onChange(option.value);
    this.selectionChange.emit(option.value);
    this.cerrar();
  }

  limpiar(): void {
    this.valorSeleccionado = null;
    this.onChange(null);
    this.selectionChange.emit(null);
    this.cerrar();
  }

  trackByValue(_: number, option: TpSelectSearchOption): string | number { return option.value; }
  sameValue(left: string | number | null, right: string | number | null): boolean { return String(left) === String(right); }
}
