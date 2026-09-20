import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
  type TemplateRef,
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type AbstractControl,
  type ControlValueAccessor,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { AvCalendar } from '../calendar/av-calendar';
import { AvDateAdapter } from '../core/date-adapter';
import { AV_CALENDAR_DEFAULTS, mergeConfig } from '../core/defaults';
import { maskSpecFor } from '../core/date-format';
import { AvMaskController } from '../core/mask-controller';
import {
  deepActiveElement,
  isOutside,
  positionPanel,
  supportsPopover,
  trapTab,
  type AvPlacement,
} from '../core/popover';
import { compareDays, isSameDay, isValidDate, startOfDay } from '../core/date-utils';
import { decodeValue, encodeValue, sameEncodedValue } from '../core/value-codec';
import type {
  AvCalendarView,
  AvDateFilter,
  AvDayCellContext,
  AvErrorMessages,
  AvFieldVariant,
  AvFloatLabel,
  AvIconPosition,
  AvOpenTrigger,
  AvSize,
  AvValueMode,
} from '../core/types';

let uniqueId = 0;

/**
 * A date field: masked text input, validation, and a calendar popover.
 *
 * Works three ways with no configuration change:
 *
 * - **Reactive forms** - `formControlName` / `[formControl]`.
 * - **Template-driven forms** - `[(ngModel)]`.
 * - **No forms at all** - `[(value)]`.
 *
 * The component registers itself as both the value accessor and a validator, so
 * `min`, `max`, `dateFilter` and unparseable text all reach the surrounding form
 * as ordinary control errors rather than as private component state.
 */
@Component({
  selector: 'av-date-picker',
  templateUrl: './av-date-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvCalendar, NgTemplateOutlet],
  encapsulation: ViewEncapsulation.ShadowDom,
  styleUrl: '../styles/av-styles.css',
  providers: [
    // Both hooks are registered as forward references to this component and
    // neither injects `NgControl`. Asking for `NgControl` here would be
    // circular: the form directive resolves `NG_VALIDATORS` while it is being
    // constructed, so a validator that needs the directive cannot exist yet.
    // The control arrives through `validate()` instead.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AvDatePicker), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AvDatePicker), multi: true },
  ],
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-disabled]': 'isDisabled() || null',
  },
})
export class AvDatePicker implements ControlValueAccessor, Validator, DoCheck, OnDestroy {
  private readonly defaults = inject(AV_CALENDAR_DEFAULTS);
  private readonly adapter = inject(AvDateAdapter);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly fieldRef = viewChild<ElementRef<HTMLElement>>('fieldBox');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly calendarRef = viewChild(AvCalendar);

  private readonly uid = `av-dp-${++uniqueId}`;

  // ---------------------------------------------------------------- //
  // Value
  // ---------------------------------------------------------------- //

  /** The selected date. Two-way bindable for use without a form. */
  readonly value = model<Date | null>(null);

  // ---------------------------------------------------------------- //
  // Format and parsing
  // ---------------------------------------------------------------- //

  /** Display and mask format. See the format table in the README. */
  readonly displayFormat = input(this.defaults.displayFormat);

  /** Shape of the value written to the form control. */
  readonly valueMode = input<AvValueMode>(this.defaults.valueMode);

  /** Format used when `valueMode` is `formatted`. Defaults to `displayFormat`. */
  readonly valueFormat = input<string | null>(this.defaults.valueFormat);

  /** Show the full mask while typing, e.g. `12/dd/yyyy`. */
  readonly showMaskPlaceholder = input(this.defaults.showMaskPlaceholder);

  /** Highest two-digit year read as 20xx. */
  readonly twoDigitYearPivot = input(this.defaults.twoDigitYearPivot);

  /** Complete a field from one unambiguous digit, so `5` becomes `05`. */
  readonly autoPad = input(true);

