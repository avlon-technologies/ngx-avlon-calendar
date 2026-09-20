import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AvCalendar, AvDatePicker, addDays, isSameDay, today } from 'ngx-avlon-calendar';

/**
 * What the calendar surface can be asked to do beyond "pick a day":
 * availability rules, custom cell content, multiple months, and the standalone
 * inline calendar with no text field attached.
 */
@Component({
  selector: 'demo-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvCalendar, AvDatePicker],
  template: `
    <div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <!-- Inline -------------------------------------------------- -->
      <article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Inline calendar</h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] text-slate-500">
          <code class="font-mono">av-calendar</code> on its own. No input, no popover.
        </p>
        <div class="av-panel av-theme av-theme-default inline-block border border-[var(--av-border)]">
          <av-calendar [(value)]="inlineDate" [showWeekNumbers]="true" />
        </div>
        <p class="mt-3 font-mono text-[0.72rem] text-slate-500">
          {{ inlineDate() ? inlineDate()!.toDateString() : 'nothing selected' }}
        </p>
      </article>

      <!-- Availability -------------------------------------------- -->
      <article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Availability rules</h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] text-slate-500">
          Weekends and three booked days are struck through and unselectable, in the grid and in the
          validator.
        </p>
        <div class="av-panel av-theme av-theme-forest inline-block border border-[var(--av-border)]">
          <av-calendar
            [(value)]="bookingDate"
            theme="av-theme-forest"
            [min]="todayDate"
            [max]="maxBooking"
            [dateFilter]="isBookable"
            [showFooter]="false"
          />
        </div>
        <div class="mt-4">
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
      </article>

      <!-- Two months ---------------------------------------------- -->
      <article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800 xl:col-span-1 lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Two months at once</h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] text-slate-500">
          <code class="font-mono">[numberOfMonths]="2"</code>. Paging and keyboard navigation cover
          both.
        </p>
        <div class="av-panel av-theme av-theme-midnight inline-block border border-[var(--av-border)]">
          <av-calendar
            [(value)]="rangeDate"
            theme="av-theme-midnight"
            [numberOfMonths]="2"
            size="sm"
            [showFooter]="false"
          />
        </div>
      </article>

      <!-- Custom cells -------------------------------------------- -->
      <article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800 lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Custom day cells</h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] text-slate-500">
          A <code class="font-mono">dayTemplate</code> replaces the contents of every cell. Here it
          prints a nightly rate and marks the cheapest days.
        </p>

        <div class="flex flex-wrap items-start gap-6">
          <div class="av-panel av-theme av-theme-rose inline-block border border-[var(--av-border)]">
            <av-calendar
              [(value)]="stayDate"
              theme="av-theme-rose"
              size="lg"
              [showFooter]="false"
              [dayTemplate]="priceCell"
            />
          </div>

          <ng-template #priceCell let-date let-day="day" let-outside="outside" let-selected="selected">
            <span class="flex flex-col items-center leading-none">
              <span class="text-[0.85rem] font-medium">{{ day }}</span>
              @if (!outside) {
                <span
                  class="mt-0.5 text-[0.55rem] font-semibold tabular-nums"
                  [class]="selected ? 'opacity-90' : isCheap(date) ? 'text-emerald-600' : 'opacity-55'"
                >
                  {{ rateFor(date) }}
                </span>
              }
            </span>
          </ng-template>

          <div class="min-w-48 flex-1">
            <div class="rounded-lg bg-slate-900 p-3 font-mono text-[0.7rem] leading-relaxed text-slate-300">
              <div class="text-slate-500">selected</div>
              <div>{{ stayDate() ? stayDate()!.toDateString() : 'null' }}</div>
              <div class="mt-2 text-slate-500">rate</div>
              <div>{{ stayDate() ? rateFor(stayDate()!) : '-' }}</div>
            </div>
            <p class="mt-3 text-[0.75rem] leading-relaxed text-slate-500">
              The template receives the date plus the cell's state, so badges, dots, prices and
              availability chips all stay in the consumer's hands.
            </p>
          </div>
        </div>
      </article>

      <!-- Locale --------------------------------------------------- -->
      <article class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Week start and locale</h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] text-slate-500">
          Month and weekday names come from the date adapter, which reads the app locale by default.
        </p>
        <div class="flex flex-wrap gap-2">
          @for (option of weekStarts; track option.value) {
            <button
              type="button"
              class="rounded-lg border px-2.5 py-1 text-[0.75rem] font-medium transition-colors"
              [class]="
                weekStart() === option.value
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
              "
              (click)="weekStart.set(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <div class="av-panel av-theme av-theme-mono mt-4 inline-block border border-[var(--av-border)]">
          <av-calendar
            theme="av-theme-mono"
            [firstDayOfWeek]="weekStart()"
            [(value)]="localeDate"
            [showFooter]="false"
            size="sm"
          />
        </div>
      </article>
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

  /** Three arbitrary days taken out, to stand in for a real booking feed. */
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
}
