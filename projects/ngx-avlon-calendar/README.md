# ngx-avlon-calendar

An Angular date picker built with Tailwind CSS: format-driven input masking, real
validation with visible errors, reactive and template-driven forms, and a
calendar themed through custom properties rather than selector overrides.

```html
<av-date-picker formControlName="checkIn" label="Check in" [min]="today" [required]="true" />
```

- **Typing works properly.** Separators appear as fields complete, Backspace never
  stalls on a slash, arrow keys step the field under the caret, and pasting an
  ISO date from an API response just works.
- **Validation reaches the form.** `min`, `max`, `dateFilter` and unparseable text
  arrive as ordinary control errors, so your own validators compose with them.
- **Three binding styles, one component.** `formControlName`, `[(ngModel)]`, or
  `[(value)]` against a signal.
- **Themed by tokens.** A theme is a class that redefines custom properties. Six
  ship with the library; writing a seventh is a block of CSS in your own app.
- **Tailwind optional.** The package ships a prebuilt stylesheet, with no
  Preflight, for projects that do not run Tailwind.

## Install

```bash
npm install ngx-avlon-calendar @angular/cdk
```

Peer dependencies: Angular 22 (`common`, `core`, `forms`) and `@angular/cdk`,
which provides the popover positioning and focus management.

## Styles

Pick one of the two routes.

**You do not run Tailwind**, or would rather not scan the package:

```css
@import 'ngx-avlon-calendar/styles/ngx-avlon-calendar.css';
```

One file, about 41 kB, containing the utilities the library's own
templates use plus the theme tokens. It deliberately omits Preflight, so it will
not reset your page's base styles.

**You do run Tailwind** and want your build to emit the utilities:

```css
@import 'tailwindcss';
@import 'ngx-avlon-calendar/styles/theme.css';
@source '../node_modules/ngx-avlon-calendar';
```

Either way, apply a theme class somewhere above the picker, or let the default
apply itself.

## Usage

### Reactive forms

