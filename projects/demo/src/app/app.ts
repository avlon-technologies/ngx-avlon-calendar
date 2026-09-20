import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { AvDatePicker } from '@avlon/ngx-avlon-calendar';
import { CalendarDemo } from './sections/calendar-demo';
import { FormsDemo } from './sections/forms-demo';
import { MaskingDemo } from './sections/masking-demo';
import { Playground } from './sections/playground';
import { Themes } from './sections/themes';

interface SectionLink {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvDatePicker, Playground, Themes, FormsDemo, CalendarDemo, MaskingDemo],
  styleUrl: './app.css',
  templateUrl: './app.html',
  host: {
    class: 'block min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100',
  },
})
export class App {
  readonly dark = signal(false);
  readonly heroDate = signal<Date | null>(null);

  readonly sections: SectionLink[] = [
    {
      id: 'playground',
      title: 'Presentation',
      blurb:
        'One component, every presentation option. Icon side, field chrome, density, label behaviour and what opens the panel are all inputs.',
    },
    {
      id: 'themes',
      title: 'Themes',
      blurb:
        'A theme is a class that redefines custom properties. Six ship with the library, and the seventh here is written in this demo.',
    },
    {
      id: 'forms',
      title: 'Forms',
      blurb:
        'Reactive, template-driven, and no form at all. The same component covers all three, and validation reaches the control either way.',
    },
    {
      id: 'masking',
      title: 'Masking and values',
      blurb:
        'The format drives the mask, the parser and the placeholder. The value shape handed to your form is yours to choose.',
    },
    {
      id: 'calendar',
      title: 'Calendar',
      blurb:
        'Availability rules, custom day cells, two months at once, and the calendar on its own without a text field.',
    },
  ];

  readonly heroCode = `<av-date-picker
  formControlName="checkIn"
  label="Check in"
  valueMode="iso-date"
  theme="av-theme-rose"
  iconPosition="left"
  [min]="today"
  [required]="true"
/>`;

  readonly heroLabel = computed(() =>
    this.heroDate() ? this.heroDate()!.toDateString() : 'Nothing selected yet',
  );

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.dark());
    });
  }

  toggleDark(): void {
    this.dark.update((value) => !value);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
