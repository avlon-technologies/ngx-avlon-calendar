import { Directive, ElementRef, computed, effect, forwardRef, inject, input } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { AvDateAdapter } from '../core/date-adapter';
import { AV_CALENDAR_DEFAULTS } from '../core/defaults';
import { AvMaskController } from '../core/mask-controller';

/**
 * Format-driven input masking for a plain text input.
 *
 * `av-date-picker` already does this internally; this directive exists for the
 * case where you want the typing behaviour without the calendar, on an input
 * you lay out yourself.
 *
 * ```html
 * <input avDateMask="dd/MM/yyyy" [(ngModel)]="birthday" />
 * ```
 *
 * The directive is the input's value accessor, so the bound model receives the
 * masked **text**. Pair it with `avDateValid()` if you want the control to
 * reject text that is not a real date.
 */
@Directive({
  selector: 'input[avDateMask]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AvDateMask),
      multi: true,
    },
  ],
  host: {
    '[attr.placeholder]': 'placeholderAttr()',
    inputmode: 'numeric',
    autocomplete: 'off',
    '(input)': 'handleInput($event)',
    '(keydown)': 'handleKeydown($event)',
    '(blur)': 'handleBlur()',
  },
})
export class AvDateMask implements ControlValueAccessor {
  private readonly defaults = inject(AV_CALENDAR_DEFAULTS);
  private readonly adapter = inject(AvDateAdapter);
  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** The date format that drives the mask, e.g. `dd/MM/yyyy`. */
  readonly avDateMask = input(this.defaults.displayFormat);

  /** Show the full mask while typing, e.g. `12/dd/yyyy`. */
  readonly showMaskPlaceholder = input(this.defaults.showMaskPlaceholder);

  readonly twoDigitYearPivot = input(this.defaults.twoDigitYearPivot);

  /** Complete a field from one unambiguous digit, so `5` becomes `05`. */
  readonly autoPad = input(true);

  /** Set to false to keep the element's own placeholder attribute. */
  readonly maskPlaceholder = input(true);

  private readonly mask = new AvMaskController(() => ({
    format: this.avDateMask(),
    showMaskPlaceholder: this.showMaskPlaceholder(),
    twoDigitYearPivot: this.twoDigitYearPivot(),
    autoPad: this.autoPad(),
  }));

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly placeholderAttr = computed(() =>
    this.maskPlaceholder() ? this.mask.placeholder : null,
  );

  constructor() {
    // Re-render whatever is in the field when the format changes underneath it.
    effect(() => {
      this.avDateMask();
      this.showMaskPlaceholder();
      const el = this.host.nativeElement;
      const next = this.mask.render(el.value);
      if (next !== el.value) {
        el.value = next;
        this.onChange(next);
      }
    });
  }

  writeValue(value: unknown): void {
    this.mask.write(this.host.nativeElement, value == null ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host.nativeElement.disabled = isDisabled;
  }

  protected handleInput(event: Event): void {
    const text = this.mask.onInput(
      this.host.nativeElement,
      (event as InputEvent).inputType ?? null,
    );
    this.onChange(text);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    const text = this.mask.onKeydown(this.host.nativeElement, event, this.adapter.today());
    if (text !== null) this.onChange(text);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
