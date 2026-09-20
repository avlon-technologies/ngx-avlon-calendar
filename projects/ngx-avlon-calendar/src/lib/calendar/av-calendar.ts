import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
  type TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AvDateAdapter } from '../core/date-adapter';
import { AV_CALENDAR_DEFAULTS } from '../core/defaults';
import {
  addDays,
  addMonths,
  addYears,
  calendarGrid,
  clampDate,
  compareDays,
  daysInMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isoWeekNumber,
  makeDate,
  startOfDay,
  startOfMonth,
  yearPage,
} from '../core/date-utils';
import type { AvCalendarView, AvDateFilter, AvDayCellContext, AvSize } from '../core/types';

/** One day in the rendered grid, with every flag the template needs. */
export interface AvDayCell {
  readonly date: Date;
  readonly time: number;
  readonly day: number;
  readonly label: string;
  /** Belongs to the previous or next month. */
  readonly outside: boolean;
  readonly today: boolean;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly weekend: boolean;
}

export interface AvWeekRow {
  readonly weekNumber: number;
  readonly days: readonly AvDayCell[];
}

export interface AvMonthModel {
  readonly date: Date;
  readonly label: string;
  readonly weeks: readonly AvWeekRow[];
}

/** A cell in the month-picker or year-picker view. */
export interface AvChoiceCell {
  readonly label: string;
  readonly value: number;
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly current: boolean;
  readonly focused: boolean;
}

const YEARS_PER_PAGE = 24;

/**
 * The calendar surface: a month grid with month and year zoom levels.
 *
 * Usable on its own for an always-visible calendar, and used by
 * `av-date-picker` as the contents of its popover. It owns no text input and no
 * form plumbing, which keeps it easy to drop into a sidebar or a booking layout.
 *
 * ### State model
 *
 * Two pieces of state drive everything: `anchorMonth` (the first month on
 * screen) and `focusedDate` (where the roving tabindex sits). Both are plain
 * signals written by user commands. The `value`, `activeDate` and `startView`
 * inputs feed into them, never the other way around, which is what keeps
 * paging, keyboard navigation and external writes from fighting each other.
 */