```ts
import { AvDatePicker } from 'ngx-avlon-calendar';

@Component({
  imports: [AvDatePicker, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <av-date-picker
        formControlName="start"
        label="Start date"
        valueMode="iso-date"
        [min]="today"
        [required]="true"
      />
    </form>
  `,
})
export class Booking {
  readonly today = new Date();
  readonly form = inject(FormBuilder).group({
    start: [null as string | null, Validators.required],
  });
}
```

### Template-driven forms

```html
<av-date-picker name="due" [(ngModel)]="due" label="Due" [min]="today" />
```

### No form at all

```html
<av-date-picker [(value)]="picked" label="Pick a day" [clearable]="true" />
```

### The calendar on its own

```html
<av-calendar [(value)]="picked" [numberOfMonths]="2" [showWeekNumbers]="true" />
```

### Masking without the calendar

```html
<input avDateMask="dd/MM/yyyy" [(ngModel)]="text" />
```

The directive is the input's value accessor and binds the masked **text**. Pair
it with `avDateValid()` when the control should reject text that is not a real
date.

## Formats

The format string drives the mask, the parser, the placeholder and the
rendering. It is a familiar subset of the patterns Angular's `DatePipe` uses.

| Token          | Meaning                     | Example   | Maskable |
| -------------- | --------------------------- | --------- | -------- |
| `yyyy`         | Four-digit year             | `2026`    | yes      |
| `yy`           | Two-digit year              | `26`      | yes      |
| `MM`           | Zero-padded month           | `09`      | yes      |
| `M`            | Month, no padding           | `9`       | no       |
| `MMM`          | Short month name            | `Sep`     | no       |
| `MMMM`         | Long month name             | `September` | no     |
| `dd`           | Zero-padded day             | `05`      | yes      |
| `d`            | Day, no padding             | `5`       | no       |
| `E` … `EEEE`   | Weekday name, display only  | `Saturday` | no      |
| `'text'`       | Quoted literal              |           | n/a      |

A format is **masked** only when every field is fixed-width and numeric, because
anything else would require guessing where one field ends and the next begins.
`MM/dd/yyyy` masks. `MMM d, yyyy` does not, and falls back to free-text entry
that is parsed and reformatted when the field is left. Both are fully supported;
only the typing behaviour differs.

### What the parser accepts

Against `MM/dd/yyyy`, all of these read as 31 December 2026:

```
12/31/2026      the canonical form
12-31-2026      any separator where one is expected
12 31 2026
12312026        bare digits, read positionally
2026-12-31      a pasted ISO date, whatever the format says
1/5/2026        unpadded numbers (reads as 5 January)
```

`02/30/2026` and `13/01/2026` are rejected as days that do not exist, which is a
different error from text that does not fit the format at all.

Two-digit years use a pivot: with the default of 68, `68` is 2068 and `69` is
1969.

## Values

Most APIs do not want a `Date`. Rather than make every form write a mapping layer
on both sides, `valueMode` sets the shape the control holds.

| `valueMode`   | Control value                | Example                    |
| ------------- | ---------------------------- | -------------------------- |
| `date`        | `Date` at local midnight     | default                    |
| `iso-date`    | `string`, timezone-free      | `'2026-09-20'`             |
| `iso`         | `string`, ISO instant        | `'2026-09-20T04:00:00.000Z'` |
| `timestamp`   | `number`, epoch milliseconds | `1789027200000`            |
| `formatted`   | `string` in `valueFormat`    | `'09/20/2026'`             |

Reading is always lenient: a control holding a `Date`, an ISO date, an ISO
instant, a timestamp, or text in the value format is understood whatever the
mode says.

Every date the library produces sits at **local midnight**. Times are out of
scope on purpose, because a date picker that quietly carries a time component is
the source of most off-by-one-day bugs.

## Validation

The picker is its own validator, so these arrive on the control:

| Error             | Raised when                                  | Payload                |
| ----------------- | -------------------------------------------- | ---------------------- |
| `required`        | Empty and `[required]="true"`                | `true`                 |
| `avDateInvalid`   | Complete text that is not a usable date      | `{ text, reason }`     |
| `avDateMin`       | Earlier than `min`                           | `{ min, actual }`      |
| `avDateMax`       | Later than `max`                             | `{ max, actual }`      |
| `avDateDisabled`  | Rejected by `dateFilter`                     | `{ actual }`           |

Partial entry is not an error. While the field has fewer digits than the mask
holds, the value is `null` and no error is raised, so the form does not turn red
in the middle of a word.

Messages are overridable globally or per field, and `{min}` / `{max}` are filled
in with the date formatted the way the field displays it:

```html
<av-date-picker
  [errorMessages]="{ avDateMin: 'Check out has to follow check in.' }"
  [min]="checkIn"
/>
```

Set `[hideErrors]="true"` to render them yourself from the control.

### Standalone validators

For rules a form has to state without a picker present:

```ts
import { avDateMax, avDateMin, avDateRange, avDateValid } from 'ngx-avlon-calendar';

