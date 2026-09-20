import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AvCalendar, AvDatePicker, addDays, isSameDay, today } from '@avlon/ngx-avlon-calendar';
import { DemoExample } from './example';

/**
 * What the calendar surface can be asked to do beyond "pick a day":
 * availability rules, custom cell content, multiple months, and the standalone
 * inline calendar with no text field attached.
 *
 * Each example carries the markup that produced it under its source tab.
 */
@Component({
  selector: 'demo-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvCalendar, AvDatePicker, DemoExample],
  template: `
    <div class="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <!-- Inline -------------------------------------------------- -->
      <demo-example heading="Inline calendar" [code]="source.inline">
        <span blurb>
          <code class="font-mono">av-calendar</code> on its own. No input, no popover, and no
          stylesheet to import.
        </span>

        <div class="overflow-x-auto">
          <av-calendar [(value)]="inlineDate" [showWeekNumbers]="true" />
        </div>

        <p footer class="font-mono text-[0.72rem] text-slate-500 dark:text-slate-400">
          {{ inlineDate() ? inlineDate()!.toDateString() : 'nothing selected' }}
        </p>
      </demo-example>

      <!-- Availability -------------------------------------------- -->
      <demo-example heading="Availability rules" [code]="source.availability">
        <span blurb>
          Weekends and three booked days are struck through and unselectable, in the grid and in the
          validator.
        </span>

        <div class="space-y-5">
          <div class="overflow-x-auto">
            <av-calendar
              [(value)]="bookingDate"
              theme="av-theme-forest"
              [min]="todayDate"
              [max]="maxBooking"
              [dateFilter]="isBookable"
              [showFooter]="false"
            />
          </div>
          <av-date-picker
            [(value)]="bookingDate"
            theme="av-theme-forest"
            label="Appointment"
            [min]="todayDate"
            [max]="maxBooking"
            [dateFilter]="isBookable"
            [errorMessages]="{ avDateDisabled: 'We are fully booked that day.' }"
            hint="Weekdays within the next 90 days."
          />
        </div>
      </demo-example>

      <!-- Two months ---------------------------------------------- -->
      <demo-example
        heading="Two months at once"
        [code]="source.twoMonths"
        class="lg:col-span-2 xl:col-span-2"
      >
        <span blurb>
          <code class="font-mono">[numberOfMonths]="2"</code>. Paging and keyboard navigation cover
          both.
        </span>

        <div class="overflow-x-auto">
          <av-calendar
            [(value)]="rangeDate"
            theme="av-theme-midnight"
            [numberOfMonths]="2"
            size="sm"
            [showFooter]="false"
          />
        </div>
      </demo-example>

      <!-- Locale --------------------------------------------------- -->
      <demo-example heading="Week start and locale" [code]="source.locale">
        <span blurb>
          Month and weekday names come from the date adapter, which reads the application locale by
          default.
        </span>

        <div class="space-y-4">
          <div class="flex flex-wrap gap-2">
            @for (option of weekStarts; track option.value) {
              <button
                type="button"
                class="rounded-lg border px-2.5 py-1 text-[0.75rem] font-medium transition-colors"
                [class]="
                  weekStart() === option.value
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                "
                (click)="weekStart.set(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>

          <div class="overflow-x-auto">
            <av-calendar
              theme="av-theme-mono"
              [firstDayOfWeek]="weekStart()"
              [(value)]="localeDate"
              [showFooter]="false"
              size="sm"
            />
          </div>
        </div>
      </demo-example>

      <!-- Custom cells -------------------------------------------- -->
      <demo-example
        heading="Custom day cells"
        [code]="source.customCells"
        class="lg:col-span-2 xl:col-span-3"
      >
        <span blurb>
          A <code class="font-mono">dayTemplate</code> replaces the contents of every cell. Here it
          prints a nightly rate and marks the cheapest days.
        </span>

        <div class="flex flex-wrap items-start gap-8">
          <div class="overflow-x-auto">
            <av-calendar
              [(value)]="stayDate"
              theme="av-theme-rose"
              size="lg"
              [showFooter]="false"
              [dayTemplate]="priceCell"
              [extraStyles]="priceCellStyles"
            />
          </div>

          <ng-template
            #priceCell
            let-date
            let-day="day"
            let-outside="outside"
            let-selected="selected"
          >
            <!--
              These class names are defined in priceCellStyles below and handed
              to the calendar through [extraStyles]. This markup is rendered
              inside the component's shadow root, so the page's own stylesheet
              cannot reach it.
            -->
            <span class="cell">
              <span class="cell-day">{{ day }}</span>
              @if (!outside) {
                <span class="cell-rate" [class.cheap]="isCheap(date)" [class.on-accent]="selected">
                  {{ rateFor(date) }}
                </span>
              }
            </span>
          </ng-template>

          <div class="min-w-56 flex-1">
            <div
              class="rounded-lg bg-slate-900 p-4 font-mono text-[0.72rem] leading-relaxed text-slate-300"
            >
              <div class="text-slate-500">selected</div>
              <div>{{ stayDate() ? stayDate()!.toDateString() : 'null' }}</div>
              <div class="mt-3 text-slate-500">rate</div>
              <div>{{ stayDate() ? rateFor(stayDate()!) : '-' }}</div>
            </div>
            <p class="mt-4 text-[0.8rem] leading-relaxed text-slate-600 dark:text-slate-400">
              The template receives the date plus the cell's state, so badges, dots, prices and
              availability chips all stay in the consumer's hands.
            </p>
          </div>
        </div>
      </demo-example>
    </div>
  `,
})
export class CalendarDemo {
  readonly todayDate = today();
  readonly maxBooking = addDays(this.todayDate, 90);

