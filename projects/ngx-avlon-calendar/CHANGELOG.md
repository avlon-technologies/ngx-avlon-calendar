# Changelog

All notable changes to `@avlon/ngx-avlon-calendar` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

The release workflow reads the section matching the tag being published and uses
it verbatim as the GitHub release notes, so each section is written to be read
on its own.

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-09-20

First release.

An Angular date picker that works in reactive forms, template-driven forms, and
with no form at all; masks input according to the date format rather than a
separate pattern; reports validation as ordinary control errors; and is themed
through CSS custom properties.

It has no runtime dependencies beyond Angular, ships no stylesheet you have to
import, and renders into a shadow root so styles cross the boundary in neither
direction.

### Components and directives

- **`av-date-picker`** - a date field: masked text input, validation with
  visible errors, and a calendar popover. It registers itself as both the value
  accessor and a validator, so `formControlName`, `[(ngModel)]` and `[(value)]`
  all work with no change in configuration.
- **`av-calendar`** - the calendar surface on its own, with day, month and year
  zoom levels, one or more months side by side, ISO week numbers, and a
  `dayTemplate` for custom cell content.
- **`avDateMask`** - the typing behaviour as a directive for any text input.

### Input masking

- Separators appear as each field completes, and a single unambiguous digit
  completes its field: typing `5` into a month becomes `05`.
- Backspace always removes a digit and never stalls on a separator.
- Arrow keys step the field under the caret, wrapping months and days and
  clamping years.
- The model is the digit buffer rather than the text, so paste, drag-and-drop,
  autofill, undo and IME input need no special handling.
- Masking applies to fixed-width numeric formats. Formats containing a month
  name or an unpadded number fall back to free-text entry that is parsed and
  reformatted when the field is committed.

### Parsing

Shape-driven from the same token table that renders and masks a format. Accepts
loose separators, unpadded numbers, bare digit runs, pasted ISO dates, and month
names in either width. Distinguishes text that does not match the format from a
day that does not exist.

### Values

`valueMode` chooses the shape handed to the form control: `date`, `iso-date`,
`iso`, `timestamp` or `formatted`. Reading is lenient regardless of the mode.
Every date the library produces is at local midnight.

### Validation

Reported as control errors, so application validators compose with them:
`required`, `avDateInvalid`, `avDateMin`, `avDateMax`, `avDateDisabled`.
Messages are overridable globally or per field. Partial entry is not an error.

Standalone validators are exported for forms with no picker attached:
`avDateMin`, `avDateMax`, `avDateFilter`, `avDateValid`, and the cross-field
`avDateRange`.

### Theming

Every visual decision routes through a CSS custom property. Six themes ship:
`av-theme-default`, `av-theme-midnight`, `av-theme-rose`, `av-theme-forest`,
`av-theme-mono`, `av-theme-glass`. The default follows the page into dark mode.

### Presentation

Icon position, field variant, control size, label behaviour, open trigger, clear
button, inline rendering, months shown, week numbers and footer are all inputs.
`provideAvlonCalendar()` sets application-wide defaults, locale and first day of
week; component inputs always win locally.

### Isolation

Both components render with `ViewEncapsulation.ShadowDom` and carry their own
generated stylesheet. Nothing a host page writes can select into a component,
and nothing a component writes can escape. Custom properties still inherit
across the boundary, which is what keeps theming simple.

The popover is a native top-layer popover, so no ancestor's `overflow` can clip
it while it stays inside the shadow root.

### Accessibility

A roving tabindex over a grid with `grid`, `row` and `gridcell` roles; a polite
live region announcing the focused day; a labelled dialog with focus trapped
while open and returned to the input on close; `aria-invalid` and
`aria-describedby` on the input; errors in a `role="alert"` region;
`prefers-reduced-motion` honoured.

### Requirements

Angular 22. No other runtime dependency.

[Unreleased]: https://github.com/avlon-technologies/ngx-avlon-calendar/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/avlon-technologies/ngx-avlon-calendar/releases/tag/v0.1.0
