import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvDateMask,
  AvDatePicker,
  maskSpecFor,
  parseDate,
  type AvValueMode,
} from '@avlon/ngx-avlon-calendar';

/**
 * Masking, parsing and the value shape handed to the form.
 *
 * The typing rules are worth showing rather than describing, so this section is
 * built around fields the reader is meant to type into.
 */
@Component({
  selector: 'demo-masking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvDatePicker, AvDateMask, FormsModule],
  template: `
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Formats -------------------------------------------------- -->
      <section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">
          The format drives the mask
        </h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] leading-relaxed text-slate-500">
          Separators appear as you complete each field. Type <code class="font-mono">5</code> into a
          month and it becomes <code class="font-mono">05</code> on its own, because nothing else
          starts with 5. Arrow keys step the field under the caret.
        </p>

        <div class="space-y-4">
          @for (format of formats; track format) {
            <div class="flex items-center gap-4">
              <code class="w-28 shrink-0 font-mono text-[0.72rem] text-slate-500">{{
                format
              }}</code>
              <div class="min-w-0 flex-1">
                <av-date-picker
                  [displayFormat]="format"
                  [(value)]="shared"
                  size="sm"
                  iconPosition="none"
                  floatLabel="never"
                  [clearable]="true"
                />
              </div>
              <span
                class="w-24 shrink-0 text-right text-[0.68rem] font-medium"
                [class]="isMaskable(format) ? 'text-emerald-600' : 'text-amber-600'"
              >
                {{ isMaskable(format) ? 'masked' : 'free text' }}
              </span>
            </div>
          }
        </div>

        <p class="mt-4 text-[0.72rem] leading-relaxed text-slate-500">
          A format is masked when every field is fixed-width and numeric. A month name or an
          unpadded number cannot be masked without guessing, so those fields fall back to free text
          that is parsed when you leave them. All six share one value.
        </p>
      </section>

      <!-- Parser --------------------------------------------------- -->
      <section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">
          What the parser accepts
        </h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] text-slate-500">
          Live, against <code class="font-mono">MM/dd/yyyy</code>.
        </p>

        <div class="space-y-1.5">
          @for (sample of samples(); track sample.text) {
            <div
              class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-900"
            >
              <code
                class="w-40 shrink-0 font-mono text-[0.72rem] text-slate-700 dark:text-slate-300"
                >{{ sample.text }}</code
              >
              <span
                class="text-[0.72rem]"
                [class]="sample.ok ? 'text-emerald-600' : 'text-rose-600'"
                >{{ sample.result }}</span
              >
            </div>
          }
        </div>

        <h4 class="mt-6 text-[0.8rem] font-semibold text-slate-900 dark:text-slate-50">
          Masking without the calendar
        </h4>
        <p class="mt-0.5 mb-3 text-[0.75rem] text-slate-500">
          The <code class="font-mono">avDateMask</code> directive on a plain input you lay out
          yourself.
        </p>
        <input
          avDateMask="dd/MM/yyyy"
          [(ngModel)]="rawText"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <div class="mt-2 font-mono text-[0.72rem] text-slate-500">
          ngModel: {{ rawText() === '' ? "''" : rawText() }}
        </div>
      </section>

      <!-- Value modes ---------------------------------------------- -->
      <section class="rounded-2xl border border-slate-200 p-5 dark:border-slate-800 lg:col-span-2">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">
          What the form control actually holds
        </h3>
        <p class="mt-0.5 mb-4 text-[0.75rem] leading-relaxed text-slate-500">
          Most APIs do not want a <code class="font-mono">Date</code>. Rather than make every form
          write a mapping layer on both sides, <code class="font-mono">valueMode</code> decides the
          shape up front.
        </p>

        <div class="flex flex-wrap gap-1.5">
          @for (mode of modes; track mode) {
            <button
              type="button"
              class="rounded-lg border px-2.5 py-1 font-mono text-[0.72rem] transition-colors"
              [class]="
                valueMode() === mode
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
              "
              (click)="valueMode.set(mode)"
            >
              {{ mode }}
            </button>
          }
        </div>

        <div class="mt-4 grid items-start gap-5 sm:grid-cols-[18rem_minmax(0,1fr)]">
          <av-date-picker
            [valueMode]="valueMode()"
            [value]="modeValue()"
            (valueChange)="onModeValue($event)"
            label="Pick a date"
            [clearable]="true"
          />
          <div
            class="rounded-lg bg-slate-900 p-4 font-mono text-[0.72rem] leading-relaxed text-slate-300"
          >
            <div class="text-slate-500">emitted to the control</div>
            <div class="mt-1 break-all text-emerald-400">{{ emitted() }}</div>
            <div class="mt-3 text-slate-500">typeof</div>
            <div class="mt-1">{{ emittedType() }}</div>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class MaskingDemo {
  readonly shared = signal<Date | null>(null);
  readonly rawText = signal('');
  readonly valueMode = signal<AvValueMode>('date');
  readonly modeValue = signal<Date | null>(null);

  readonly formats = [
    'MM/dd/yyyy',
    'dd.MM.yyyy',
    'yyyy-MM-dd',
    'dd/MM/yy',
    'MMM d, yyyy',
    'EEEE, MMMM d, yyyy',
  ];

  readonly modes: AvValueMode[] = ['date', 'iso-date', 'iso', 'timestamp', 'formatted'];

  private readonly sampleTexts = [
    '12/31/2026',
    '1/5/2026',
    '12312026',
    '12-31-2026',
    '2026-12-31',
    '02/30/2026',
    '13/01/2026',
    'next tuesday',
  ];

  readonly samples = computed(() =>
    this.sampleTexts.map((text) => {
      const result = parseDate(text, 'MM/dd/yyyy');
      if (result.status === 'ok') {
        return { text, ok: true, result: result.date.toDateString() };
      }
      if (result.status === 'empty') return { text, ok: false, result: 'empty' };
      return {
        text,
        ok: false,
        result: result.reason === 'nonexistent' ? 'no such day' : 'does not match the format',
      };
    }),
  );

  readonly emitted = signal('null');
  readonly emittedType = signal('object');

  isMaskable(format: string): boolean {
    return maskSpecFor(format).maskable;
  }

  onModeValue(date: Date | null): void {
    this.modeValue.set(date);
    // The picker emits the encoded shape to a form control; with `[(value)]`
    // it hands back a Date, so re-encode here just to display the difference.
    if (!date) {
      this.emitted.set('null');
      this.emittedType.set('object');
      return;
    }
    switch (this.valueMode()) {
      case 'iso-date':
        this.emitted.set(`'${date.toISOString().slice(0, 10)}'`);
        this.emittedType.set('string');
        break;
      case 'iso':
        this.emitted.set(`'${date.toISOString()}'`);
        this.emittedType.set('string');
        break;
      case 'timestamp':
        this.emitted.set(String(date.getTime()));
        this.emittedType.set('number');
        break;
      case 'formatted':
        this.emitted.set(`'${date.toLocaleDateString('en-US')}'`);
        this.emittedType.set('string');
        break;
      default:
        this.emitted.set(date.toString());
        this.emittedType.set('object (Date)');
    }
  }
}
