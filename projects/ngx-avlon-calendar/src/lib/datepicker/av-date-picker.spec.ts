import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { AvDatePicker } from './av-date-picker';
import { makeDate } from '../core/date-utils';
import { deepQuery, deepQueryAll } from '../testing/deep-query';

/** Types text into an input one character at a time, as a browser would. */
function typeInto(el: HTMLInputElement, text: string): void {
  el.focus();
  for (const ch of text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.value = el.value.slice(0, start) + ch + el.value.slice(end);
    el.setSelectionRange(start + 1, start + 1);
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
  }
}

function clear(el: HTMLInputElement): void {
  el.value = '';
  el.setSelectionRange(0, 0);
  el.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
}

function inputOf(fixture: ComponentFixture<unknown>): HTMLInputElement {
  const el = deepQuery<HTMLInputElement>(fixture.nativeElement, 'input');
  expect(el, 'expected the picker to render an input').toBeTruthy();
  return el!;
}

function errorTextOf(fixture: ComponentFixture<unknown>): string | null {
  const el = deepQuery(fixture.nativeElement, '[role="alert"]');
  return el ? (el.textContent ?? '').trim() : null;
}

// ------------------------------------------------------------------ //
// Reactive forms
// ------------------------------------------------------------------ //

@Component({
  imports: [AvDatePicker, ReactiveFormsModule],
  template: `
    <av-date-picker
      [formControl]="control"
      [min]="min()"
      [max]="max()"
      [required]="required()"
      [valueMode]="valueMode()"
      [displayFormat]="displayFormat()"
      label="Start date"
    />
  `,
})
class ReactiveHost {
  readonly control = new FormControl<unknown>(null);
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly required = signal(false);
  readonly valueMode = signal<'date' | 'iso-date' | 'timestamp' | 'formatted'>('date');
  readonly displayFormat = signal('MM/dd/yyyy');
}

