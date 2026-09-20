import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AvCalendar, AvDatePicker } from '@avlon/ngx-avlon-calendar';

interface ThemeCard {
  readonly name: string;
  readonly className: string;
  readonly blurb: string;
  /** Applied to the card so a translucent theme has something behind it. */
  readonly bed: string;
  readonly swatches: readonly string[];
}

/**
 * Every shipped theme, rendered live rather than as screenshots.
 *
 * A theme is one class that redefines custom properties. Nothing in the
 * library hard-codes a colour, a radius, or a duration, so a house theme is a
 * block of CSS rather than a fork.
 */
@Component({
  selector: 'demo-themes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvCalendar, AvDatePicker],
  template: `
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      @for (card of cards; track card.className) {
        <article
          class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
          [class]="card.bed"
        >
          <header class="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h3
                class="text-sm font-semibold"
                [class]="card.bed ? 'text-white' : 'text-slate-900 dark:text-slate-50'"
              >
                {{ card.name }}
              </h3>
              <p
                class="mt-1 text-[0.75rem] leading-relaxed"
                [class]="card.bed ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'"
              >
                {{ card.blurb }}
              </p>
            </div>
            <div class="flex shrink-0 gap-1 pt-1">
              @for (swatch of card.swatches; track swatch) {
                <span
                  class="h-4 w-4 rounded-full ring-1 ring-black/10"
                  [style.background]="swatch"
                ></span>
              }
            </div>
          </header>

          <div class="space-y-5 p-5">
            <av-calendar
              class="block w-full"
              [theme]="card.className"
              [value]="selected()"
              (valueChange)="selected.set($event)"
              [showFooter]="false"
              size="sm"
            />
            <div>
              <av-date-picker
                [theme]="card.className"
                [value]="selected()"
                (valueChange)="selected.set($event)"
                [clearable]="true"
                label="Date"
              />
            </div>
          </div>

          <footer class="px-5 pb-5">
            <code
              class="block rounded-lg bg-slate-900/90 px-2.5 py-1.5 font-mono text-[0.68rem] text-slate-300"
              >theme="{{ card.className }}"</code
            >
          </footer>
        </article>
      }

      <!-- A theme written here in the demo, not shipped by the library. -->
      <article class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <header class="px-5 pt-5">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">Your own</h3>
          <p class="mt-1 text-[0.75rem] leading-relaxed text-slate-500 dark:text-slate-400">
            Defined in this demo's stylesheet. No library change, no overrides.
          </p>
        </header>
        <div class="space-y-5 p-5">
          <av-calendar
            class="block w-full"
            theme="demo-theme-citrus"
            [value]="selected()"
            (valueChange)="selected.set($event)"
            [showFooter]="false"
            size="sm"
          />
          <div>
            <av-date-picker
              theme="demo-theme-citrus"
              [value]="selected()"
              (valueChange)="selected.set($event)"
              [clearable]="true"
              label="Date"
            />
          </div>
        </div>
        <footer class="px-5 pb-5">
          <pre
            class="overflow-x-auto rounded-lg bg-slate-900/90 px-2.5 py-2 font-mono text-[0.66rem] leading-relaxed text-slate-300"
            >{{ customThemeSource }}</pre>
        </footer>
      </article>
    </div>
  `,
})
export class Themes {
  readonly selected = signal<Date | null>(null);

  readonly cards: ThemeCard[] = [
    {
      name: 'Default',
      className: 'av-theme-default',
      blurb: 'Cool neutrals, indigo accent. Follows the page into dark mode.',
      bed: '',
      swatches: ['#4f46e5', '#eef2ff', '#0f172a'],
    },
    {
      name: 'Midnight',
      className: 'av-theme-midnight',
      blurb: 'Dark whatever the page does. Cyan accent.',
      bed: 'bg-slate-950',
      swatches: ['#38bdf8', '#0f2c42', '#0e1424'],
    },
    {
      name: 'Rose',
      className: 'av-theme-rose',
      blurb: 'Warm paper, round cells, editorial.',
      bed: '',
      swatches: ['#e11d62', '#fde7ef', '#44201d'],
    },
    {
      name: 'Forest',
      className: 'av-theme-forest',
      blurb: 'Low chroma greens, tight radii.',
      bed: '',
      swatches: ['#15803d', '#dcf0e2', '#13271a'],
    },
    {
      name: 'Mono',
      className: 'av-theme-mono',
      blurb: 'No chroma, hard corners, no motion.',
      bed: '',
      swatches: ['#111111', '#ebebeb', '#666666'],
    },
    {
      name: 'Glass',
      className: 'av-theme-glass',
      blurb: 'Translucent, blurred, sits over imagery.',
      bed: 'demo-glass-bed',
      swatches: ['#0ea5e9', 'rgba(255,255,255,.7)', '#0b1220'],
    },
  ];

  readonly customThemeSource = `.demo-theme-citrus {
  --av-accent: #ea580c;
  --av-accent-soft: #ffedd5;
  --av-radius-cell: 999px;
  --av-surface: #fffdf7;
  --av-border: #f0d9b5;
  --av-fg: #422006;
}`;
}
