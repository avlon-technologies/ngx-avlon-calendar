/**
 * Public value / presentation types for ngx-avlon-calendar.
 */

/** Which calendar field a format token addresses. */
export type AvFieldKind = 'year' | 'month' | 'day';

/** A single parsed piece of a date format string. */
export interface AvFormatToken {
  /** `field` tokens carry data; `literal` tokens are rendered verbatim. */
  readonly type: 'field' | 'literal';
  /** The raw source text of the token, e.g. `MM` or `/`. */
  readonly raw: string;
  /** Present on field tokens. */
  readonly kind?: AvFieldKind;
  /** Number of characters the token occupies, for fixed-width numeric tokens. */
  readonly width?: number;
  /** True when the token renders digits (`yyyy`, `MM`), false for `MMM`/`MMMM`. */
  readonly numeric?: boolean;
  /** True when the token has a fixed digit count and can take part in a mask. */
  readonly fixed?: boolean;
}

/** One maskable numeric field, with its span inside the mask's digit buffer. */
export interface AvMaskField {
  readonly kind: AvFieldKind;
  readonly width: number;
  /** Index of this field's first digit in the digit buffer. */
  readonly digitStart: number;
  /** Index one past this field's last digit in the digit buffer. */
  readonly digitEnd: number;
  /** Index of the owning token in `AvMaskSpec.tokens`. */
  readonly tokenIndex: number;
}

/** Everything the mask engine needs to render and navigate a format. */
export interface AvMaskSpec {
  readonly format: string;
  readonly tokens: readonly AvFormatToken[];
  /** True when every field token is fixed-width numeric, so masking applies. */
  readonly maskable: boolean;
  readonly fields: readonly AvMaskField[];
  /** Total digits a complete value occupies. */
  readonly totalDigits: number;
  /** Hint text derived from the format, e.g. `mm/dd/yyyy`. */
  readonly placeholder: string;
}

/** Result of rendering a digit buffer through a mask spec. */
export interface AvMaskRender {
  /** The text to display in the input. */
  readonly text: string;
  /** The digits that survived, left-aligned and capped at `totalDigits`. */
  readonly digits: string;
  /** Text index of each rendered digit slot, in order. */
  readonly slots: readonly number[];
}

/** How the picker hands values to the form control. */
export type AvValueMode =
  /** A native `Date` at local midnight. Default. */
  | 'date'
  /** A `yyyy-MM-dd` string, timezone-free. */
  | 'iso-date'
  /** A full ISO-8601 UTC instant string. */
  | 'iso'
  /** Milliseconds since the epoch. */
  | 'timestamp'
  /** A string in `valueFormat` (falls back to the display format). */
  | 'formatted';

/** Where the calendar toggle sits relative to the text input. */
export type AvIconPosition = 'left' | 'right' | 'none';

/** Visual treatment of the input field. */
export type AvFieldVariant = 'outlined' | 'filled' | 'underlined' | 'ghost';

/** Control density. */
export type AvSize = 'sm' | 'md' | 'lg';

/** What gesture opens the panel. */
export type AvOpenTrigger = 'icon' | 'input' | 'focus' | 'manual';

/** Which zoom level the calendar starts on. */
export type AvCalendarView = 'days' | 'months' | 'years';

/** Label float behaviour. */
export type AvFloatLabel = 'auto' | 'always' | 'never';

/** Predicate deciding whether a date can be chosen. */
export type AvDateFilter = (date: Date) => boolean;

/** Message bundle for validation errors, keyed by error code. */
export interface AvErrorMessages {
  required?: string;
  avDateInvalid?: string;
  avDateMin?: string;
  avDateMax?: string;
  avDateDisabled?: string;
  [key: string]: string | undefined;
}

/** Context handed to a custom day cell template. */
export interface AvDayCellContext {
  readonly $implicit: Date;
  readonly date: Date;
  readonly day: number;
  readonly selected: boolean;
  readonly today: boolean;
  readonly disabled: boolean;
  readonly outside: boolean;
  readonly focused: boolean;
}