  // ---------------------------------------------------------------- //
  // Validation
  // ---------------------------------------------------------------- //

  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly dateFilter = input<AvDateFilter | null>(null);
  readonly required = input(false);

  /** Per-instance overrides for validation copy. */
  readonly errorMessages = input<AvErrorMessages | null>(null);

  /** Hide the built-in error block and render errors yourself. */
  readonly hideErrors = input(false);

  // ---------------------------------------------------------------- //
  // Presentation
  // ---------------------------------------------------------------- //

  readonly label = input<string | null>(null);
  readonly hint = input<string | null>(null);

  /** Overrides the placeholder the format would otherwise produce. */
  readonly placeholder = input<string | null>(null);

  readonly iconPosition = input<AvIconPosition>(this.defaults.iconPosition);
  readonly variant = input<AvFieldVariant>(this.defaults.variant);
  readonly size = input<AvSize>(this.defaults.size);
  readonly openOn = input<AvOpenTrigger>(this.defaults.openOn);
  readonly floatLabel = input<AvFloatLabel>(this.defaults.floatLabel);
  readonly clearable = input(this.defaults.clearable);

  /** Theme class for the field and the panel. */
  readonly theme = input<string | null>(null);

  /** Extra classes for the popover panel. */
  readonly panelClass = input<string>('');

  /** Which edge of the field the panel lines up with. */
  readonly panelAlign = input<'start' | 'end'>('start');

  /** Extra classes for the `input` element. */
  readonly inputClass = input<string>('');

  /** Render the calendar in the layout instead of in a popover. */
  readonly inline = input(false);

  readonly disabled = input(false);
  readonly readonly = input(false);

  /** Name and id forwarded to the native input. */
  readonly name = input<string | null>(null);
  readonly inputId = input<string | null>(null);

  // ---------------------------------------------------------------- //
  // Calendar passthrough
  // ---------------------------------------------------------------- //

  readonly numberOfMonths = input(this.defaults.numberOfMonths);
  readonly showWeekNumbers = input(this.defaults.showWeekNumbers);
  readonly showFooter = input(this.defaults.showFooter);
  readonly showOutsideDays = input(true);
  readonly firstDayOfWeek = input<number | null>(null);
  readonly startView = input<AvCalendarView>('days');
  readonly keepOpenOnSelect = input(this.defaults.keepOpenOnSelect);
  readonly todayLabel = input('Today');
  readonly clearLabel = input('Clear');

  /** Replaces the contents of every day cell. */
  readonly dayTemplate = input<TemplateRef<AvDayCellContext> | null>(null);

  // ---------------------------------------------------------------- //
  // Outputs
  // ---------------------------------------------------------------- //

  readonly opened = output<void>();
  readonly closed = output<void>();

  /** Fires with the offending text whenever entry stops being parseable. */
  readonly invalidInput = output<string>();

  // ---------------------------------------------------------------- //
  // Internal state
  // ---------------------------------------------------------------- //

  /** True once a form directive has bound to this picker. */
  protected readonly inForm = signal(false);

  protected readonly open = signal(false);
  protected readonly focused = signal(false);
  protected readonly text = signal('');
  protected readonly parseError = signal<'format' | 'nonexistent' | null>(null);
  protected readonly touched = signal(false);
  protected readonly dirty = signal(false);
  protected readonly disabledByForm = signal(false);
  protected readonly controlErrors = signal<ValidationErrors | null>(null);
  protected readonly controlShowsErrors = signal(false);

  /** Where the panel ended up, so the enter animation can slide the right way. */
  protected readonly placement = signal<AvPlacement>('bottom');
  protected readonly panelStyle = signal<Record<string, string>>({});

  /** Teardown for the listeners that only run while the panel is open. */
  private releasePanel: (() => void) | null = null;

  /** True while the user is editing the text, so value writes leave it alone. */
  private typing = false;
  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  private readonly mask = new AvMaskController(() => ({
    format: this.displayFormat(),
    showMaskPlaceholder: this.showMaskPlaceholder(),
    twoDigitYearPivot: this.twoDigitYearPivot(),
    autoPad: this.autoPad(),
  }));

