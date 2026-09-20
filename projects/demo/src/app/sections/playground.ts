import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  type WritableSignal,
} from '@angular/core';
import {
  AvDatePicker,
  type AvFieldVariant,
  type AvFloatLabel,
  type AvIconPosition,
  type AvOpenTrigger,
  type AvSize,
} from '@avlon/ngx-avlon-calendar';

type Token = string | number;

interface Choice<T extends Token> {
  readonly label: string;
  readonly value: T;
}

/** A row of mutually exclusive options bound to one signal. */
interface ControlGroup {
  readonly key: string;
  readonly selected: () => Token;
  readonly select: (value: Token) => void;
  readonly choices: readonly Choice<Token>[];
}

/**
 * Erases the option type so groups of different value types can share one
 * template, while each call site stays checked against its own signal.
 */
function group<T extends Token>(
  key: string,
  source: WritableSignal<T>,
  choices: readonly Choice<T>[],
): ControlGroup {
  return {
    key,
    selected: () => source(),
    select: (value) => source.set(value as T),
    choices: choices as readonly Choice<Token>[],
  };
}

/**
 * Every presentation option, wired to one live picker.
 *
 * The point of the section is that nothing here is a separate component or a
 * CSS override: it is the same `av-date-picker` reading different inputs.
 */
