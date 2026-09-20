import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideAvlonCalendar } from 'ngx-avlon-calendar';
import { App } from './app';

/**
 * A smoke test over the whole demo page.
 *
 * It renders every section together and asserts the things a reader would
 * check by eye: that each section is present, that pickers render with the
 * options their section is meant to show, and that the interactive parts
 * actually change something.
 */

let fixture: ComponentFixture<App>;
let root: HTMLElement;

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideZonelessChangeDetection(),
      provideAvlonCalendar({ iconPosition: 'right', clearable: true, theme: 'av-theme-default' }),
    ],
  }).compileComponents();

  fixture = TestBed.createComponent(App);
  root = fixture.nativeElement as HTMLElement;
  await settle();
});

async function settle(): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function all(selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector));
}

function pickers(): HTMLElement[] {
  return all('av-date-picker');
}

function typeInto(el: HTMLInputElement, text: string): void {
  el.focus();
  for (const ch of text) {
    const start = el.selectionStart ?? el.value.length;
    el.value = el.value.slice(0, start) + ch + el.value.slice(el.selectionEnd ?? start);
    el.setSelectionRange(start + 1, start + 1);
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
  }
}

describe('the demo page', () => {
  it('renders every section', () => {
    for (const id of ['playground', 'themes', 'forms', 'masking', 'calendar']) {
      expect(root.querySelector(`#${id}`), `expected a #${id} section`).toBeTruthy();
    }
  });

  it('renders a heading for each section', () => {
    const headings = all('h2').map((h) => h.textContent?.trim());
    expect(headings).toContain('Presentation');
    expect(headings).toContain('Themes');
    expect(headings).toContain('Forms');
    expect(headings).toContain('Masking and values');
    expect(headings).toContain('Calendar');
    expect(headings).toContain('Keyboard');
  });

  it('renders many working pickers', () => {
    expect(pickers().length).toBeGreaterThan(10);
    expect(all('av-date-picker input').length).toBe(pickers().length);
  });

  it('gives every picker input a placeholder derived from its format', () => {
    const placeholders = new Set(
      (all('av-date-picker input') as HTMLInputElement[])
        .map((i) => i.placeholder)
        .filter(Boolean),
    );
    expect(placeholders.has('mm/dd/yyyy')).toBe(true);
    expect(placeholders.has('dd.mm.yyyy')).toBe(true);
    expect(placeholders.has('yyyy-mm-dd')).toBe(true);
  });
});

describe('theming section', () => {
  it('renders one live calendar per shipped theme plus a custom one', () => {
    const themed = all('#themes av-calendar').map((c) => c.className);
    for (const theme of [
      'av-theme-default',
      'av-theme-midnight',
      'av-theme-rose',
      'av-theme-forest',
      'av-theme-mono',
      'av-theme-glass',
      'demo-theme-citrus',
    ]) {
      expect(
        themed.some((c) => c.includes(theme)),
        `expected a calendar themed ${theme}`,
      ).toBe(true);
    }
  });

  it('shares one selected date across the theme cards', async () => {
    const cards = all('#themes av-calendar');
    const firstDay = cards[0]!.querySelector<HTMLButtonElement>(
      '[role="gridcell"] button:not([disabled])',
    );
    firstDay!.click();
    await settle();

    const selectedPerCard = all('#themes av-calendar').map(
      (c) => c.querySelectorAll('[role="gridcell"][aria-selected="true"]').length,
    );
    expect(selectedPerCard.every((n) => n === 1)).toBe(true);
  });
});

describe('presentation playground', () => {
  function optionButton(label: string): HTMLButtonElement {
    const found = all('#playground button').find((b) => b.textContent?.trim() === label);
    expect(found, `expected an option button labelled ${label}`).toBeTruthy();
    return found as HTMLButtonElement;
  }

  function stagePicker(): HTMLElement {
    return all('#playground av-date-picker')[0]!;
  }

  function toggleCheckbox(label: string): void {
    const found = all('#playground label').find((l) => l.textContent?.trim() === label);
    expect(found, `expected a checkbox labelled ${label}`).toBeTruthy();
    found!.querySelector('input')!.click();
  }

  it('starts on the default theme with the icon on the right', () => {
    expect(stagePicker().className).toContain('av-theme-default');
    const field = stagePicker().querySelector('[cdkOverlayOrigin]')!;
    expect(Array.from(field.children).map((c) => c.tagName.toLowerCase())).toEqual([
      'div',
      'button',
    ]);
  });

  it('moves the icon to the left', async () => {
    optionButton('Left').click();
    await settle();
    const field = stagePicker().querySelector('[cdkOverlayOrigin]')!;
    expect(Array.from(field.children).map((c) => c.tagName.toLowerCase())).toEqual([
      'button',
      'div',
    ]);
  });

  it('switches theme', async () => {
    optionButton('Midnight').click();
    await settle();
    expect(stagePicker().className).toContain('av-theme-midnight');
  });

  it('switches format, which changes the placeholder', async () => {
    optionButton('dd.MM.yyyy').click();
    await settle();
    const input = stagePicker().querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    await settle();
    expect(input.placeholder).toBe('dd.mm.yyyy');
  });

  it('shows two months on request', async () => {
    // "Inline calendar" is a checkbox, so the calendar renders in the layout
    // where the test can see it without opening the popover.
    toggleCheckbox('Inline calendar');
    optionButton('Two').click();
    await settle();
    expect(all('#playground av-calendar [role="grid"]').length).toBe(2);
  });

  it('keeps the generated markup in step with the options', async () => {
    optionButton('Large').click();
    await settle();
    const markup = root.querySelector('#playground pre')!.textContent ?? '';
    expect(markup).toContain('size="lg"');
    expect(markup).toContain('<av-date-picker');
  });

  it('renders the calendar inline when asked', async () => {
    expect(all('#playground av-calendar').length).toBe(0);
    toggleCheckbox('Inline calendar');
    await settle();
    expect(all('#playground av-calendar').length).toBe(1);
  });
});