  /**
   * The form control this picker is bound to, captured the first time Angular
   * asks it to validate. Stays null when the picker is used without a form,
   * which is how the two modes are told apart.
   */
  private controlRef: AbstractControl | null = null;

  constructor() {
    // An externally set value re-renders the text, unless the user is mid-edit.
    effect(() => {
      const value = this.value();
      this.displayFormat();
      this.showMaskPlaceholder();
      if (untracked(() => this.typing)) return;
      untracked(() => this.text.set(this.formatValue(value)));
    });

    // The input element is written imperatively because the mask owns its text.
    effect(() => {
      const el = this.inputRef()?.nativeElement;
      const text = this.text();
      if (el && el.value !== text) el.value = text;
    });

    // The panel is rendered by `@if (open())`, so it does not exist at the
    // moment the open command runs. Waiting on the view child rather than a
    // microtask is what makes this correct under zoneless change detection,
    // where rendering has not happened by the end of the current task.
    effect(() => {
      const panel = this.panelRef()?.nativeElement;
      const isOpen = this.open();
      untracked(() => {
        if (isOpen && panel) this.showPanel(panel);
      });
    });

    // Anything that changes what counts as valid has to re-run the validator.
    effect(() => {
      this.min();
      this.max();
      this.dateFilter();
      this.required();
      this.parseError();
      untracked(() => this.onValidatorChange());
    });
  }

  // ---------------------------------------------------------------- //
  // Derived presentation
  // ---------------------------------------------------------------- //

  protected readonly config = computed(() =>
    mergeConfig(this.defaults, {
      errorMessages: this.errorMessages() ?? undefined,
    }),
  );

  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly resolvedValueFormat = computed(
    () => this.valueFormat() ?? this.displayFormat(),
  );

  protected readonly hostClasses = computed(() =>
    ['av-date-picker', 'av-theme', this.theme() ?? this.defaults.theme, 'block'].join(' '),
  );

  protected readonly fieldId = computed(() => this.inputId() ?? `${this.uid}-input`);
  protected readonly hintId = computed(() => `${this.uid}-hint`);
  protected readonly errorId = computed(() => `${this.uid}-error`);
  protected readonly panelId = computed(() => `${this.uid}-panel`);

  protected readonly resolvedPlaceholder = computed(() => {
    const explicit = this.placeholder();
    if (explicit !== null) return explicit;
    const spec = maskSpecFor(this.displayFormat());
    return spec.maskable ? spec.placeholder : this.displayFormat();
  });

  protected readonly hasValue = computed(() => this.value() !== null || this.text().length > 0);

  protected readonly labelFloats = computed(() => {
    const mode = this.floatLabel();
    if (mode === 'always') return true;
    if (mode === 'never') return false;
    return this.focused() || this.hasValue();
  });

  /** Errors shown to the user, from the form control or from our own checks. */
  protected readonly visibleErrors = computed<ValidationErrors | null>(() => {
    if (this.hideErrors()) return null;
    if (this.inForm()) return this.controlShowsErrors() ? this.controlErrors() : null;
    const show = this.touched() || this.dirty();
    return show ? this.computeErrors(this.value()) : null;
  });

  protected readonly errorText = computed(() => {
    const errors = this.visibleErrors();
    if (!errors) return null;
    const messages = { ...this.defaults.errorMessages, ...(this.errorMessages() ?? {}) };
    for (const key of Object.keys(errors)) {
      const template = messages[key];
      if (template) return this.interpolate(template, errors[key]);
    }
    // An unrecognised error still deserves a visible state, just no copy.
    return null;
  });

