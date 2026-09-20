# @avlon/ngx-avlon-calendar

An Angular date picker that is actually pleasant to type into: format-driven
input masking, real validation with visible errors, reactive and
template-driven forms, and a calendar themed through CSS custom properties.

No runtime dependencies. No stylesheet to import. Shadow-DOM encapsulated, so
styles cross the boundary in neither direction.

```html
<av-date-picker formControlName="checkIn" label="Check in" [min]="today" [required]="true" />
```

**[Live demo](https://avlon-technologies.github.io/ngx-avlon-calendar/)** ·
[Changelog](CHANGELOG.md) · MIT

---

## Contents

- [Why this one](#why-this-one)
- [Install](#install)
- [Quick start](#quick-start)
- [Usage](#usage)
- [Formats](#formats)
- [Values](#values)
- [Validation](#validation)
- [Theming](#theming)
- [Presentation](#presentation)
- [Application defaults](#application-defaults)
- [Localization](#localization)
- [Accessibility](#accessibility)
- [API reference](#api-reference)
- [Operations](#operations)
- [Troubleshooting](#troubleshooting)

---

## Why this one

- **Typing works properly.** Separators appear as fields complete. Backspace
  never stalls on a slash. Arrow keys step the field under the caret. Pasting an
  ISO date from an API response just works.
- **Validation reaches the form.** `min`, `max`, `dateFilter` and unparseable
  text arrive as ordinary control errors, so your own validators compose with
  them instead of fighting them.
- **Three binding styles, one component.** `formControlName`, `[(ngModel)]`, or
  `[(value)]` against a signal. Nothing switches mode.
- **The value shape is yours.** Most APIs do not want a `Date`. Choose
  `iso-date`, `timestamp` or a formatted string and skip the mapping layer.
- **Themed by tokens.** A theme is a block of custom properties. Nothing in the
  library hard-codes a colour, a radius, or a duration.
- **Nothing to configure.** No CSS import, no Tailwind setup, no peer
  dependency beyond Angular.

## Install

```bash
npm install @avlon/ngx-avlon-calendar
```

**Requirements:** Angular 22 (`@angular/common`, `@angular/core`,
`@angular/forms`). That is the entire peer dependency list.

There is no stylesheet to import. Both components carry their own styles into
their shadow roots.

## Quick start

```ts
import { Component, signal } from '@angular/core';
import { AvDatePicker } from '@avlon/ngx-avlon-calendar';

@Component({
  selector: 'app-booking',
  imports: [AvDatePicker],
  template: `<av-date-picker [(value)]="checkIn" label="Check in" [clearable]="true" />`,
})
export class Booking {
  readonly checkIn = signal<Date | null>(null);
}
```

That is the whole setup. No provider, no import of a CSS file.

## Usage

### Reactive forms

```ts
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

It paints its own surface, so it needs no wrapper. The host element is in the
light DOM, so you can still give it a border or a shadow from your own CSS.

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

| Token         | Meaning                    | Example     | Maskable |
| ------------- | -------------------------- | ----------- | -------- |
| `yyyy`        | Four-digit year            | `2026`      | yes      |
| `yy`          | Two-digit year             | `26`        | yes      |
| `MM`          | Zero-padded month          | `09`        | yes      |
| `M`           | Month, no padding          | `9`         | no       |
| `MMM`         | Short month name           | `Sep`       | no       |
| `MMMM`        | Long month name            | `September` | no       |
| `dd`          | Zero-padded day            | `05`        | yes      |
| `d`           | Day, no padding            | `5`         | no       |
| `E` to `EEEE` | Weekday name, display only | `Saturday`  | no       |
| `'text'`      | Quoted literal             |             | n/a      |

A format is **masked** only when every field is fixed-width and numeric, because
anything else would mean guessing where one field ends and the next begins.
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
```

`1/5/2026` reads as 5 January. `02/30/2026` and `13/01/2026` are rejected as
days that do not exist, which is a different error from text that does not fit
the format at all.

Two-digit years use a pivot: with the default of 68, `68` is 2068 and `69` is 1969. Change it with `twoDigitYearPivot`.

## Values

`valueMode` sets the shape the control holds.

| `valueMode` | Control value                      | Example                      |
| ----------- | ---------------------------------- | ---------------------------- |
| `date`      | `Date` at local midnight (default) |                              |
| `iso-date`  | `string`, timezone-free            | `'2026-09-20'`               |
| `iso`       | `string`, ISO instant              | `'2026-09-20T04:00:00.000Z'` |
| `timestamp` | `number`, epoch milliseconds       | `1789027200000`              |
| `formatted` | `string` in `valueFormat`          | `'09/20/2026'`               |

Reading is always lenient: a control holding a `Date`, an ISO date, an ISO
instant, a timestamp, or text in the value format is understood whatever the
mode says.

Every date the library produces sits at **local midnight**. Times are out of
scope on purpose, because a date picker that quietly carries a time component is
the source of most off-by-one-day bugs.

## Validation

The picker is its own validator, so these arrive on the control:

| Error            | Raised when                             | Payload            |
| ---------------- | --------------------------------------- | ------------------ |
| `required`       | Empty and `[required]="true"`           | `true`             |
| `avDateInvalid`  | Complete text that is not a usable date | `{ text, reason }` |
| `avDateMin`      | Earlier than `min`                      | `{ min, actual }`  |
| `avDateMax`      | Later than `max`                        | `{ max, actual }`  |
| `avDateDisabled` | Rejected by `dateFilter`                | `{ actual }`       |

Partial entry is not an error. While the field holds fewer digits than the mask
takes, the value is `null` and no error is raised, so the form does not turn red
in the middle of a word.

Messages are overridable globally or per field, and `{min}` and `{max}` are
filled in with the date formatted the way the field displays it:

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
import { avDateMin, avDateRange } from '@avlon/ngx-avlon-calendar';

form = this.fb.group(
  {
    start: [null, [Validators.required, avDateMin(new Date(), 'yyyy-MM-dd')]],
    end: [null, Validators.required],
  },
  { validators: avDateRange('start', 'end', 'yyyy-MM-dd') },
);
```

`avDateRange` puts `avDateRange` on the group and `avDateMin` on the end
control, so a picker bound to the end control displays it with no extra work.

## Theming

Every visual decision routes through a custom property. **Custom properties
inherit through a shadow boundary**, which is what keeps theming simple despite
the encapsulation. There are three ways to apply one, in increasing order of
locality.

**1. Set tokens on an ancestor.** They inherit in.

```css
.booking-form {
  --av-accent: #ea580c;
  --av-accent-soft: #ffedd5;
  --av-radius-cell: 999px;
}
```

**2. Pass a shipped theme class.**

```html
<av-date-picker theme="av-theme-rose" />
```

Shipped: `av-theme-default`, `av-theme-midnight`, `av-theme-rose`,
`av-theme-forest`, `av-theme-mono`, `av-theme-glass`. The default follows the
page into dark mode via `prefers-color-scheme`; add `av-dark` to the element to
force it.

**3. Set tokens on the element itself.**

```html
<av-date-picker [style.--av-accent]="brandColour()" />
```

### Tokens

| Group    | Tokens                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Geometry | `--av-radius-field`, `--av-radius-panel`, `--av-radius-cell`, `--av-cell-size`, `--av-panel-padding` |
| Surfaces | `--av-surface`, `--av-surface-sunken`, `--av-surface-hover`, `--av-panel-surface`                    |
| Lines    | `--av-border`, `--av-border-hover`, `--av-divider`                                                   |
| Text     | `--av-fg`, `--av-fg-muted`, `--av-fg-subtle`, `--av-fg-placeholder`                                  |
| Accent   | `--av-accent`, `--av-accent-hover`, `--av-accent-fg`, `--av-accent-soft`, `--av-accent-ring`         |
| State    | `--av-danger`, `--av-danger-soft`, `--av-danger-border`, `--av-today`, `--av-disabled-fg`            |
| Depth    | `--av-shadow-field`, `--av-shadow-panel`                                                             |
| Motion   | `--av-duration`, `--av-duration-panel`, `--av-ease`                                                  |
| Type     | `--av-font`, `--av-font-numeric`                                                                     |

Reduced-motion preferences are honoured: panel and page transitions are dropped
entirely under `prefers-reduced-motion: reduce`.

## Presentation

| Input             | Values                                            | Default    |
| ----------------- | ------------------------------------------------- | ---------- |
| `iconPosition`    | `left`, `right`, `none`                           | `right`    |
| `variant`         | `outlined`, `filled`, `underlined`, `ghost`       | `outlined` |
| `size`            | `sm`, `md`, `lg`                                  | `md`       |
| `floatLabel`      | `auto`, `always`, `never` (label above the field) | `auto`     |
| `openOn`          | `icon`, `input`, `focus`, `manual`                | `icon`     |
| `clearable`       | boolean                                           | `false`    |
| `inline`          | Render the calendar in the layout, not a popover  | `false`    |
| `numberOfMonths`  | Months side by side                               | `1`        |
| `showWeekNumbers` | ISO week column                                   | `false`    |
| `showFooter`      | Today and Clear buttons                           | `true`     |
| `panelAlign`      | `start`, `end`                                    | `start`    |

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
import { provideAvlonCalendar } from '@avlon/ngx-avlon-calendar';

bootstrapApplication(App, {
  providers: [
    provideAvlonCalendar({
      displayFormat: 'dd/MM/yyyy',
      valueMode: 'iso-date',
      iconPosition: 'left',
      theme: 'av-theme-midnight',
      firstDayOfWeek: 1,
      locale: 'en-GB',
      errorMessages: { avDateInvalid: 'That is not a date we recognise.' },
    }),
  ],
});
```

Calling it is optional; every component works with no providers at all.

## Localization

Month and weekday names come from `AvDateAdapter`, which reads `Intl` for the
application's `LOCALE_ID`. The first day of the week comes from the locale too,
and can be pinned with `firstDayOfWeek`.

To change how names, parsing or week shape work, provide your own adapter:

```ts
provideAvlonCalendar({ dateAdapter: { provide: AvDateAdapter, useClass: MyAdapter } });
```

## Accessibility

- The popover is a labelled `dialog` with focus trapped while open. Escape
  closes it and returns focus to the input.
- The grid uses `grid`, `row` and `gridcell` roles with a roving tabindex, and
  the focused day is announced through a polite live region as it moves.
- The input carries `aria-invalid`, `aria-expanded`, and `aria-describedby`
  pointing at the hint or the error.
- Errors render in a `role="alert"` region.

### Keyboard

**In the field**

| Key              | Effect                                                    |
| ---------------- | --------------------------------------------------------- |
| Digits           | Fill fields left to right; separators appear on their own |
| Arrow up / down  | Step the field under the caret, wrapping months and days  |
| Backspace        | Always removes a digit, never stalls on a separator       |
| Alt + arrow down | Open the calendar                                         |
| Escape           | Close the calendar, keep focus in the field               |

**In the calendar**

| Key                    | Effect                              |
| ---------------------- | ----------------------------------- |
| Arrow keys             | Move by a day, or a week vertically |
| Home / End             | First and last day of the week      |
| Page up / down         | Previous and next month             |
| Shift + page up / down | Previous and next year              |
| Enter or Space         | Select the focused day              |
| Escape                 | Close                               |

The header label cycles through day, month and year views.

## API reference

### `av-date-picker`

Inputs not already covered: `label`, `hint`, `placeholder`, `displayFormat`,
`valueFormat`, `showMaskPlaceholder`, `twoDigitYearPivot`, `autoPad`, `min`,
`max`, `dateFilter`, `required`, `errorMessages`, `hideErrors`, `theme`,
`panelClass`, `inputClass`, `disabled`, `readonly`, `name`, `inputId`,
`firstDayOfWeek`, `startView`, `keepOpenOnSelect`, `showOutsideDays`,
`todayLabel`, `clearLabel`, `dayTemplate`.

Outputs: `valueChange`, `opened`, `closed`, `invalidInput`.

Methods: `openPanel()`, `close()`, `toggle()`.

### `av-calendar`

Inputs: `value`, `activeDate`, `min`, `max`, `dateFilter`, `firstDayOfWeek`,
`numberOfMonths`, `showWeekNumbers`, `showFooter`, `showOutsideDays`,
`startView`, `size`, `theme`, `disabled`, `todayLabel`, `clearLabel`,
`dayTemplate`, `headerTemplate`.

Outputs: `valueChange`, `activeDateChange`, `dateSelected`, `cleared`,
`closeRequested`, `viewChanged`.

Methods: `showMonth(date)`, `focus()`, `isDayDisabled(date)`.

### Functions

`provideAvlonCalendar`, `parseDate`, `formatDate`, `maskSpecFor`, `renderMask`,
`decodeValue`, `encodeValue`, `toIsoDate`, and the date helpers `addDays`,
`addMonths`, `addYears`, `startOfDay`, `startOfMonth`, `endOfMonth`,
`daysInMonth`, `isLeapYear`, `isSameDay`, `isSameMonth`, `compareDays`,
`clampDate`, `isWithin`, `isoWeekNumber`, `calendarGrid`, `makeDate`, `today`.

## Operations

### Browser support

Evergreen Chrome, Edge, Firefox and Safari. The panel uses the native popover
API, which is available in all four; where it is missing the panel still renders
and works, positioned in flow rather than in the top layer.

Shadow DOM is required. There is no polyfilled fallback, and there is no
supported way to run the components without encapsulation.

### Server-side rendering

The components render on the server. The panel is client-only: it is created
when opened, which never happens during a server render. Nothing touches
`window` or `document` at construction time.

### Bundle size

Roughly 30 kB of CSS is carried inside the components and shared between them
through a single constructed stylesheet, so a page with fifty pickers pays for
it once. No CSS is added to your global stylesheet.

### Forms and native submission

Shadow-DOM inputs do not take part in native form submission. Angular's forms
do not rely on it, so `formControlName` and `ngModel` behave normally. If you
submit a form the browser's own way, read the value from the control rather
than from `FormData`.

### Versioning

Semantic versioning. The public API is everything exported from the package
entry point. Custom property names in the token table are part of the public API
too: renaming one is a breaking change.

## Troubleshooting

**The picker renders unstyled.** Check that it is really this package and not a
stale build; the styles ship inside the component and cannot be missing
independently. If you have set `encapsulation` on a wrapping component, that
does not affect these.

**My global styles do not reach the calendar.** By design. Use the tokens; see
[Theming](#theming). If a case genuinely needs more than a token, open an issue
so the token set can grow.

**The panel is clipped or behind something.** It should not be, since it renders
in the top layer. If you see this, check whether an ancestor sets a `transform`,
`filter` or `contain`, which creates a containing block that even the top layer
respects in some engines, and report it.

**Tests cannot find the input.** `querySelector` does not cross a shadow
boundary. Query `element.shadowRoot`, or use a deep-query helper that recurses
into shadow roots.

**The value is a day earlier or later than I picked.** Something is converting
to UTC. Use `valueMode="iso-date"`, which is timezone-free, rather than `iso`.

**Typing `1` does not become `01`.** Only an unambiguous digit completes its
field: `1` could still become `12`. Set `[autoPad]="false"` to turn the
behaviour off entirely.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md). Bug reports, ideas and pull
requests are all welcome.

## Licence

MIT. Provided as is, without warranty of any kind; see [LICENSE](LICENSE).