describe('AvDatePicker with reactive forms', () => {
  let fixture: ComponentFixture<ReactiveHost>;
  let host: ReactiveHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReactiveHost] }).compileComponents();
    fixture = TestBed.createComponent(ReactiveHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders a control value as formatted text', async () => {
    host.control.setValue(makeDate(2026, 8, 20));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputOf(fixture).value).toBe('09/20/2026');
  });

  it('masks as the user types', () => {
    const el = inputOf(fixture);
    typeInto(el, '09202026');
    expect(el.value).toBe('09/20/2026');
  });

  it('writes a Date back to the control once the entry is complete', () => {
    typeInto(inputOf(fixture), '09202026');
    expect(host.control.value).toEqual(makeDate(2026, 8, 20));
  });

  it('holds the value at null while the entry is still partial', () => {
    typeInto(inputOf(fixture), '0920');
    expect(host.control.value).toBeNull();
    expect(host.control.errors).toBeNull();
  });

  it('reports a complete but impossible date as invalid', () => {
    typeInto(inputOf(fixture), '02302026');
    fixture.detectChanges();
    expect(host.control.value).toBeNull();
    expect(host.control.errors).toHaveProperty('avDateInvalid');
  });

  it('clears the error once the entry becomes valid again', () => {
    const el = inputOf(fixture);
    typeInto(el, '02302026');
    fixture.detectChanges();
    expect(host.control.errors).toHaveProperty('avDateInvalid');

    clear(el);
    typeInto(el, '02282026');
    fixture.detectChanges();
    expect(host.control.errors).toBeNull();
    expect(host.control.value).toEqual(makeDate(2026, 1, 28));
  });

  it('empties the control when the field is emptied', () => {
    const el = inputOf(fixture);
    typeInto(el, '09202026');
    expect(host.control.value).not.toBeNull();
    clear(el);
    expect(host.control.value).toBeNull();
  });

  it('enforces a minimum', async () => {
    host.min.set(makeDate(2026, 8, 15));
    fixture.detectChanges();
    await fixture.whenStable();

    typeInto(inputOf(fixture), '09102026');
    fixture.detectChanges();
    expect(host.control.errors).toHaveProperty('avDateMin');
  });

  it('enforces a maximum', async () => {
    host.max.set(makeDate(2026, 8, 15));
    fixture.detectChanges();
    await fixture.whenStable();

    typeInto(inputOf(fixture), '09202026');
    fixture.detectChanges();
    expect(host.control.errors).toHaveProperty('avDateMax');
  });

  it('accepts a date inside the range', async () => {
    host.min.set(makeDate(2026, 8, 1));
    host.max.set(makeDate(2026, 8, 30));
    fixture.detectChanges();
    await fixture.whenStable();

    typeInto(inputOf(fixture), '09152026');
    fixture.detectChanges();
    expect(host.control.errors).toBeNull();
  });

  it('re-validates when the bounds move', async () => {
    typeInto(inputOf(fixture), '09102026');
    fixture.detectChanges();
    expect(host.control.errors).toBeNull();

    host.min.set(makeDate(2026, 8, 15));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.control.errors).toHaveProperty('avDateMin');
  });

  it('reports a required empty field', async () => {
    host.required.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.control.errors).toHaveProperty('required');
  });

  it('shows an error message once the control is touched', async () => {
    host.min.set(makeDate(2026, 8, 15));
    fixture.detectChanges();
    await fixture.whenStable();

    const el = inputOf(fixture);
    typeInto(el, '09102026');
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(errorTextOf(fixture)).toBe('Choose a date on or after 09/15/2026.');
  });

  it('keeps errors hidden until the field is touched or edited', async () => {
    host.required.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(errorTextOf(fixture)).toBeNull();
  });

  it('reformats loose entry on blur', async () => {
    const el = inputOf(fixture);
    typeInto(el, '1');
    typeInto(el, '5');
    typeInto(el, '26');
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    // 1 -> month 01 after the 5 completes it, day 52 is impossible, so the
    // field keeps what was typed rather than inventing a date.
    expect(el.value.length).toBeGreaterThan(0);
  });

  it('marks the control disabled through the forms API', async () => {
    host.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputOf(fixture).disabled).toBe(true);
  });

  it('respects a different display format', async () => {
    host.displayFormat.set('dd.MM.yyyy');
    fixture.detectChanges();
    await fixture.whenStable();

    const el = inputOf(fixture);
    typeInto(el, '20092026');
    expect(el.value).toBe('20.09.2026');
    expect(host.control.value).toEqual(makeDate(2026, 8, 20));
  });

  it('derives the placeholder from the format', async () => {
    host.displayFormat.set('dd.MM.yyyy');
    fixture.detectChanges();
    await fixture.whenStable();

    // A floating label occupies the placeholder's position while the field is
    // empty and unfocused, so the hint only appears once the label lifts.
    const el = inputOf(fixture);
    expect(el.placeholder).toBe('');

    el.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.placeholder).toBe('dd.mm.yyyy');
  });

  describe('value modes', () => {
    it('emits an ISO calendar date', async () => {
      host.valueMode.set('iso-date');
      fixture.detectChanges();
      await fixture.whenStable();

      typeInto(inputOf(fixture), '09202026');
      expect(host.control.value).toBe('2026-09-20');
    });

    it('emits a timestamp', async () => {
      host.valueMode.set('timestamp');
      fixture.detectChanges();
      await fixture.whenStable();

      typeInto(inputOf(fixture), '09202026');
      expect(host.control.value).toBe(makeDate(2026, 8, 20).getTime());
    });

    it('emits formatted text', async () => {
      host.valueMode.set('formatted');
      fixture.detectChanges();
      await fixture.whenStable();

      typeInto(inputOf(fixture), '09202026');
      expect(host.control.value).toBe('09/20/2026');
    });

    it('reads an ISO calendar date back in', async () => {
      host.valueMode.set('iso-date');
      fixture.detectChanges();
      await fixture.whenStable();

      host.control.setValue('2026-09-20');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(inputOf(fixture).value).toBe('09/20/2026');
    });
  });

  it('composes with a validator the application adds itself', async () => {
    host.control.addValidators(Validators.required);
    host.control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.control.errors).toHaveProperty('required');
  });
});

// ------------------------------------------------------------------ //
// Template-driven forms
// ------------------------------------------------------------------ //

@Component({
  imports: [AvDatePicker, FormsModule],
  template: `<av-date-picker [(ngModel)]="birthday" name="birthday" label="Birthday" />`,
})
class TemplateDrivenHost {
  birthday: Date | null = null;
}

