import type { AvFieldKind, AvFormatToken, AvMaskField, AvMaskRender, AvMaskSpec } from './types';
import { daysInMonth, isValidDate } from './date-utils';

/**
 * Format tokenizer and mask renderer.
 *
 * Supported tokens (a familiar subset of the Unicode LDML patterns that
 * Angular's `DatePipe` also uses):
 *
 * | Token          | Meaning                     | Maskable |
 * |----------------|-----------------------------|----------|
 * | `yyyy`         | four-digit year             | yes      |
 * | `yy`           | two-digit year              | yes      |
 * | `MM`           | zero-padded month           | yes      |
 * | `M`            | month, no padding           | no       |
 * | `MMM` / `MMMM` | short / long month name     | no       |
 * | `dd`           | zero-padded day of month    | yes      |
 * | `d`            | day of month, no padding    | no       |
 * | `E` ... `EEEE` | weekday name (display only) | no       |
 * | quoted text    | literal, single quotes       | n/a     |
 *
 * A format is *maskable* only when every field token is fixed-width numeric.
 * `MM/dd/yyyy` masks; `MMM d, yyyy` does not, and falls back to free-text entry
 * that is parsed and reformatted when the field is committed.
 */

const FIELD_LETTERS = new Set(['y', 'M', 'd', 'E']);
const QUOTE = String.fromCharCode(39);

/** Placeholder character used for each field kind, e.g. `mm/dd/yyyy`. */
const PLACEHOLDER_CHAR: Record<AvFieldKind, string> = {
  year: 'y',
  month: 'm',
  day: 'd',
};

/** Locale-dependent names, supplied by the date adapter. */
export interface AvDateNames {
  readonly monthsLong: readonly string[];
  readonly monthsShort: readonly string[];
  readonly weekdaysLong: readonly string[];
  readonly weekdaysShort: readonly string[];
  readonly weekdaysNarrow: readonly string[];
}

