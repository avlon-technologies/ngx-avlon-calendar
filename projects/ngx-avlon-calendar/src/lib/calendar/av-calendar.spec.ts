import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AvCalendar } from './av-calendar';
import { addDays, isSameDay, makeDate } from '../core/date-utils';
import { deepQuery, deepQueryAll } from '../testing/deep-query';
import type { AvDateFilter } from '../core/types';

@Component({
  imports: [AvCalendar],
  template: `
    <av-calendar
      [(value)]="value"
      [activeDate]="activeDate()"
      [min]="min()"
      [max]="max()"
      [dateFilter]="dateFilter()"
      [firstDayOfWeek]="firstDayOfWeek()"
      [numberOfMonths]="numberOfMonths()"
      [showWeekNumbers]="showWeekNumbers()"
      [showOutsideDays]="showOutsideDays()"
      [startView]="startView()"
    />
  `,
})
class Host {
  readonly value = signal<Date | null>(null);
  readonly activeDate = signal<Date | null>(makeDate(2026, 8, 1)); // September 2026
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly dateFilter = signal<AvDateFilter | null>(null);
  readonly firstDayOfWeek = signal<number | null>(0);
  readonly numberOfMonths = signal(1);
  readonly showWeekNumbers = signal(false);
  readonly showOutsideDays = signal(true);
  readonly startView = signal<'days' | 'months' | 'years'>('days');
}

let fixture: ComponentFixture<Host>;
let host: Host;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
});

async function settle(): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function el(selector: string): HTMLElement {
  const node = deepQuery(fixture.nativeElement, selector);
  expect(node, `expected to find ${selector}`).toBeTruthy();
  return node as HTMLElement;
}

function all(selector: string): HTMLElement[] {
  return deepQueryAll(fixture.nativeElement, selector);
}

/** Every day button, in grid order. */
function dayButtons(): HTMLButtonElement[] {
  return all('[role="gridcell"] button') as HTMLButtonElement[];
}

/** The button whose accessible label names the given date. */
function buttonFor(date: Date): HTMLButtonElement {
  const label = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const found = dayButtons().find((b) => b.getAttribute('aria-label') === label);
  expect(found, `expected a cell for ${label}`).toBeTruthy();
  return found!;
}

function headerLabel(): string {
  return (el('[aria-label^="Change view"]').textContent ?? '').trim();
}

function activeCell(): HTMLElement {
  return el('[data-av-active="true"]');
}

function pressOnGrid(key: string, options: KeyboardEventInit = {}): void {
  el('av-calendar').dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }),
  );
}

describe('grid', () => {
  it('renders six weeks of seven days', () => {
    expect(all('[role="row"]').length).toBe(7); // header row plus six weeks
    expect(dayButtons().length).toBe(42);
  });

  it('names the month in the header', () => {
    expect(headerLabel()).toContain('September 2026');
  });

  it('starts the week on the configured day', async () => {
    const headers = all('[role="columnheader"]').map((h) => h.getAttribute('aria-label'));
    expect(headers[0]).toBe('Sunday');

    host.firstDayOfWeek.set(1);
    await settle();
    expect(all('[role="columnheader"]')[0]!.getAttribute('aria-label')).toBe('Monday');
  });

  it('marks days outside the month', () => {
    // 1 September 2026 is a Tuesday, so the grid opens with two August days.
    const first = dayButtons()[0]!;
    expect(first.textContent?.trim()).toBe('30');
    expect(first.className).toContain('av-fg-subtle');
  });

  it('can hide days outside the month', async () => {
    host.showOutsideDays.set(false);
    await settle();
    expect(dayButtons().length).toBe(30); // September has 30 days
  });

  it('shows ISO week numbers on request', async () => {
    host.showWeekNumbers.set(true);
    await settle();
    const headers = all('[role="columnheader"]');
    expect(headers.length).toBe(8);
    expect(headers[0]!.getAttribute('aria-label')).toBe('Week');
  });

  it('renders two months side by side', async () => {
    host.numberOfMonths.set(2);
    await settle();
    expect(all('[role="grid"]').length).toBe(2);
    expect(dayButtons().length).toBe(84);
    expect(headerLabel()).toContain('Sep 2026');
    expect(headerLabel()).toContain('Oct 2026');
  });
});