form = this.fb.group(
  {
    start: [null, [Validators.required, avDateMin(new Date(), 'yyyy-MM-dd')]],
    end: [null, Validators.required],
  },
  { validators: avDateRange('start', 'end', 'yyyy-MM-dd') },
);
```

`avDateRange` puts `avDateRange` on the group and `avDateMin` on the end control,
so a picker bound to the end control displays it with no extra work.

## Theming

Everything visual routes through custom properties. Nothing in the library
hard-codes a colour, a radius, or a duration.

```css
.my-brand {
  --av-accent: #ea580c;
  --av-accent-soft: #ffedd5;
  --av-accent-fg: #ffffff;
  --av-radius-cell: 999px;
  --av-surface: #fffdf7;
  --av-border: #f0d9b5;
  --av-fg: #422006;
}
```

```html
<av-date-picker theme="my-brand" />
```

Shipped themes: `av-theme-default`, `av-theme-midnight`, `av-theme-rose`,
`av-theme-forest`, `av-theme-mono`, `av-theme-glass`. The default follows the
page into dark mode, through either `prefers-color-scheme` or a `.dark` ancestor.

The token set covers geometry (`--av-radius-field`, `--av-radius-panel`,
`--av-radius-cell`, `--av-cell-size`, `--av-panel-padding`), surfaces, lines,
text, accent, state, depth and motion. `styles/theme.css` is the authoritative
list and is short enough to read.

Reduced-motion preferences are honoured: panel and page transitions are dropped
entirely under `prefers-reduced-motion: reduce`.

## Presentation

| Input           | Values                                             | Default      |
| --------------- | -------------------------------------------------- | ------------ |
| `iconPosition`  | `left`, `right`, `none`                            | `right`      |
| `variant`       | `outlined`, `filled`, `underlined`, `ghost`        | `outlined`   |
| `size`          | `sm`, `md`, `lg`                                   | `md`         |
| `floatLabel`    | `auto`, `always`, `never` (label above the field)  | `auto`       |
| `openOn`        | `icon`, `input`, `focus`, `manual`                 | `icon`       |
| `clearable`     | boolean                                            | `false`      |
| `inline`        | Render the calendar in the layout, not a popover   | `false`      |
| `numberOfMonths`| Months side by side                                | `1`          |
| `showWeekNumbers` | ISO week column                                  | `false`      |
| `showFooter`    | Today and Clear buttons                            | `true`       |

### Custom day cells

`dayTemplate` replaces the contents of every cell and receives the date plus its
state, so badges, dots, prices and availability chips stay in your hands.

```html
<av-calendar [dayTemplate]="cell" />

<ng-template #cell let-date let-day="day" let-selected="selected">
  <span class="flex flex-col items-center">
    <span>{{ day }}</span>
    <span class="text-[0.55rem]">{{ rateFor(date) }}</span>
  </span>
</ng-template>
```

## Application defaults

Set the house style once instead of repeating it on every template. Every option
is also a component input, and the input always wins locally.

```ts
import { provideAvlonCalendar } from 'ngx-avlon-calendar';

bootstrapApplication(App, {
  providers: [
    provideAvlonCalendar({
      displayFormat: 'dd/MM/yyyy',
      valueMode: 'iso-date',
      iconPosition: 'left',
      theme: 'my-brand',
      firstDayOfWeek: 1,
      locale: 'en-GB',
      errorMessages: { avDateInvalid: 'That is not a date we recognise.' },
    }),
  ],
});
```

Calling it is optional; every component works with no providers at all.

## Localization

Month and weekday names come from `AvDateAdapter`, which by default reads `Intl`
for the application's `LOCALE_ID`. The first day of the week comes from the
locale too, and can be pinned with `firstDayOfWeek`.

To change how names, parsing or week shape work, provide your own adapter:

```ts
provideAvlonCalendar({ dateAdapter: { provide: AvDateAdapter, useClass: MyAdapter } });
```

## Accessibility

- The popover is a labelled `dialog` with focus trapped while open; Escape closes
  it and returns focus to the input.
- The grid uses `grid` / `row` / `gridcell` roles with a roving tabindex, and the
  focused day is announced through a polite live region as it moves.
- The input carries `aria-invalid`, `aria-describedby` pointing at the hint or
  the error, and `aria-expanded`.
- Errors render in a `role="alert"` region.

### Keyboard

**In the field**

| Key                  | Effect                                              |
| -------------------- | --------------------------------------------------- |
| Digits               | Fill fields left to right, separators appear on their own |
| Arrow up / down      | Step the field under the caret, wrapping months and days |
| Backspace            | Always removes a digit, never stalls on a separator |
| Alt + arrow down     | Open the calendar                                   |
| Escape               | Close the calendar, keep focus in the field         |

**In the calendar**

| Key                      | Effect                          |
| ------------------------ | ------------------------------- |
| Arrow keys               | Move by a day, or a week vertically |
| Home / End               | First and last day of the week  |
| Page up / down           | Previous and next month         |
| Shift + page up / down   | Previous and next year          |
| Enter or Space           | Select the focused day          |
| Escape                   | Close                           |

The header label cycles through day, month and year views.

## Development

```bash
npm install
npm run build:lib     # builds the package and its prebuilt stylesheet
npm start             # serves the demo at http://localhost:4200
npm test              # runs the library's unit tests
```

The demo under `projects/demo` is the reference for every option in this README.

## Licence

MIT.