export const AV_DEFAULT_NAMES: AvDateNames = {
  monthsLong: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weekdaysNarrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

function fieldFor(letter: string, run: number): Omit<AvFormatToken, 'type' | 'raw'> | null {
  switch (letter) {
    case 'y':
      return { kind: 'year', width: run, numeric: true, fixed: run === 4 || run === 2 };
    case 'M':
      return run >= 3
        ? { kind: 'month', width: run, numeric: false, fixed: false }
        : { kind: 'month', width: run, numeric: true, fixed: run === 2 };
    case 'd':
      return { kind: 'day', width: run, numeric: true, fixed: run === 2 };
    default:
      // Weekday names render but never parse back; they carry no value.
      return null;
  }
}

/** Splits a format string into field and literal tokens. */
export function tokenizeFormat(format: string): AvFormatToken[] {
  const tokens: AvFormatToken[] = [];
  let i = 0;
  let literal = '';

  const flushLiteral = () => {
    if (literal) {
      tokens.push({ type: 'literal', raw: literal });
      literal = '';
    }
  };

  while (i < format.length) {
    const ch = format[i]!;

    if (ch === QUOTE) {
      // A quoted run is a literal; a doubled quote inside it is an apostrophe.
      i++;
      if (format[i] === QUOTE) {
        literal += QUOTE;
        i++;
        continue;
      }
      while (i < format.length && format[i] !== QUOTE) {
        literal += format[i];
        i++;
      }
      i++; // closing quote
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      let run = 0;
      while (format[i + run] === ch) run++;
      const raw = format.slice(i, i + run);
      flushLiteral();

      if (FIELD_LETTERS.has(ch)) {
        const meta = fieldFor(ch, run);
        tokens.push(
          meta
            ? { type: 'field', raw, ...meta }
            : { type: 'field', raw, numeric: false, fixed: false },
        );
      } else {
        // An unrecognised letter run is kept verbatim so nothing is silently
        // dropped; `buildMaskSpec` then marks the format unmaskable.
        tokens.push({ type: 'field', raw, numeric: false, fixed: false });
      }
      i += run;
      continue;
    }

    literal += ch;
    i++;
  }

  flushLiteral();
  return tokens;
}

/** Builds the mask spec for a format string. Pure, and cheap enough to memoize. */
export function buildMaskSpec(format: string): AvMaskSpec {
  const tokens = tokenizeFormat(format);
  const fields: AvMaskField[] = [];
  let totalDigits = 0;
  let maskable = tokens.length > 0;
  let placeholder = '';

  tokens.forEach((token, tokenIndex) => {
    if (token.type === 'literal') {
      placeholder += token.raw;
      return;
    }
    if (!token.fixed || !token.numeric || !token.kind) {
      maskable = false;
      placeholder += token.raw;
      return;
    }
    const width = token.width!;
    fields.push({
      kind: token.kind,
      width,
      digitStart: totalDigits,
      digitEnd: totalDigits + width,
      tokenIndex,
    });
    totalDigits += width;
    placeholder += PLACEHOLDER_CHAR[token.kind].repeat(width);
  });

  // A format with no fields at all can never be masked into a date.
  if (fields.length === 0) maskable = false;

  return { format, tokens, maskable, fields, totalDigits, placeholder };
}

const specCache = new Map<string, AvMaskSpec>();

/** Memoized `buildMaskSpec`. Formats are few and long-lived, so caching pays. */
export function maskSpecFor(format: string): AvMaskSpec {
  let spec = specCache.get(format);
  if (!spec) {
    spec = buildMaskSpec(format);
    specCache.set(format, spec);
  }
  return spec;
}

/** Strips every non-digit and caps the result at the mask's capacity. */
export function extractDigits(raw: string, spec: AvMaskSpec): string {
  return raw.replace(/\D/g, '').slice(0, spec.totalDigits);
}

/**
 * Renders a digit buffer through the mask.
 *
 * With `fill` the full placeholder shows and typed digits replace it
 * (`12/dd/yyyy`). Without it the text grows as you type (`12/`), which reads
 * better in a field that also has to look good while empty.
 */
export function renderMask(raw: string, spec: AvMaskSpec, fill = false): AvMaskRender {
  const digits = extractDigits(raw, spec);
  if (!spec.maskable) {
    return { text: raw, digits, slots: [] };
  }
  if (!fill && digits.length === 0) {
    return { text: '', digits: '', slots: [] };
  }

  let text = '';
  const slots: number[] = [];
  let fieldIndex = 0;

  outer: for (const token of spec.tokens) {
    if (token.type === 'literal') {
      text += token.raw;
      continue;
    }
    const field = spec.fields[fieldIndex++]!;
    const part = digits.slice(field.digitStart, field.digitEnd);
    for (let k = 0; k < part.length; k++) {
      slots.push(text.length);
      text += part[k];
    }
    if (part.length < field.width) {
      if (fill) {
        const pad = PLACEHOLDER_CHAR[field.kind];
        for (let k = part.length; k < field.width; k++) {
          slots.push(text.length);
          text += pad;
        }
      } else {
        // Nothing further can be typed yet, so stop before the next separator.
        break outer;
      }
    }
  }

  return { text, digits, slots };
}

/**
 * Text offset for a caret that should sit after `digitCount` digits.
 *
 * `tight` keeps the caret immediately after the last digit, which is what a
 * deletion wants. Otherwise the caret hops forward over separators onto the
 * next digit slot, which is what typing wants.
 */
export function caretForDigits(render: AvMaskRender, digitCount: number, tight = false): number {
  if (digitCount <= 0) return tight ? 0 : (render.slots[0] ?? 0);
  if (tight) {
    const prev = render.slots[digitCount - 1];
    return prev === undefined ? render.text.length : prev + 1;
  }
  const next = render.slots[digitCount];
  return next === undefined ? render.text.length : next;
}

/** How many digits of `text` precede `caret`. */
export function countDigitsBefore(text: string, caret: number): number {
  let n = 0;
  for (let i = 0; i < caret && i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 48 && code <= 57) n++;
  }
  return n;
}

/** The field whose digit span contains `digitIndex`, clamped into range. */
export function fieldAtDigitIndex(spec: AvMaskSpec, digitIndex: number): AvMaskField | null {
  if (spec.fields.length === 0) return null;
  const i = Math.max(0, Math.min(digitIndex, spec.totalDigits - 1));
  return spec.fields.find((f) => i >= f.digitStart && i < f.digitEnd) ?? null;
}

/** The selection range covering a whole field, or `null` when it is not rendered. */
export function selectionForField(
  render: AvMaskRender,
  field: AvMaskField,
): { start: number; end: number } | null {
  const start = render.slots[field.digitStart];
  const lastRendered = Math.min(field.digitEnd, render.slots.length) - 1;
  if (start === undefined || lastRendered < field.digitStart) return null;
  return { start, end: render.slots[lastRendered]! + 1 };
}

