# Changelog

All notable changes to `ngx-avlon-calendar` are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-20

First release.

### Added

- `av-date-picker`: a date field combining a masked text input, validation with
  visible errors, and a calendar popover. Works with reactive forms,
  template-driven forms, and plain `[(value)]` binding.
- `av-calendar`: the calendar surface on its own, with day, month and year zoom
  levels, one to many months side by side, ISO week numbers, and a `dayTemplate`
  for custom cell content.
- `avDateMask`: the masking behaviour as a directive for any text input.
- Format-driven masking for fixed-width numeric formats, with separator
  insertion, single-digit field completion, arrow-key stepping, and deletion
  that never stalls on a separator.
- A shape-driven parser that accepts loose separators, unpadded numbers, bare
  digit runs, pasted ISO dates, and month names in either width.
- `valueMode` for choosing the value shape handed to the form: `date`,
  `iso-date`, `iso`, `timestamp` or `formatted`.
- Validation reported as control errors: `required`, `avDateInvalid`,
  `avDateMin`, `avDateMax` and `avDateDisabled`, with overridable messages.
- Standalone validators: `avDateMin`, `avDateMax`, `avDateFilter`,
  `avDateValid` and the cross-field `avDateRange`.
- Theming through CSS custom properties, with six shipped themes:
  `av-theme-default`, `av-theme-midnight`, `av-theme-rose`, `av-theme-forest`,
  `av-theme-mono` and `av-theme-glass`.
- Presentation inputs for icon position, field variant, size, label behaviour,
  open trigger, clear button and inline rendering.
- `provideAvlonCalendar()` for application-wide defaults, locale and first day
  of week, and `AvDateAdapter` as the localization seam.
- A prebuilt stylesheet at `styles/ngx-avlon-calendar.css`, without Preflight,
  so Tailwind is optional for consumers.
- Keyboard and screen-reader support throughout: roving tabindex over a labelled
  grid, a live region announcing the focused day, a focus-trapped popover, and
  `prefers-reduced-motion` handling.