describe('selection', () => {
  it('selects the clicked day', async () => {
    buttonFor(makeDate(2026, 8, 15)).click();
    await settle();
    expect(host.value()).toEqual(makeDate(2026, 8, 15));
  });

  it('marks the selected cell for assistive technology', async () => {
    host.value.set(makeDate(2026, 8, 15));
    await settle();
    const cell = buttonFor(makeDate(2026, 8, 15)).closest('[role="gridcell"]');
    expect(cell?.getAttribute('aria-selected')).toBe('true');
  });

  it('follows an externally set value to another month', async () => {
    host.value.set(makeDate(2026, 11, 25));
    await settle();
    expect(headerLabel()).toContain('December 2026');
  });
});

describe('limits', () => {
  it('disables days before min', async () => {
    host.min.set(makeDate(2026, 8, 10));
    await settle();
    expect(buttonFor(makeDate(2026, 8, 9)).disabled).toBe(true);
    expect(buttonFor(makeDate(2026, 8, 10)).disabled).toBe(false);
  });

  it('disables days after max', async () => {
    host.max.set(makeDate(2026, 8, 10));
    await settle();
    expect(buttonFor(makeDate(2026, 8, 11)).disabled).toBe(true);
    expect(buttonFor(makeDate(2026, 8, 10)).disabled).toBe(false);
  });

  it('disables days the filter rejects', async () => {
    host.dateFilter.set((date) => date.getDay() !== 0 && date.getDay() !== 6);
    await settle();
    expect(buttonFor(makeDate(2026, 8, 5)).disabled).toBe(true); // Saturday
    expect(buttonFor(makeDate(2026, 8, 7)).disabled).toBe(false); // Monday
  });

  it('refuses to select a disabled day', async () => {
    host.min.set(makeDate(2026, 8, 10));
    await settle();
    buttonFor(makeDate(2026, 8, 9)).click();
    await settle();
    expect(host.value()).toBeNull();
  });

  it('stops paging past the limits', async () => {
    host.min.set(makeDate(2026, 8, 1));
    host.max.set(makeDate(2026, 8, 30));
    await settle();
    const [prev, , next] = all('button[aria-label$="month"], button[aria-label^="Change view"]');
    expect((prev as HTMLButtonElement).disabled).toBe(true);
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('paging', () => {
  it('moves back a month', async () => {
    el('[aria-label="Previous month"]').click();
    await settle();
    expect(headerLabel()).toContain('August 2026');
  });

  it('moves forward a month', async () => {
    el('[aria-label="Next month"]').click();
    await settle();
    expect(headerLabel()).toContain('October 2026');
  });

  it('crosses a year boundary', async () => {
    for (let i = 0; i < 4; i++) {
      el('[aria-label="Next month"]').click();
      await settle();
    }
    expect(headerLabel()).toContain('January 2027');
  });
});

describe('zoom levels', () => {
  it('goes from days to months to years and back', async () => {
    const cycle = () => el('[aria-label^="Change view"]').click();

    cycle();
    await settle();
    expect(el('[role="grid"]').getAttribute('aria-label')).toBe('Choose a month');
    expect(headerLabel()).toContain('2026');

    cycle();
    await settle();
    expect(el('[role="grid"]').getAttribute('aria-label')).toBe('Choose a year');

    cycle();
    await settle();
    expect(headerLabel()).toContain('September 2026');
  });

  it('drills from a year to a month to the day grid', async () => {
    host.startView.set('years');
    await settle();

    const year2028 = all('[role="gridcell"]').find((b) => b.textContent?.trim() === '2028');
    expect(year2028).toBeTruthy();
    year2028!.click();
    await settle();
    expect(el('[role="grid"]').getAttribute('aria-label')).toBe('Choose a month');

    const march = all('[role="gridcell"]').find((b) => b.textContent?.trim() === 'Mar');
    march!.click();
    await settle();
    expect(headerLabel()).toContain('March 2028');
  });

  it('offers 24 years per page', async () => {
    host.startView.set('years');
    await settle();
    expect(all('[role="gridcell"]').length).toBe(24);
  });
});

describe('keyboard', () => {
  beforeEach(async () => {
    host.value.set(makeDate(2026, 8, 15));
    await settle();
  });

  it('moves a day at a time', async () => {
    pressOnGrid('ArrowRight');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 16');

    pressOnGrid('ArrowLeft');
    pressOnGrid('ArrowLeft');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 14');
  });

  it('moves a week at a time', async () => {
    pressOnGrid('ArrowDown');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 22');

    pressOnGrid('ArrowUp');
    pressOnGrid('ArrowUp');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 8');
  });

  it('jumps to the ends of the week', async () => {
    pressOnGrid('Home');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 13'); // Sunday

    pressOnGrid('End');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 19'); // Saturday
  });

  it('pages by month and by year', async () => {
    pressOnGrid('PageDown');
    await settle();
    expect(headerLabel()).toContain('October 2026');

    pressOnGrid('PageUp', { shiftKey: true });
    await settle();
    expect(headerLabel()).toContain('October 2025');
  });

  it('pages the view when focus walks off the month', async () => {
    // From 15 September, Home lands on Sunday the 13th; two weeks up is 30 August.
    pressOnGrid('Home');
    await settle();
    pressOnGrid('ArrowUp');
    pressOnGrid('ArrowUp');
    await settle();
    expect(headerLabel()).toContain('August 2026');
    expect(activeCell().getAttribute('aria-label')).toContain('August 30');
  });

  it('selects with Enter', async () => {
    pressOnGrid('ArrowRight');
    await settle();
    pressOnGrid('Enter');
    await settle();
    expect(host.value()).toEqual(makeDate(2026, 8, 16));
  });

  it('selects with Space', async () => {
    pressOnGrid('ArrowDown');
    await settle();
    pressOnGrid(' ');
    await settle();
    expect(host.value()).toEqual(makeDate(2026, 8, 22));
  });

  it('never walks outside the allowed window', async () => {
    host.min.set(makeDate(2026, 8, 15));
    await settle();
    pressOnGrid('ArrowLeft');
    pressOnGrid('ArrowLeft');
    await settle();
    expect(activeCell().getAttribute('aria-label')).toContain('September 15');
  });

  it('keeps exactly one cell in the tab order', () => {
    const tabbable = dayButtons().filter((b) => b.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
  });
});

describe('footer', () => {
  it('jumps to today and selects it', async () => {
    el('button:not([aria-label])')?.click();
    const todayButton = all('button').find((b) => b.textContent?.trim() === 'Today');
    todayButton!.click();
    await settle();
    expect(isSameDay(host.value(), new Date())).toBe(true);
  });

  it('clears the selection', async () => {
    host.value.set(makeDate(2026, 8, 15));
    await settle();

    const clearButton = all('button').find((b) => b.textContent?.trim() === 'Clear') as
      HTMLButtonElement | undefined;
    expect(clearButton?.disabled).toBe(false);
    clearButton!.click();
    await settle();
    expect(host.value()).toBeNull();
  });

  it('disables Clear when there is nothing to clear', () => {
    const clearButton = all('button').find((b) => b.textContent?.trim() === 'Clear') as
      HTMLButtonElement | undefined;
    expect(clearButton?.disabled).toBe(true);
  });
});

describe('announcements', () => {
  it('describes the focused day in a live region', async () => {
    host.value.set(makeDate(2026, 8, 15));
    await settle();
    const live = el('[aria-live="polite"]');
    expect(live.textContent).toContain('September 15, 2026');

    pressOnGrid('ArrowRight');
    await settle();
    expect(el('[aria-live="polite"]').textContent).toContain('September 16, 2026');
  });

  it('marks today with aria-current', async () => {
    host.activeDate.set(new Date());
    await settle();
    const current = el('[aria-current="date"]');
    expect(current).toBeTruthy();
    expect(current.textContent?.trim()).toBe(String(new Date().getDate()));
  });
});

describe('theming', () => {
  it('carries the token contract class', () => {
    const root = el('av-calendar');
    expect(root.className).toContain('av-theme');
    expect(root.className).toContain('av-theme-default');
  });
});

describe('adjacent-month cells', () => {
  it('selects into the next month from a trailing cell', async () => {
    const last = dayButtons().at(-1)!;
    last.click();
    await settle();
    // The grid always shows six weeks, so September 2026 trails into October.
    expect(host.value()!.getMonth()).toBe(9);
    expect(headerLabel()).toContain('October 2026');
  });

  it('keeps a trailing cell inside the selectable window', async () => {
    host.max.set(addDays(makeDate(2026, 8, 30), 0));
    await settle();
    expect(dayButtons().at(-1)!.disabled).toBe(true);
  });
});