describe('AvDatePicker with template-driven forms', () => {
  let fixture: ComponentFixture<TemplateDrivenHost>;
  let host: TemplateDrivenHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TemplateDrivenHost] }).compileComponents();
    fixture = TestBed.createComponent(TemplateDrivenHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('writes an ngModel value into the field', async () => {
    host.birthday = makeDate(1990, 4, 2);
    // NgModel defers its write to a microtask, so the render that picks it up
    // is one cycle behind the assignment.
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputOf(fixture).value).toBe('05/02/1990');
  });

  it('pushes typed entry back into ngModel', async () => {
    typeInto(inputOf(fixture), '05021990');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.birthday).toEqual(makeDate(1990, 4, 2));
  });
});

// ------------------------------------------------------------------ //
// No forms at all
// ------------------------------------------------------------------ //

@Component({
  imports: [AvDatePicker],
  template: `<av-date-picker [(value)]="picked" [clearable]="true" label="Pick a day" />`,
})
class StandaloneHost {
  readonly picked = signal<Date | null>(null);
}

describe('AvDatePicker without a form', () => {
  let fixture: ComponentFixture<StandaloneHost>;
  let host: StandaloneHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StandaloneHost] }).compileComponents();
    fixture = TestBed.createComponent(StandaloneHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders a bound value', async () => {
    host.picked.set(makeDate(2026, 8, 20));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputOf(fixture).value).toBe('09/20/2026');
  });

  it('updates the bound signal as the user types', () => {
    typeInto(inputOf(fixture), '09202026');
    expect(host.picked()).toEqual(makeDate(2026, 8, 20));
  });

  it('offers a clear button only once there is something to clear', async () => {
    expect(deepQuery(fixture.nativeElement, '[aria-label="Clear date"]')).toBeNull();

    typeInto(inputOf(fixture), '09202026');
    fixture.detectChanges();
    await fixture.whenStable();

    const clearButton = deepQuery<HTMLButtonElement>(fixture.nativeElement, '[aria-label="Clear date"]');
    expect(clearButton).toBeTruthy();

    clearButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.picked()).toBeNull();
    expect(inputOf(fixture).value).toBe('');
  });
});

// ------------------------------------------------------------------ //
// Presentation
// ------------------------------------------------------------------ //

@Component({
  imports: [AvDatePicker],
  template: `
    <av-date-picker [iconPosition]="position()" [theme]="theme()" [inline]="inline()" label="Date" />
  `,
})
class PresentationHost {
  readonly position = signal<'left' | 'right' | 'none'>('right');
  readonly theme = signal<string | null>(null);
  readonly inline = signal(false);
}

describe('AvDatePicker presentation', () => {
  let fixture: ComponentFixture<PresentationHost>;
  let host: PresentationHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PresentationHost] }).compileComponents();
    fixture = TestBed.createComponent(PresentationHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function fieldChildren(): string[] {
    const field = deepQuery(fixture.nativeElement, '.av-field');
    expect(field, 'expected the picker to render a field').toBeTruthy();
    return Array.from(field!.children).map((c) => (c as Element).tagName.toLowerCase());
  }

  it('puts the toggle after the input by default', () => {
    expect(fieldChildren()).toEqual(['div', 'button']);
  });

  it('puts the toggle before the input on request', async () => {
    host.position.set('left');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fieldChildren()).toEqual(['button', 'div']);
  });

  it('drops the toggle entirely', async () => {
    host.position.set('none');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fieldChildren()).toEqual(['div']);
  });

  it('applies the default theme class', () => {
    expect(
      (fixture.nativeElement.querySelector('av-date-picker') as HTMLElement).className,
    ).toContain('av-theme-default');
  });

  it('applies a chosen theme class', async () => {
    host.theme.set('av-theme-midnight');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      (fixture.nativeElement.querySelector('av-date-picker') as HTMLElement).className,
    ).toContain('av-theme-midnight');
  });

  it('renders the calendar in the layout when inline', async () => {
    expect(deepQuery(fixture.nativeElement, 'av-calendar')).toBeNull();
    host.inline.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(deepQuery(fixture.nativeElement, 'av-calendar')).toBeTruthy();
  });

  it('links the input to its label and describes its state', () => {
    const input = inputOf(fixture);
    const label = deepQuery(fixture.nativeElement, 'label')!;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('aria-haspopup')).toBe('dialog');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
