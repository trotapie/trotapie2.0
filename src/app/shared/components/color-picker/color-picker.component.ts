import { Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'tp-color-picker, app-color-picker',
  standalone: true,
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ColorPickerComponent), multi: true }]
})
export class ColorPickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @ViewChild('nativeColorInput') private nativeColorInput?: ElementRef<HTMLInputElement>;

  value = '#FFFFFF';
  disabled = false;
  private onChange = (_value: string) => {};
  private onTouched = () => {};

  writeValue(value: string | null | undefined): void {
    this.value = this.normalize(value);
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  openPicker(): void {
    if (!this.disabled) this.nativeColorInput?.nativeElement.click();
  }

  onNativeInput(value: string): void {
    this.setValue(value);
  }

  onHexInput(value: string): void {
    const normalized = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) this.setValue(normalized);
    else this.value = normalized.slice(0, 7).toUpperCase();
  }

  normalizeHex(): void {
    this.setValue(this.value);
  }

  private setValue(value: string): void {
    this.value = this.normalize(value);
    this.onChange(this.value);
    this.onTouched();
  }

  private normalize(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : '#FFFFFF';
  }
}