/**
 * Should a single typed digit complete its field on its own?
 *
 * Typing `5` into `MM` can only ever mean May, so padding to `05` and moving on
 * saves a keystroke. Typing `1` must wait, because `12` is still reachable.
 */
export function shouldAutoPad(kind: AvFieldKind, width: number, partial: string): boolean {
  if (width !== 2 || partial.length !== 1) return false;
  const digit = Number(partial);
  if (kind === 'month') return digit >= 2;
  if (kind === 'day') return digit >= 4;
  return false;
}

/** Wraps `value` into the inclusive `[min, max]` range, so stepping rolls over. */
export function wrapNumber(value: number, min: number, max: number): number {
  const span = max - min + 1;
  return ((((value - min) % span) + span) % span) + min;
}

/** Expands a two-digit year using a sliding pivot. */
export function expandTwoDigitYear(value: number, pivot: number): number {
  return value <= pivot ? 2000 + value : 1900 + value;
}

/**
 * Steps one mask field by `delta`.
 *
 * Months and days wrap; years clamp. An empty field starts from the reference
 * date, so the first arrow press on a blank input lands on something sensible.
 */
export function stepFieldDigits(
  spec: AvMaskSpec,
  digits: string,
  field: AvMaskField,
  delta: number,
  reference: Date,
  twoDigitYearPivot = 68,
): string {
  const buffer = digits.padEnd(spec.totalDigits, ' ').split('');
  const current = digits.slice(field.digitStart, field.digitEnd);
  const complete = current.length === field.width;

  const readField = (kind: AvFieldKind, fallback: number): number => {
    const f = spec.fields.find((x) => x.kind === kind);
    if (!f) return fallback;
    const text = digits.slice(f.digitStart, f.digitEnd);
    if (text.length < f.width) return fallback;
    const n = Number(text);
    if (!Number.isFinite(n)) return fallback;
    return f.kind === 'year' && f.width === 2 ? expandTwoDigitYear(n, twoDigitYearPivot) : n;
  };

  let next: number;
  if (field.kind === 'month') {
    const base = complete ? Number(current) : reference.getMonth() + 1 - delta;
    next = wrapNumber(base + delta, 1, 12);
  } else if (field.kind === 'day') {
    const year = readField('year', reference.getFullYear());
    const month = readField('month', reference.getMonth() + 1);
    const max = daysInMonth(year, Math.max(0, Math.min(11, month - 1)));
    const base = complete ? Number(current) : reference.getDate() - delta;
    next = wrapNumber(base + delta, 1, max);
  } else {
    const twoDigit = field.width === 2;
    const start = twoDigit ? reference.getFullYear() % 100 : reference.getFullYear();
    const base = complete ? Number(current) : start - delta;
    next = base + delta;
    next = twoDigit ? wrapNumber(next, 0, 99) : Math.max(1, Math.min(9999, next));
  }

  const padded = String(next).padStart(field.width, '0').slice(-field.width);
  for (let k = 0; k < field.width; k++) buffer[field.digitStart + k] = padded[k]!;

  // Trailing spaces mean "not yet typed", so drop them rather than emit blanks.
  return buffer.join('').replace(/ +$/, '');
}

/** Formats a date with the given format string. */
export function formatDate(
  date: Date | null,
  format: string,
  names: AvDateNames = AV_DEFAULT_NAMES,
): string {
  if (!isValidDate(date)) return '';
  const tokens = maskSpecFor(format).tokens;
  let out = '';
  for (const token of tokens) {
    out += token.type === 'literal' ? token.raw : renderToken(token, date, names);
  }
  return out;
}

function renderToken(token: AvFormatToken, date: Date, names: AvDateNames): string {
  const run = token.raw.length;
  switch (token.raw[0]) {
    case 'y': {
      const year = date.getFullYear();
      return run === 2
        ? String(year % 100).padStart(2, '0')
        : String(year).padStart(run, '0');
    }
    case 'M': {
      if (run >= 4) return names.monthsLong[date.getMonth()]!;
      if (run === 3) return names.monthsShort[date.getMonth()]!;
      return String(date.getMonth() + 1).padStart(run, '0');
    }
    case 'd':
      return String(date.getDate()).padStart(run, '0');
    case 'E': {
      if (run >= 4) return names.weekdaysLong[date.getDay()]!;
      if (run === 1) return names.weekdaysNarrow[date.getDay()]!;
      return names.weekdaysShort[date.getDay()]!;
    }
    default:
      return token.raw;
  }
}