@Component({
  selector: 'demo-playground',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvDatePicker],
  template: `
    <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <!-- Stage -->
      <div class="flex flex-col gap-4">
        <div
          class="flex min-h-[15rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-10 dark:border-slate-800 dark:bg-slate-900"
          [class.demo-glass-bed]="theme() === 'av-theme-glass'"
        >
          <div class="w-full max-w-sm">
            <av-date-picker
              [(value)]="picked"
              [label]="showLabel() ? 'Departure date' : null"
              [hint]="showHint() ? 'Round trips start the day after.' : null"
              [theme]="theme()"
              [variant]="variant()"
              [size]="size()"
              [iconPosition]="iconPosition()"
              [floatLabel]="floatLabel()"
              [openOn]="openOn()"
              [clearable]="clearable()"
              [required]="required()"
              [displayFormat]="format()"
              [showMaskPlaceholder]="showMaskPlaceholder()"
              [numberOfMonths]="numberOfMonths()"
              [showWeekNumbers]="showWeekNumbers()"
              [showFooter]="showFooter()"
              [inline]="inline()"
            />
          </div>
        </div>

        <div class="rounded-xl bg-slate-900 p-5">
          <div class="mb-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
            Markup
          </div>
          <pre
            class="overflow-x-auto whitespace-pre font-mono text-[0.72rem] leading-[1.7] text-slate-300"
            >{{ markup() }}</pre>
        </div>
      </div>

      <!-- Controls -->
      <div
        class="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div>
          <div class="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
            Selected
          </div>
          <div class="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
            {{ picked() ? picked()!.toDateString() : 'null' }}
          </div>
        </div>

        @for (group of groups; track group.key) {
          <div>
            <div
              class="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500"
            >
              {{ group.key }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              @for (choice of group.choices; track choice.label) {
                <button
                  type="button"
                  class="rounded-lg border px-2.5 py-1 text-[0.75rem] font-medium transition-colors"
                  [class]="
                    group.selected() === choice.value
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  "
                  (click)="group.select(choice.value)"
                >
                  {{ choice.label }}
                </button>
              }
            </div>
          </div>
        }

        <div>
          <div class="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
            Toggles
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-2">
            @for (toggle of toggles; track toggle.label) {
              <label
                class="flex cursor-pointer items-center gap-2 text-[0.78rem] text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  class="h-3.5 w-3.5 accent-indigo-500"
                  [checked]="toggle.state()"
                  (change)="toggle.state.set($any($event.target).checked)"
                />
                {{ toggle.label }}
              </label>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Playground {
  readonly picked = signal<Date | null>(null);

  readonly theme = signal('av-theme-default');
  readonly variant = signal<AvFieldVariant>('outlined');
  readonly size = signal<AvSize>('md');
  readonly iconPosition = signal<AvIconPosition>('right');
  readonly floatLabel = signal<AvFloatLabel>('auto');
  readonly openOn = signal<AvOpenTrigger>('icon');
  readonly format = signal('MM/dd/yyyy');
  readonly numberOfMonths = signal(1);

  readonly showLabel = signal(true);
  readonly showHint = signal(false);
  readonly clearable = signal(true);
  readonly required = signal(false);
  readonly showMaskPlaceholder = signal(false);
  readonly showWeekNumbers = signal(false);
  readonly showFooter = signal(true);
  readonly inline = signal(false);

  readonly groups: readonly ControlGroup[] = [
    group('Theme', this.theme, [
      { label: 'Default', value: 'av-theme-default' },
      { label: 'Midnight', value: 'av-theme-midnight' },
      { label: 'Rose', value: 'av-theme-rose' },
      { label: 'Forest', value: 'av-theme-forest' },
      { label: 'Mono', value: 'av-theme-mono' },
      { label: 'Glass', value: 'av-theme-glass' },
    ]),
    group('Variant', this.variant, [
      { label: 'Outlined', value: 'outlined' },
      { label: 'Filled', value: 'filled' },
      { label: 'Underlined', value: 'underlined' },
      { label: 'Ghost', value: 'ghost' },
    ]),
    group('Size', this.size, [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ]),
    group('Icon position', this.iconPosition, [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
      { label: 'None', value: 'none' },
    ]),
    group('Label', this.floatLabel, [
      { label: 'Float on use', value: 'auto' },
      { label: 'Always float', value: 'always' },
      { label: 'Above field', value: 'never' },
    ]),
    group('Opens on', this.openOn, [
      { label: 'Icon', value: 'icon' },
      { label: 'Click', value: 'input' },
      { label: 'Focus', value: 'focus' },
      { label: 'Never', value: 'manual' },
    ]),
    group('Format', this.format, [
      { label: 'MM/dd/yyyy', value: 'MM/dd/yyyy' },
      { label: 'dd.MM.yyyy', value: 'dd.MM.yyyy' },
      { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
      { label: 'dd/MM/yy', value: 'dd/MM/yy' },
      { label: 'MMM d, yyyy', value: 'MMM d, yyyy' },
    ]),
    group('Months shown', this.numberOfMonths, [
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 },
    ]),
  ];

  readonly toggles = [
    { label: 'Label', state: this.showLabel },
    { label: 'Hint', state: this.showHint },
    { label: 'Clear button', state: this.clearable },
    { label: 'Required', state: this.required },
    { label: 'Mask placeholder', state: this.showMaskPlaceholder },
    { label: 'Week numbers', state: this.showWeekNumbers },
    { label: 'Footer', state: this.showFooter },
    { label: 'Inline calendar', state: this.inline },
  ];

  /** Renders the markup that would reproduce the current stage. */
  readonly markup = computed(() => {
    const lines = ['<av-date-picker'];
    const add = (attr: string) => lines.push(`  ${attr}`);

    add('[(value)]="picked"');
    if (this.showLabel()) add('label="Departure date"');
    if (this.showHint()) add('hint="Round trips start the day after."');
    if (this.theme() !== 'av-theme-default') add(`theme="${this.theme()}"`);
    if (this.variant() !== 'outlined') add(`variant="${this.variant()}"`);
    if (this.size() !== 'md') add(`size="${this.size()}"`);
    if (this.iconPosition() !== 'right') add(`iconPosition="${this.iconPosition()}"`);
    if (this.floatLabel() !== 'auto') add(`floatLabel="${this.floatLabel()}"`);
    if (this.openOn() !== 'icon') add(`openOn="${this.openOn()}"`);
    if (this.format() !== 'MM/dd/yyyy') add(`displayFormat="${this.format()}"`);
    if (this.numberOfMonths() !== 1) add(`[numberOfMonths]="${this.numberOfMonths()}"`);
    if (this.clearable()) add('[clearable]="true"');
    if (this.required()) add('[required]="true"');
    if (this.showMaskPlaceholder()) add('[showMaskPlaceholder]="true"');
    if (this.showWeekNumbers()) add('[showWeekNumbers]="true"');
    if (!this.showFooter()) add('[showFooter]="false"');
    if (this.inline()) add('[inline]="true"');

    lines.push('/>');
    return lines.join('\n');
  });
}
