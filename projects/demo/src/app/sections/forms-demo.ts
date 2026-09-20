import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { AvDatePicker, addDays, avDateRange, today } from 'ngx-avlon-calendar';

/**
 * The three ways a date picker gets used in a real application, side by side:
 * a reactive form, a template-driven form, and no form at all.
 *
 * The same component serves all three. Nothing switches mode.
 */
@Component({
  selector: 'demo-forms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvDatePicker, ReactiveFormsModule, FormsModule, JsonPipe],
  template: `
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Reactive ------------------------------------------------- -->
      <section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <header class="mb-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Reactive forms</h3>
          <p class="mt-0.5 text-[0.75rem] text-slate-500">
            <code class="font-mono">formControlName</code>, with min, max, a cross-field rule, and a
            string value shape.
          </p>
        </header>

        <form [formGroup]="trip" class="space-y-4" (ngSubmit)="submit()">
          <av-date-picker
            formControlName="start"
            label="Check in"
            valueMode="iso-date"
            [required]="true"
            [min]="todayDate"
            hint="Today or later."
          />

          <av-date-picker
            formControlName="end"
            label="Check out"
            valueMode="iso-date"
            [required]="true"
            [min]="minEnd()"
            [errorMessages]="{ avDateMin: 'Check out has to follow check in.' }"
          />

          <av-date-picker
            formControlName="birthday"
            label="Date of birth"
            valueMode="iso-date"
            displayFormat="dd/MM/yyyy"
            [max]="todayDate"
            variant="filled"
            hint="Day first, so 05/09 is the fifth of September."
          />

          <button
            type="submit"
            class="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700"
            [disabled]="trip.invalid"
          >
            {{ trip.invalid ? 'Fix the form to continue' : 'Book' }}
          </button>
        </form>

        <div class="mt-4 rounded-lg bg-slate-900 p-3 font-mono text-[0.7rem] leading-relaxed text-slate-300">
          <div class="text-slate-500">value</div>
          <pre class="overflow-x-auto">{{ trip.value | json }}</pre>
          <div class="mt-2 text-slate-500">status</div>
          <div [class]="trip.valid ? 'text-emerald-400' : 'text-amber-400'">{{ trip.status }}</div>
          @if (submitted()) {
            <div class="mt-2 text-emerald-400">Submitted.</div>
          }
        </div>
      </section>

      <!-- Template driven ------------------------------------------ -->
      <section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <header class="mb-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Template-driven</h3>
          <p class="mt-0.5 text-[0.75rem] text-slate-500">
            <code class="font-mono">[(ngModel)]</code>. Same component, same validation, no extra
            wiring.
          </p>
        </header>

        <form #f="ngForm" class="space-y-4">
          <av-date-picker
            name="due"
            [(ngModel)]="due"
            label="Invoice due"
            [required]="true"
            [min]="todayDate"
            variant="underlined"
            iconPosition="left"
          />

          <av-date-picker
            name="reminder"
            [(ngModel)]="reminder"
            label="Send reminder"
            [max]="due"
            [dateFilter]="weekdaysOnly"
            hint="Weekdays only, on or before the due date."
            variant="underlined"
            iconPosition="left"
          />
        </form>

        <div class="mt-4 rounded-lg bg-slate-900 p-3 font-mono text-[0.7rem] leading-relaxed text-slate-300">
          <div class="text-slate-500">due</div>
          <div>{{ due ? due.toDateString() : 'null' }}</div>
          <div class="mt-2 text-slate-500">reminder</div>
          <div>{{ reminder ? reminder.toDateString() : 'null' }}</div>
          <div class="mt-2 text-slate-500">form status</div>
          <div [class]="f.valid ? 'text-emerald-400' : 'text-amber-400'">
            {{ f.valid ? 'VALID' : 'INVALID' }}
          </div>
        </div>
      </section>

      <!-- No form -------------------------------------------------- -->
      <section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <header class="mb-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">No form at all</h3>
          <p class="mt-0.5 text-[0.75rem] text-slate-500">
            <code class="font-mono">[(value)]</code> against a signal. Errors still render.
          </p>
        </header>

        <div class="space-y-4">
          <av-date-picker
            [(value)]="filterFrom"
            label="From"
            size="sm"
            [clearable]="true"
            [max]="filterTo()"
          />
          <av-date-picker
            [(value)]="filterTo"
            label="To"
            size="sm"
            [clearable]="true"
            [min]="filterFrom()"
          />

          <button
            type="button"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            (click)="thisMonth()"
          >
            Set to this month
          </button>
        </div>

        <div class="mt-4 rounded-lg bg-slate-900 p-3 font-mono text-[0.7rem] leading-relaxed text-slate-300">
          <div class="text-slate-500">range</div>
          <div>{{ rangeLabel() }}</div>
        </div>
      </section>
    </div>
  `,
})
export class FormsDemo {
  private readonly fb = new FormBuilder();

  readonly todayDate = today();

  readonly trip: FormGroup = this.fb.group(
    {
      start: [null as string | null, Validators.required],
      end: [null as string | null, Validators.required],
      birthday: [null as string | null],
    },
    { validators: avDateRange('start', 'end', 'yyyy-MM-dd') },
  );

  readonly submitted = signal(false);

  /** Mirrors the start control so the end picker can raise its own floor. */
  private readonly startValue = signal<string | null>(null);

  readonly minEnd = computed(() => {
    const raw = this.startValue();
    if (!raw) return this.todayDate;
    const [y, m, d] = raw.split('-').map(Number);
    return addDays(new Date(y!, m! - 1, d!), 1);
  });

  // Template-driven state.
  due: Date | null = null;
  reminder: Date | null = null;

  // Formless state.
  readonly filterFrom = signal<Date | null>(null);
  readonly filterTo = signal<Date | null>(null);

  readonly rangeLabel = computed(() => {
    const from = this.filterFrom();
    const to = this.filterTo();
    if (!from && !to) return 'nothing selected';
    return `${from ? from.toDateString() : '...'} to ${to ? to.toDateString() : '...'}`;
  });

  readonly weekdaysOnly = (date: Date) => date.getDay() !== 0 && date.getDay() !== 6;

  constructor() {
    this.trip.controls['start']!.valueChanges.subscribe((value) => {
      this.startValue.set(value as string | null);
    });
  }

  submit(): void {
    this.submitted.set(this.trip.valid);
  }

  thisMonth(): void {
    const now = today();
    this.filterFrom.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.filterTo.set(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }
}