  protected readonly invalid = computed(() => this.visibleErrors() !== null);

  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.errorText()) ids.push(this.errorId());
    else if (this.hint()) ids.push(this.hintId());
    return ids.length ? ids.join(' ') : null;
  });

  protected readonly sizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm':
        return {
          height: 'h-9',
          floatHeight: 'h-13',
          text: 'text-[0.82rem]',
          pad: 'px-2.5',
          icon: 'h-4 w-4',
          toggle: 'h-7 w-7',
          gap: 'gap-1.5',
          labelTop: 'top-1.5',
          inputBottom: 'bottom-1',
        };
      case 'lg':
        return {
          height: 'h-12',
          floatHeight: 'h-[4.25rem]',
          text: 'text-[1rem]',
          pad: 'px-4',
          icon: 'h-5 w-5',
          toggle: 'h-9 w-9',
          gap: 'gap-2.5',
          labelTop: 'top-2.5',
          inputBottom: 'bottom-2.5',
        };
      default:
        return {
          height: 'h-10.5',
          floatHeight: 'h-15',
          text: 'text-[0.9rem]',
          pad: 'px-3',
          icon: 'h-[1.05rem] w-[1.05rem]',
          toggle: 'h-8 w-8',
          gap: 'gap-2',
          labelTop: 'top-2',
          inputBottom: 'bottom-2',
        };
    }
  });

  /**
   * The field's full class string.
   *
   * Built as one joined string rather than an array: Angular's array form of
   * `[class]` treats each entry as a single class name and silently drops any
   * entry containing a space, which loses whole utility groups.
   */
  protected readonly fieldClasses = computed(() => {
    const sizes = this.sizeClasses();
    return [
      this.variantClasses(),
      this.floatingLabel() ? sizes.floatHeight : sizes.height,
      sizes.text,
      sizes.pad,
      sizes.gap,
      this.variant() === 'underlined' ? 'av-field-flat' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  /** True when the label renders inside the field rather than above it. */
  protected readonly floatingLabel = computed(
    () => !!this.label() && this.floatLabel() !== 'never',
  );

  protected readonly inputClasses = computed(() => {
    const sizes = this.sizeClasses();
    return [
      'av-field-input w-full min-w-0 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed',
      sizes.text,
      this.floatingLabel() ? `absolute left-0 h-6 ${sizes.inputBottom}` : 'h-full',
      this.inputClass(),
    ]
      .filter(Boolean)
      .join(' ');
  });

  protected readonly panelClasses = computed(() =>
    ['av-panel av-popover av-panel-enter overflow-auto', this.panelClass()]
      .filter(Boolean)
      .join(' '),
  );

  /** Position and type scale for the floating label, per control size. */
  protected readonly labelClasses = computed(() => {
    const sizes = this.sizeClasses();
    const tone = this.invalid()
      ? 'text-[var(--av-danger)]'
      : this.focused()
        ? 'text-[var(--av-accent)]'
        : 'text-[var(--av-fg-muted)]';

    return this.labelFloats()
      ? `${sizes.labelTop} text-[0.7rem] font-semibold tracking-wide ${tone}`
      : `top-1/2 -translate-y-1/2 ${sizes.text} text-[var(--av-fg-placeholder)]`;
  });

  protected readonly variantClasses = computed(() => {
    const invalid = this.invalid();
    const focused = this.focused();
    const disabled = this.isDisabled();

    const base = 'av-field relative flex w-full items-center';
    const ring = invalid
      ? 'ring-2 ring-[color-mix(in_oklab,var(--av-danger)_30%,transparent)]'
      : focused
        ? 'ring-[3px] ring-[var(--av-accent-ring)]'
        : '';

    const borderColor = invalid
      ? 'border-[var(--av-danger-border)]'
      : focused
        ? 'border-[var(--av-accent)]'
        : 'border-[var(--av-border)] hover:border-[var(--av-border-hover)]';

    switch (this.variant()) {
      case 'filled':
        return [
          base,
          'border border-transparent bg-[var(--av-surface-sunken)]',
          invalid ? 'border-[var(--av-danger-border)] bg-[var(--av-danger-soft)]' : focused ? 'border-[var(--av-accent)]' : '',
          ring,
          disabled ? 'opacity-60' : '',
        ].join(' ');
      case 'underlined':
        return [
          base,
          'rounded-none border-0 border-b-2 bg-transparent shadow-none',
          borderColor,
          disabled ? 'opacity-60' : '',
        ].join(' ');
      case 'ghost':
        return [
          base,
          'border border-transparent bg-transparent shadow-none',
          focused ? 'bg-[var(--av-surface)] border-[var(--av-border)]' : 'hover:bg-[var(--av-surface-hover)]',
          invalid ? 'border-[var(--av-danger-border)]' : '',
          ring,
          disabled ? 'opacity-60' : '',
        ].join(' ');
      default:
        return [
          base,
          'border',
          borderColor,
          invalid ? 'bg-[var(--av-danger-soft)]' : '',
          ring,
          disabled ? 'opacity-60' : '',
        ].join(' ');
    }
  });

  // ---------------------------------------------------------------- //
  // ControlValueAccessor
  // ---------------------------------------------------------------- //

  writeValue(value: unknown): void {
    const date = decodeValue(value, {
      mode: this.valueMode(),
      valueFormat: this.resolvedValueFormat(),
      names: this.adapter.names(),
    });
    this.typing = false;
    this.parseError.set(null);
    this.value.set(date);
    this.text.set(this.formatValue(date));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
    this.inForm.set(true);
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
    if (isDisabled) this.close();
  }

  // ---------------------------------------------------------------- //
  // Validator
  // ---------------------------------------------------------------- //

  validate(control: AbstractControl): ValidationErrors | null {
    this.controlRef = control;
    const date = decodeValue(control.value, {
      mode: this.valueMode(),
      valueFormat: this.resolvedValueFormat(),
      names: this.adapter.names(),
    });
    return this.computeErrors(date);
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /** Every rule the picker enforces, in the order they are reported. */
  private computeErrors(date: Date | null): ValidationErrors | null {
    const parseError = this.parseError();
    if (parseError) {
      return { avDateInvalid: { text: this.text(), reason: parseError } };
    }

    if (!date) {
      return this.required() ? { required: true } : null;
    }

    const min = this.min();
    if (min && compareDays(date, min) < 0) {
      return { avDateMin: { min: startOfDay(min), actual: date } };
    }

    const max = this.max();
    if (max && compareDays(date, max) > 0) {
      return { avDateMax: { max: startOfDay(max), actual: date } };
    }

    const filter = this.dateFilter();
    if (filter && !filter(date)) {
      return { avDateDisabled: { actual: date } };
    }

    return null;
  }

  ngOnDestroy(): void {
    this.releasePanel?.();
    this.releasePanel = null;
  }

  ngDoCheck(): void {
    const control = this.controlRef;
    if (!control) return;

    const errors = control.errors;
    if (errors !== this.controlErrors()) this.controlErrors.set(errors);

    const show = !!errors && (control.touched || control.dirty);
    if (show !== this.controlShowsErrors()) this.controlShowsErrors.set(show);

    if (control.touched !== this.touched()) this.touched.set(control.touched);
  }

  // ---------------------------------------------------------------- //
  // Input events
  // ---------------------------------------------------------------- //

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.typing = true;
    const text = this.mask.onInput(el, (event as InputEvent).inputType ?? null);
    this.text.set(text);
    this.dirty.set(true);
    this.commitText(text, { silent: false });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.readonly()) return;

    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }

    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && event.altKey) {
      event.preventDefault();
      this.toggle();
      return;
    }

    const el = event.target as HTMLInputElement;
    const handled = this.mask.onKeydown(el, event, this.value() ?? this.adapter.today());
    if (handled !== null) {
      this.typing = true;
      this.text.set(handled);
      this.dirty.set(true);
      this.commitText(handled, { silent: false });
    }
  }

  protected onFocus(): void {
    this.focused.set(true);
    if (this.openOn() === 'focus' && !this.isDisabled() && !this.readonly()) this.openPanel();
  }

  protected onInputClick(): void {
    if (this.openOn() === 'input' && !this.isDisabled() && !this.readonly()) this.openPanel();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.typing = false;
    this.markTouched();

    // Commit reformats to the canonical rendering, so `1/5/26` settles as
    // `01/05/2026` once the user leaves the field.
    const value = this.value();
    if (value && !this.parseError()) {
      this.text.set(this.formatValue(value));
      return;
    }
    // Incomplete entry keeps whatever was typed, minus a dangling separator.
    this.text.set(this.mask.tidy(this.text()));
  }

  /** Parses the current text and pushes the result to the form. */
  private commitText(text: string, options: { silent: boolean }): void {
    const trimmed = text.trim();

    if (!trimmed) {
      this.parseError.set(null);
      this.setValue(null, options.silent);
      return;
    }

    const result = this.adapter.parse(trimmed, this.displayFormat(), {
      twoDigitYearPivot: this.twoDigitYearPivot(),
    });

    if (result.status === 'ok') {
      this.parseError.set(null);
      this.setValue(result.date, options.silent);
      const calendar = this.calendarRef();
      calendar?.showMonth(result.date);
      return;
    }

    if (result.status === 'empty') {
      this.parseError.set(null);
      this.setValue(null, options.silent);
      return;
    }

    // Partial input is not yet wrong, so hold the error until the field is
    // full. Anything shorter than the mask is still being typed.
    const spec = maskSpecFor(this.displayFormat());
    const digits = trimmed.replace(/\D/g, '').length;
    const incomplete = spec.maskable && digits < spec.totalDigits;

    this.parseError.set(incomplete ? null : result.reason);
    if (!incomplete) this.invalidInput.emit(trimmed);
    this.setValue(null, options.silent);
  }

  private setValue(date: Date | null, silent: boolean): void {
    const current = this.value();
    const unchanged = isSameDay(current, date) || (current === null && date === null);
    if (!unchanged) this.value.set(date);
    if (silent) return;

    const encoded = encodeValue(date, {
      mode: this.valueMode(),
      valueFormat: this.resolvedValueFormat(),
      names: this.adapter.names(),
    });
    const previous = encodeValue(current, {
      mode: this.valueMode(),
      valueFormat: this.resolvedValueFormat(),
      names: this.adapter.names(),
    });
    if (!unchanged || !sameEncodedValue(encoded, previous)) this.onChange(encoded);
  }

  // ---------------------------------------------------------------- //
  // Panel
  // ---------------------------------------------------------------- //

  protected onToggleClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isDisabled() || this.readonly()) return;
    this.toggle();
  }

  /** Opens the popover and moves focus into the grid. */
  openPanel(): void {
    if (this.open() || this.isDisabled() || this.readonly() || this.inline()) return;
    this.open.set(true);
    this.opened.emit();
    // The panel element does not exist yet. An effect watching `panelRef`
    // picks it up once the view has rendered; see the constructor.
  }

  /** Closes the popover and returns focus to the input. */
  close(options: { restoreFocus?: boolean } = {}): void {
    if (!this.open()) return;

    this.releasePanel?.();
    this.releasePanel = null;

    const panel = this.panelRef()?.nativeElement;
    if (panel && supportsPopover(panel) && panel.matches(':popover-open')) {
      panel.hidePopover();
    }

    this.open.set(false);
    this.closed.emit();

    if (options.restoreFocus !== false) {
      this.inputRef()?.nativeElement.focus({ preventScroll: true });
    }
  }

  toggle(): void {
    if (this.open()) this.close();
    else this.openPanel();
  }

  /**
   * Promotes the panel to the top layer, places it, and starts the listeners
   * that keep it placed and dismissable.
   */
  private showPanel(panel: HTMLElement): void {
    if (this.releasePanel) return;

    // jsdom and older engines have no popover API. The panel still renders and
    // works; it is simply positioned in flow rather than in the top layer.
    if (supportsPopover(panel) && !panel.matches(':popover-open')) {
      panel.showPopover();
    }

    this.reposition();
    queueMicrotask(() => this.calendarRef()?.focus());

    const onDocumentPointer = (event: Event) => {
      if (isOutside(event, [this.host.nativeElement, panel])) {
        this.markTouched();
        this.close({ restoreFocus: false });
      }
    };
    const onViewportChange = () => this.reposition();

    document.addEventListener('pointerdown', onDocumentPointer, true);
    window.addEventListener('resize', onViewportChange);
    // Capture, so scrolling in any ancestor keeps the panel attached.
    window.addEventListener('scroll', onViewportChange, true);

    this.releasePanel = () => {
      document.removeEventListener('pointerdown', onDocumentPointer, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }

  /** Measures the field and the panel and pins the panel to the viewport. */
  private reposition(): void {
    const field = this.fieldRef()?.nativeElement;
    const panel = this.panelRef()?.nativeElement;
    if (!field || !panel) return;

    const anchor = field.getBoundingClientRect();
    const box = panel.getBoundingClientRect();

    const placed = positionPanel(
      anchor,
      { width: box.width || 300, height: box.height || 340 },
      { width: window.innerWidth, height: window.innerHeight },
      { alignEnd: this.panelAlign() === 'end' },
    );

    this.placement.set(placed.placement);
    this.panelStyle.set({
      top: `${Math.round(placed.top)}px`,
      left: `${Math.round(placed.left)}px`,
      'max-height': `${Math.round(placed.maxHeight)}px`,
    });
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const panel = this.panelRef()?.nativeElement;
    if (!panel) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }

    trapTab(panel, event);
  }

  /** Closes when focus leaves the component entirely, such as on a Tab out. */
  protected onPanelFocusOut(): void {
    if (!this.open()) return;
    queueMicrotask(() => {
      const active = deepActiveElement();
      const panel = this.panelRef()?.nativeElement;
      const inside =
        (panel && active && panel.contains(active)) ||
        (active && this.host.nativeElement.contains(active));
      if (!inside) this.close({ restoreFocus: false });
    });
  }

  protected onDateSelected(date: Date): void {
    this.typing = false;
    this.parseError.set(null);
    this.dirty.set(true);
    this.setValue(date, false);
    this.text.set(this.formatValue(date));
    this.markTouched();
    if (!this.keepOpenOnSelect() && !this.inline()) this.close();
  }

  protected onCalendarCleared(): void {
    this.typing = false;
    this.parseError.set(null);
    this.dirty.set(true);
    this.setValue(null, false);
    this.text.set('');
    this.markTouched();
  }

  protected clear(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isDisabled() || this.readonly()) return;
    this.typing = false;
    this.parseError.set(null);
    this.dirty.set(true);
    this.setValue(null, false);
    this.text.set('');
    this.inputRef()?.nativeElement.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- //
  // Helpers
  // ---------------------------------------------------------------- //

  private markTouched(): void {
    if (this.touched()) return;
    this.touched.set(true);
    this.onTouched();
  }

  private formatValue(value: Date | null): string {
    if (!isValidDate(value)) return '';
    return this.adapter.format(value, this.displayFormat());
  }

  /** Fills `{min}` and `{max}` placeholders in an error message. */
  private interpolate(template: string, detail: unknown): string {
    if (!detail || typeof detail !== 'object') return template;
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
      const raw = (detail as Record<string, unknown>)[key];
      if (raw instanceof Date) return this.adapter.format(raw, this.displayFormat());
      return raw === undefined ? match : String(raw);
    });
  }
}