@Component({
  selector: 'av-calendar',
  templateUrl: './av-calendar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  encapsulation: ViewEncapsulation.ShadowDom,
  styleUrl: '../styles/av-styles.css',
  host: {
    '[class]': 'hostClasses()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AvCalendar {
  private readonly defaults = inject(AV_CALENDAR_DEFAULTS);
  /** Exposed so a host component can share one adapter with its own input. */
  readonly adapter = inject(AvDateAdapter);

  private readonly gridRef = viewChild<ElementRef<HTMLElement>>('grid');

  /** The selected day. Two-way bindable. */
  readonly value = model<Date | null>(null);

  /** The first month on screen. Two-way bindable. */
  readonly activeDate = model<Date | null>(null);

  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);

  /** Rejects days that should not be selectable. Runs for every rendered cell. */
  readonly dateFilter = input<AvDateFilter | null>(null);

  /** 0 for Sunday through 6 for Saturday. Defaults to the adapter's locale. */
  readonly firstDayOfWeek = input<number | null>(null);

  /** How many months to show side by side. */
  readonly numberOfMonths = input(1);

  readonly showWeekNumbers = input(this.defaults.showWeekNumbers);
  readonly showFooter = input(this.defaults.showFooter);
  readonly showOutsideDays = input(true);

  /** Which zoom level the calendar opens on. */
  readonly startView = input<AvCalendarView>('days');

  readonly size = input<AvSize>(this.defaults.size);

  /** Theme class applied to the calendar root. */
  readonly theme = input<string | null>(null);

  readonly disabled = input(false);

  readonly todayLabel = input('Today');
  readonly clearLabel = input('Clear');

  /** Replaces the contents of every day cell. */
  readonly dayTemplate = input<TemplateRef<AvDayCellContext> | null>(null);

  /** Replaces the whole header row. */
  readonly headerTemplate = input<TemplateRef<unknown> | null>(null);

  readonly dateSelected = output<Date>();
  readonly cleared = output<void>();
  readonly closeRequested = output<void>();
  readonly viewChanged = output<AvCalendarView>();

  /** Current zoom level; resets whenever `startView` changes. */
  protected readonly view = linkedSignal<AvCalendarView>(() => this.startView());

  /** The first month on screen. */
  protected readonly anchorMonth = signal<Date>(startOfMonth(new Date()));

  /** Where the roving tabindex sits. */
  protected readonly focusedDate = signal<Date>(startOfDay(new Date()));

  /** Drives the slide direction of the page transition. */
  protected readonly pageDirection = signal<'next' | 'prev' | null>(null);

  /** Set when a command should pull DOM focus to the active cell afterwards. */
  private pendingFocus = false;

  constructor() {
    // The selected value dictates what is on screen and where focus sits.
    // Reads only `value`, so nothing it writes can re-trigger it.
    effect(() => {
      const value = this.value();
      if (!value) return;
      untracked(() => {
        this.focusedDate.set(value);
        if (!isSameMonth(this.anchorMonth(), value)) this.anchorMonth.set(startOfMonth(value));
      });
    });

    // An externally supplied month wins over the internal anchor.
    effect(() => {
      const active = this.activeDate();
      if (!active) return;
      untracked(() => {
        if (!isSameMonth(this.anchorMonth(), active)) {
          this.anchorMonth.set(startOfMonth(active));
          if (!isSameMonth(this.focusedDate(), active)) {
            this.focusedDate.set(this.defaultFocusFor(startOfMonth(active)));
          }
        }
      });
    });

    // Reading these ties the effect to anything that moves the active cell.
    effect(() => {
      this.focusedDate();
      this.view();
      this.anchorMonth();
      if (!untracked(() => this.pendingFocus)) return;
      this.pendingFocus = false;
      queueMicrotask(() => this.focusActiveCell());
    });
  }

  protected readonly names = computed(() => this.adapter.names());

  protected readonly weekStart = computed(
    () => this.firstDayOfWeek() ?? this.adapter.firstDayOfWeek(),
  );

  protected readonly monthCount = computed(() => Math.max(1, Math.trunc(this.numberOfMonths())));

  /**
   * Classes on the host element.
   *
   * The theme class has to live here rather than inside the shadow root,
   * because `:host(.av-theme-rose)` is how the stylesheet selects a theme and
   * custom properties are the only thing that crosses the boundary.
   */
  protected readonly hostClasses = computed(() =>
    ['av-calendar', this.theme() ?? this.defaults.theme].join(' '),
  );

  /** Minimum width of a day cell, so tracks never collapse under the content. */
  protected readonly cellTrack = computed(() => {
    switch (this.size()) {
      case 'sm':
        return '2rem';
      case 'lg':
        return '2.75rem';
      default:
        return '2.375rem';
    }
  });

  /** Grid template for a week row, honouring the optional week-number column. */
  protected readonly gridTemplate = computed(() => {
    const track = `minmax(${this.cellTrack()}, 1fr)`;
    const days = `repeat(7, ${track})`;
    return this.showWeekNumbers() ? `minmax(1.75rem, auto) ${days}` : days;
  });

  /** Weekday column headers, rotated to the configured first day of week. */
  protected readonly weekdayHeaders = computed(() => {
    const start = this.weekStart();
    const names = this.names();
    return Array.from({ length: 7 }, (_, i) => {
      const index = (start + i) % 7;
      return {
        narrow: names.weekdaysNarrow[index]!,
        short: names.weekdaysShort[index]!,
        long: names.weekdaysLong[index]!,
        weekend: index === 0 || index === 6,
      };
    });
  });

  protected readonly months = computed<AvMonthModel[]>(() => {
    const base = this.anchorMonth();
    return Array.from({ length: this.monthCount() }, (_, i) => this.buildMonth(addMonths(base, i)));
  });

  /** Month names for the month-picker view. */
  protected readonly monthChoices = computed<AvChoiceCell[]>(() => {
    const names = this.names().monthsShort;
    const year = this.anchorMonth().getFullYear();
    const selected = this.value();
    const today = this.adapter.today();
    const focused = this.focusedDate();

    return names.map((label, index) => ({
      label,
      value: index,
      disabled: this.isMonthDisabled(year, index),
      selected: !!selected && selected.getFullYear() === year && selected.getMonth() === index,
      current: today.getFullYear() === year && today.getMonth() === index,
      focused: focused.getFullYear() === year && focused.getMonth() === index,
    }));
  });

  protected readonly yearRange = computed(() =>
    yearPage(this.anchorMonth().getFullYear(), YEARS_PER_PAGE),
  );

  protected readonly yearChoices = computed<AvChoiceCell[]>(() => {
    const [start] = this.yearRange();
    const selected = this.value();
    const today = this.adapter.today();
    const focused = this.focusedDate();

    return Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
      const year = start + i;
      return {
        label: String(year),
        value: year,
        disabled: this.isYearDisabled(year),
        selected: !!selected && selected.getFullYear() === year,
        current: today.getFullYear() === year,
        focused: focused.getFullYear() === year,
      };
    });
  });

  /** The label in the middle of the header, which also switches zoom level. */
  protected readonly headerLabel = computed(() => {
    const month = this.anchorMonth();
    const names = this.names();
    switch (this.view()) {
      case 'years': {
        const [from, to] = this.yearRange();
        return `${from} – ${to}`;
      }
      case 'months':
        return String(month.getFullYear());
      default: {
        const count = this.monthCount();
        if (count === 1) return `${names.monthsLong[month.getMonth()]} ${month.getFullYear()}`;
        const last = addMonths(month, count - 1);
        return `${names.monthsShort[month.getMonth()]} ${month.getFullYear()} – ${names.monthsShort[last.getMonth()]} ${last.getFullYear()}`;
      }
    }
  });

  protected readonly canGoPrev = computed(() => {
    if (this.disabled()) return false;
    const min = this.min();
    if (!min) return true;
    if (this.view() === 'years') return this.yearRange()[0] > min.getFullYear();
    if (this.view() === 'months') return this.anchorMonth().getFullYear() > min.getFullYear();
    return compareDays(addDays(startOfMonth(this.anchorMonth()), -1), min) >= 0;
  });

  protected readonly canGoNext = computed(() => {
    if (this.disabled()) return false;
    const max = this.max();
    if (!max) return true;
    if (this.view() === 'years') return this.yearRange()[1] < max.getFullYear();
    if (this.view() === 'months') return this.anchorMonth().getFullYear() < max.getFullYear();
    const lastVisible = addMonths(this.anchorMonth(), this.monthCount() - 1);
    return compareDays(addDays(endOfMonth(lastVisible), 1), max) <= 0;
  });

  /** Screen-reader announcement describing the current focus. */
  protected readonly liveMessage = computed(() =>
    this.view() === 'days' ? this.adapter.describe(this.focusedDate()) : this.headerLabel(),
  );

  protected readonly prevLabel = computed(() => {
    const view = this.view();
    return view === 'days' ? 'Previous month' : view === 'months' ? 'Previous year' : 'Earlier years';
  });

  protected readonly nextLabel = computed(() => {
    const view = this.view();
    return view === 'days' ? 'Next month' : view === 'months' ? 'Next year' : 'Later years';
  });


  protected readonly cellText = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'text-[0.78rem]';
      case 'lg':
        return 'text-[0.95rem]';
      default:
        return 'text-[0.85rem]';
    }
  });

  protected readonly cellSize = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'h-8 w-8';
      case 'lg':
        return 'h-11 w-11';
      default:
        return 'h-9.5 w-9.5';
    }
  });

  /**
   * Classes for one day cell, as a single space-separated string.
   *
   * This has to be a string rather than an array: Angular's array form of
   * `[class]` treats each entry as one class name and silently drops any entry
   * containing a space, which quietly loses every multi-class utility group.
   */
  protected dayClasses(cell: AvDayCell): string {
    const parts = ['av-cell', 'av-focus-ring', 'relative', 'grid', 'place-items-center', 'font-medium', 'tabular-nums'];
    parts.push(this.cellSize(), this.cellText());

    if (cell.selected) {
      parts.push('bg-[var(--av-accent)]', 'text-[var(--av-accent-fg)]', 'font-semibold', 'shadow-sm');
    } else if (cell.disabled) {
      parts.push('text-[var(--av-disabled-fg)]', 'line-through', 'decoration-[1.5px]');
    } else if (cell.outside) {
      parts.push('text-[var(--av-fg-subtle)]', 'hover:bg-[var(--av-surface-hover)]', 'hover:text-[var(--av-fg-muted)]');
    } else {
      parts.push('text-[var(--av-fg)]', 'hover:bg-[var(--av-accent-soft)]');
    }

    if (cell.today) {
      parts.push('av-cell-today');
      if (!cell.selected) parts.push('text-[var(--av-today)]', 'font-semibold');
    }

    return parts.join(' ');
  }

  /** Classes for a month or year choice cell. */
  protected choiceClasses(choice: AvChoiceCell, height: string): string {
    const parts = ['av-cell', 'av-focus-ring', height, 'font-medium'];

    if (choice.selected) {
      parts.push('bg-[var(--av-accent)]', 'text-[var(--av-accent-fg)]', 'font-semibold');
    } else if (choice.disabled) {
      parts.push('text-[var(--av-disabled-fg)]');
    } else if (choice.current) {
      parts.push('text-[var(--av-today)]', 'font-semibold', 'hover:bg-[var(--av-accent-soft)]');
    } else {
      parts.push('text-[var(--av-fg)]', 'hover:bg-[var(--av-accent-soft)]');
    }

    return parts.join(' ');
  }

  // ---------------------------------------------------------------- //
  // Grid construction
  // ---------------------------------------------------------------- //

  private buildMonth(month: Date): AvMonthModel {
    const names = this.names();
    const cells = calendarGrid(month, this.weekStart());
    const selected = this.value();
    const today = this.adapter.today();
    const focused = this.focusedDate();
    const weeks: AvWeekRow[] = [];

    for (let w = 0; w < 6; w++) {
      const days: AvDayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = cells[w * 7 + d]!;
        const weekday = date.getDay();
        days.push({
          date,
          time: date.getTime(),
          day: date.getDate(),
          label: this.adapter.describe(date),
          outside: !isSameMonth(date, month),
          today: isSameDay(date, today),
          selected: isSameDay(date, selected),
          disabled: this.isDayDisabled(date),
          focused: isSameDay(date, focused),
          weekend: weekday === 0 || weekday === 6,
        });
      }
      weeks.push({ weekNumber: isoWeekNumber(days[0]!.date), days });
    }

    return {
      date: month,
      label: `${names.monthsLong[month.getMonth()]} ${month.getFullYear()}`,
      weeks,
    };
  }

  /** True when a day cannot be chosen, for any reason. */
  isDayDisabled(date: Date): boolean {
    if (this.disabled()) return true;
    const min = this.min();
    const max = this.max();
    if (min && compareDays(date, min) < 0) return true;
    if (max && compareDays(date, max) > 0) return true;
    const filter = this.dateFilter();
    return filter ? !filter(date) : false;
  }

  private isMonthDisabled(year: number, month: number): boolean {
    if (this.disabled()) return true;
    const min = this.min();
    const max = this.max();
    if (min && compareDays(makeDate(year, month, daysInMonth(year, month)), min) < 0) return true;
    if (max && compareDays(makeDate(year, month, 1), max) > 0) return true;
    return false;
  }

  private isYearDisabled(year: number): boolean {
    if (this.disabled()) return true;
    const min = this.min();
    const max = this.max();
    if (min && year < min.getFullYear()) return true;
    if (max && year > max.getFullYear()) return true;
    return false;
  }

  /** The day a freshly shown month should focus when nothing is selected. */
  private defaultFocusFor(month: Date): Date {
    const today = this.adapter.today();
    const candidate = isSameMonth(today, month) ? today : month;
    return clampDate(candidate, this.min(), this.max());
  }

  // ---------------------------------------------------------------- //
  // Commands
  // ---------------------------------------------------------------- //

  protected selectDay(cell: AvDayCell): void {
    if (cell.disabled) return;
    this.focusedDate.set(cell.date);
    this.setAnchor(startOfMonth(cell.date), 'next');
    this.value.set(cell.date);
    this.dateSelected.emit(cell.date);
  }

  protected selectMonth(choice: AvChoiceCell): void {
    if (choice.disabled) return;
    const year = this.anchorMonth().getFullYear();
    const target = makeDate(year, choice.value, 1);
    this.setAnchor(target, 'next');
    this.focusedDate.set(this.defaultFocusFor(target));
    this.setView('days');
    this.pendingFocus = true;
  }

  protected selectYear(choice: AvChoiceCell): void {
    if (choice.disabled) return;
    const target = makeDate(choice.value, this.anchorMonth().getMonth(), 1);
    this.setAnchor(target, 'next');
    this.focusedDate.set(this.defaultFocusFor(target));
    this.setView('months');
    this.pendingFocus = true;
  }

  protected cycleView(): void {
    const view = this.view();
    this.setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days');
    this.pendingFocus = true;
  }

  protected page(step: number): void {
    const direction = step > 0 ? 'next' : 'prev';
    const month = this.anchorMonth();
    const target =
      this.view() === 'years'
        ? addYears(month, step * YEARS_PER_PAGE)
        : this.view() === 'months'
          ? addYears(month, step)
          : addMonths(month, step * this.monthCount());

    this.setAnchor(target, direction);
    if (this.view() === 'days') {
      this.focusedDate.set(this.defaultFocusFor(startOfMonth(target)));
    }
  }

  protected goToToday(): void {
    const today = clampDate(this.adapter.today(), this.min(), this.max());
    const direction = compareDays(today, this.anchorMonth()) < 0 ? 'prev' : 'next';
    this.setAnchor(startOfMonth(today), direction);
    this.focusedDate.set(today);
    this.setView('days');
    if (!this.isDayDisabled(today)) {
      this.value.set(today);
      this.dateSelected.emit(today);
    }
    this.pendingFocus = true;
  }

  protected clear(): void {
    this.value.set(null);
    this.cleared.emit();
  }

  private setAnchor(date: Date, direction: 'next' | 'prev'): void {
    const next = startOfMonth(date);
    if (isSameMonth(this.anchorMonth(), next)) return;
    this.pageDirection.set(direction);
    this.anchorMonth.set(next);
    this.activeDate.set(next);
  }

  private setView(view: AvCalendarView): void {
    if (this.view() === view) return;
    this.view.set(view);
    this.viewChanged.emit(view);
  }

  // ---------------------------------------------------------------- //
  // Keyboard
  // ---------------------------------------------------------------- //

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key === 'Escape') {
      this.closeRequested.emit();
      return;
    }
    if (this.view() === 'days') this.onDayKeydown(event);
    else this.onChoiceKeydown(event);
  }

  private onDayKeydown(event: KeyboardEvent): void {
    const focused = this.focusedDate();
    let next: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(focused, -1);
        break;
      case 'ArrowRight':
        next = addDays(focused, 1);
        break;
      case 'ArrowUp':
        next = addDays(focused, -7);
        break;
      case 'ArrowDown':
        next = addDays(focused, 7);
        break;
      case 'Home':
        next = addDays(focused, -((focused.getDay() - this.weekStart() + 7) % 7));
        break;
      case 'End':
        next = addDays(focused, 6 - ((focused.getDay() - this.weekStart() + 7) % 7));
        break;
      case 'PageUp':
        next = event.shiftKey ? addYears(focused, -1) : addMonths(focused, -1);
        break;
      case 'PageDown':
        next = event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const cell = this.cellFor(focused);
        if (cell) this.selectDay(cell);
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    this.moveFocusTo(next);
  }

  private onChoiceKeydown(event: KeyboardEvent): void {
    const isMonths = this.view() === 'months';
    const perRow = isMonths ? 3 : 4;
    const focused = this.focusedDate();
    const step = (n: number) => (isMonths ? addMonths(focused, n) : addYears(focused, n));
    let next: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        next = step(-1);
        break;
      case 'ArrowRight':
        next = step(1);
        break;
      case 'ArrowUp':
        next = step(-perRow);
        break;
      case 'ArrowDown':
        next = step(perRow);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isMonths) {
          this.selectMonth(this.choiceForMonth(focused));
        } else {
          this.selectYear(this.choiceForYear(focused));
        }
        return;
      default:
        return;
    }

    event.preventDefault();
    this.focusedDate.set(next);
    const anchor = this.anchorMonth();
    if (isMonths) {
      if (next.getFullYear() !== anchor.getFullYear()) {
        this.setAnchor(next, next < anchor ? 'prev' : 'next');
      }
    } else {
      const [from, to] = this.yearRange();
      const year = next.getFullYear();
      if (year < from || year > to) this.setAnchor(next, year < from ? 'prev' : 'next');
    }
    this.pendingFocus = true;
  }

  private choiceForMonth(date: Date): AvChoiceCell {
    return {
      label: '',
      value: date.getMonth(),
      disabled: this.isMonthDisabled(date.getFullYear(), date.getMonth()),
      selected: false,
      current: false,
      focused: true,
    };
  }

  private choiceForYear(date: Date): AvChoiceCell {
    return {
      label: '',
      value: date.getFullYear(),
      disabled: this.isYearDisabled(date.getFullYear()),
      selected: false,
      current: false,
      focused: true,
    };
  }

  /** Moves roving focus, paging the view when the target falls off screen. */
  private moveFocusTo(date: Date): void {
    const target = clampDate(date, this.min(), this.max());
    const anchor = this.anchorMonth();
    this.focusedDate.set(target);

    const lastVisible = addMonths(anchor, this.monthCount() - 1);
    const offScreen =
      compareDays(target, startOfMonth(anchor)) < 0 || compareDays(target, endOfMonth(lastVisible)) > 0;

    if (offScreen) {
      this.setAnchor(startOfMonth(target), compareDays(target, anchor) < 0 ? 'prev' : 'next');
    }
    this.pendingFocus = true;
  }

  private cellFor(date: Date): AvDayCell | null {
    for (const month of this.months()) {
      for (const week of month.weeks) {
        const found = week.days.find((d) => isSameDay(d.date, date) && !d.outside);
        if (found) return found;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- //
  // Public surface
  // ---------------------------------------------------------------- //

  /** Puts DOM focus on whichever cell the roving tabindex currently marks. */
  focusActiveCell(): void {
    const root = this.gridRef()?.nativeElement;
    root?.querySelector<HTMLElement>('[data-av-active="true"]')?.focus({ preventScroll: true });
  }

  /** Shows a given month without changing the selection. */
  showMonth(date: Date): void {
    this.setAnchor(startOfMonth(date), compareDays(date, this.anchorMonth()) < 0 ? 'prev' : 'next');
    this.focusedDate.set(this.value() ?? this.defaultFocusFor(startOfMonth(date)));
  }

  /** Requests DOM focus. Used when a popover opens. */
  focus(): void {
    this.pendingFocus = false;
    queueMicrotask(() => this.focusActiveCell());
  }

  protected dayContext(cell: AvDayCell): AvDayCellContext {
    return {
      $implicit: cell.date,
      date: cell.date,
      day: cell.day,
      selected: cell.selected,
      today: cell.today,
      disabled: cell.disabled,
      outside: cell.outside,
      focused: cell.focused,
    };
  }
}
