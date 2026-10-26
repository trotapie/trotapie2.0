import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'tp-switch, app-custom-switch',
  standalone: true,
  templateUrl: './custom-switch.component.html',
  styleUrl: './custom-switch.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CustomSwitchComponent), multi: true }],
})
export class CustomSwitchComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() stacked = false;
  @Input() disabled = false;
  @Input() set checked(checked: boolean) { this.value = Boolean(checked); }
  @Output() change = new EventEmitter<boolean>();

  value = false;
  private onChange = (_value: boolean) => {};
  private onTouched = () => {};

  writeValue(value: boolean): void { this.value = Boolean(value); }
  registerOnChange(fn: (value: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  update(value: boolean): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
    this.change.emit(value);
  }
}