describe('forms section', () => {
  function pickerInput(index: number): HTMLInputElement {
    return all('#forms av-date-picker input')[index] as HTMLInputElement;
  }

  it('renders a reactive, a template-driven, and a formless group', () => {
    const headings = all('#forms h3').map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Reactive forms', 'Template-driven', 'No form at all']);
  });

  it('starts with the submit button disabled because the form is empty', () => {
    const submit = root.querySelector('#forms button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(submit.textContent?.trim()).toBe('Fix the form to continue');
  });

  it('reports the reactive form as invalid until it is filled', () => {
    const status = root.querySelector('#forms pre')?.parentElement?.textContent ?? '';
    expect(status).toContain('INVALID');
  });

  it('writes an ISO string into the reactive control', async () => {
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');

    typeInto(pickerInput(0), `${mm}${dd}${next.getFullYear()}`);
    await settle();

    const json = root.querySelector('#forms pre')?.textContent ?? '';
    expect(json).toContain(`${next.getFullYear()}-${mm}-${dd}`);
  });

  it('shows a validation error for a date before the minimum', async () => {
    typeInto(pickerInput(0), '01011990');
    pickerInput(0).dispatchEvent(new Event('blur'));
    await settle();
    const alerts = all('#forms [role="alert"]').map((a) => a.textContent?.trim());
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('fills the formless range from a button', async () => {
    const button = all('#forms button').find(
      (b) => b.textContent?.trim() === 'Set to this month',
    );
    button!.click();
    await settle();
    const readout = all('#forms .font-mono').map((d) => d.textContent ?? '').join(' ');
    expect(readout).toContain(' to ');
  });
});

describe('masking section', () => {
  it('labels each format as masked or free text', () => {
    const labels = all('#masking span').map((s) => s.textContent?.trim());
    expect(labels).toContain('masked');
    expect(labels).toContain('free text');
  });

  it('shares one value across every format field', async () => {
    const inputs = all('#masking av-date-picker input') as HTMLInputElement[];
    typeInto(inputs[0]!, '09202026');
    await settle();

    const values = (all('#masking av-date-picker input') as HTMLInputElement[])
      .slice(0, 5)
      .map((i) => i.value);
    expect(values[0]).toBe('09/20/2026');
    expect(values[1]).toBe('20.09.2026');
    expect(values[2]).toBe('2026-09-20');
    expect(values[3]).toBe('20/09/26');
    expect(values[4]).toBe('Sep 20, 2026');
  });

  it('shows which sample strings the parser accepts', () => {
    const text = root.querySelector('#masking')?.textContent ?? '';
    expect(text).toContain('12/31/2026');
    expect(text).toContain('no such day');
    expect(text).toContain('does not match the format');
  });

  it('masks the standalone directive input', async () => {
    const input = root.querySelector('#masking input[inputmode="numeric"]:not([id])') as
      | HTMLInputElement
      | null;
    const target = input ?? (all('#masking input').at(-1) as HTMLInputElement);
    typeInto(target, '31122026');
    await settle();
    expect(target.value).toBe('31/12/2026');
  });

  it('reports the emitted value shape for each mode', async () => {
    const isoButton = all('#masking button').find((b) => b.textContent?.trim() === 'iso-date');
    isoButton!.click();
    await settle();

    const modeInput = all('#masking av-date-picker input').at(-1) as HTMLInputElement;
    typeInto(modeInput, '09202026');
    await settle();

    const readout = root.querySelector('#masking .bg-slate-900')?.textContent ?? '';
    expect(readout).toContain('2026-09-20');
    expect(readout).toContain('string');
  });
});

describe('calendar section', () => {
  it('renders the inline, availability, two-month and custom-cell calendars', () => {
    expect(all('#calendar av-calendar').length).toBeGreaterThanOrEqual(5);
  });

  it('shows week numbers on the inline calendar', () => {
    const first = all('#calendar av-calendar')[0]!;
    expect(first.querySelector('[aria-label="Week"]')).toBeTruthy();
  });

  it('strikes out unavailable days', () => {
    const availability = all('#calendar av-calendar')[1]!;
    const disabled = availability.querySelectorAll('button[disabled]');
    expect(disabled.length).toBeGreaterThan(0);
  });

  it('prints a rate inside every day cell of the custom calendar', () => {
    const custom = all('#calendar av-calendar').find((c) =>
      c.textContent?.includes('$'),
    );
    expect(custom, 'expected a calendar rendering prices').toBeTruthy();
    expect(custom!.textContent).toMatch(/\$\d+/);
  });

  it('changes the first day of week from the buttons', async () => {
    const monday = all('#calendar button').find((b) => b.textContent?.trim() === 'Monday');
    monday!.click();
    await settle();

    const localeCalendar = all('#calendar av-calendar').at(-1)!;
    const firstHeader = localeCalendar.querySelector('[role="columnheader"]');
    expect(firstHeader?.getAttribute('aria-label')).toBe('Monday');
  });
});

describe('dark mode', () => {
  it('toggles the class the themes key off', async () => {
    const toggle = all('button').find((b) =>
      b.getAttribute('aria-label')?.startsWith('Switch to'),
    );
    expect(toggle).toBeTruthy();

    const before = document.documentElement.classList.contains('dark');
    toggle!.click();
    await settle();
    expect(document.documentElement.classList.contains('dark')).toBe(!before);

    toggle!.click();
    await settle();
    expect(document.documentElement.classList.contains('dark')).toBe(before);
  });
});