  readonly inlineDate = signal<Date | null>(null);
  readonly bookingDate = signal<Date | null>(null);
  readonly rangeDate = signal<Date | null>(null);
  readonly stayDate = signal<Date | null>(null);
  readonly localeDate = signal<Date | null>(null);

  readonly weekStart = signal(0);
  readonly weekStarts = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Saturday', value: 6 },
  ];

  /** Three arbitrary days taken out, standing in for a real booking feed. */
  private readonly booked = computed(() => [
    addDays(this.todayDate, 3),
    addDays(this.todayDate, 4),
    addDays(this.todayDate, 11),
  ]);

  readonly isBookable = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    return !this.booked().some((b) => isSameDay(b, date));
  };

  /** A deterministic pseudo-rate, so the demo reads the same on every load. */
  rateFor(date: Date): string {
    const seed = date.getDate() * 7 + date.getMonth() * 13;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    return `$${120 + (seed % 9) * 15 + (weekend ? 60 : 0)}`;
  }

  isCheap(date: Date): boolean {
    const seed = date.getDate() * 7 + date.getMonth() * 13;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    return !weekend && seed % 9 <= 2;
  }

  /**
   * Styles for the custom day cell, adopted into the calendar's shadow root.
   *
   * The library is encapsulated, so markup passed in through `dayTemplate`
   * cannot see this application's stylesheet. `extraStyles` is the deliberate
   * way through: only what is handed over crosses the boundary.
   */
  readonly priceCellStyles = `
    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;
      padding-bottom: 0.2rem;
    }
    .cell-day {
      font-size: 0.85rem;
      font-weight: 500;
    }
    .cell-rate {
      margin-top: 0.15rem;
      font-size: 0.55rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      opacity: 0.55;
    }
    .cell-rate.cheap {
      color: #059669;
      opacity: 1;
    }
    .cell-rate.on-accent {
      color: inherit;
      opacity: 0.9;
    }
  `;

  /** The markup behind each example, shown under its source tab. */
  readonly source = {
    inline: `<av-calendar [(value)]="picked" [showWeekNumbers]="true" />`,

    availability: `<av-calendar
  [(value)]="appointment"
  theme="av-theme-forest"
  [min]="today"
  [max]="ninetyDaysOut"
  [dateFilter]="isBookable"
  [showFooter]="false"
/>

<av-date-picker
  [(value)]="appointment"
  theme="av-theme-forest"
  label="Appointment"
  [min]="today"
  [max]="ninetyDaysOut"
  [dateFilter]="isBookable"
  [errorMessages]="{ avDateDisabled: 'We are fully booked that day.' }"
  hint="Weekdays within the next 90 days."
/>

// The same predicate greys out the grid and fails the control.
isBookable = (date: Date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !this.booked().some((b) => isSameDay(b, date));
};`,

    twoMonths: `<av-calendar
  [(value)]="picked"
  theme="av-theme-midnight"
  [numberOfMonths]="2"
  size="sm"
  [showFooter]="false"
/>`,

    locale: `<av-calendar
  theme="av-theme-mono"
  [firstDayOfWeek]="weekStart()"
  [(value)]="picked"
  [showFooter]="false"
  size="sm"
/>

// Or set it once for the whole application, alongside the locale:
provideAvlonCalendar({ locale: 'en-GB', firstDayOfWeek: 1 })`,

    customCells: `<av-calendar
  [(value)]="stay"
  theme="av-theme-rose"
  size="lg"
  [showFooter]="false"
  [dayTemplate]="priceCell"
  [extraStyles]="priceCellStyles"
/>

<ng-template #priceCell let-date let-day="day" let-outside="outside">
  <span class="cell">
    <span class="cell-day">{{ day }}</span>
    @if (!outside) {
      <span class="cell-rate">{{ rateFor(date) }}</span>
    }
  </span>
</ng-template>

// The cell renders inside the shadow root, so the page's stylesheet cannot
// reach it. Hand over the classes it needs:
priceCellStyles = \`
  .cell { display: flex; flex-direction: column; align-items: center; }
  .cell-rate { font-size: 0.55rem; opacity: 0.55; }
\`;`,
  };
}
