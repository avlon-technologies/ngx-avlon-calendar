import { AV_DEFAULT_NAMES, expandTwoDigitYear, maskSpecFor, type AvDateNames } from './date-format';
import { daysInMonth, makeDate } from './date-utils';
import type { AvFormatToken } from './types';

/** Why a piece of text could not become a date. */
export type AvParseFailure =
  /** The text does not match the shape of the format. */
  | 'format'
  /** The text matched, but names a day that does not exist, such as 31 Feb. */
  | 'nonexistent';

export type AvParseResult =
  | { readonly status: 'empty' }
  | { readonly status: 'ok'; readonly date: Date }
  | { readonly status: 'invalid'; readonly reason: AvParseFailure };

export interface AvParseOptions {
  /** Locale names used to read `MMM` and `MMMM` month tokens. */
  readonly names?: AvDateNames;
  /**
   * Highest two-digit year read as 20xx. With the default of 68, `68` is 2068
   * and `69` is 1969, matching the POSIX convention.
   */
  readonly twoDigitYearPivot?: number;
  /**
   * When true, a fixed-width numeric field still accepts fewer digits than its
   * width as long as a separator follows, so `1/5/2026` parses against
   * `MM/dd/yyyy`. Defaults to true.
   */
  readonly lenient?: boolean;
  /**
   * When true, a bare `yyyy-MM-dd` string parses regardless of the configured
   * format. This makes pasting an ISO date from an API response just work.
   * Defaults to true.
   */
  readonly acceptIso?: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Reads `text` as a date in `format`.
 *
 * The parser is deliberately shape-driven rather than regex-driven, so the same
 * token table that renders and masks a format is the one that reads it back.
 */
export function parseDate(
  text: string,
  format: string,
  options: AvParseOptions = {},
): AvParseResult {
  const {
    names = AV_DEFAULT_NAMES,
    twoDigitYearPivot = 68,
    lenient = true,
    acceptIso = true,
  } = options;

  const trimmed = text.trim();
  if (!trimmed) return { status: 'empty' };

  if (acceptIso) {
    const iso = ISO_DATE.exec(trimmed);
    if (iso) {
      return build(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    }
  }

  const spec = maskSpecFor(format);

  // A run of bare digits the exact width of the mask is a paste of the same
  // date without separators, so read it positionally.
  if (spec.maskable && /^\d+$/.test(trimmed) && trimmed.length === spec.totalDigits) {
    let y: number | null = null;
    let m: number | null = null;
    let d: number | null = null;
    for (const field of spec.fields) {
      const value = Number(trimmed.slice(field.digitStart, field.digitEnd));
      if (field.kind === 'year')
        y = field.width === 2 ? expandTwoDigitYear(value, twoDigitYearPivot) : value;
      else if (field.kind === 'month') m = value;
      else d = value;
    }
    const now = new Date();
    return build(y ?? now.getFullYear(), m ?? now.getMonth() + 1, d ?? 1);
  }

  const tokens = spec.tokens;
  let cursor = 0;
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let yearWidth = 4;

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]!;

    if (token.type === 'literal') {
      cursor = consumeLiteral(trimmed, cursor, token.raw);
      if (cursor < 0) return invalid('format');
      continue;
    }

    const letter = token.raw[0];
    const run = token.raw.length;

    if (letter === 'E') {
      // Weekday names carry no value; accept and discard one if it is there.
      cursor =
        consumeName(trimmed, cursor, [...names.weekdaysLong, ...names.weekdaysShort]) ?? cursor;
      continue;
    }

    if (letter === 'M' && run >= 3) {
      // Match long and short names together and keep the longest hit, so
      // "February" is not cut short by the "Feb" that also matches it. Users
      // type both widths whatever the format asks for.
      const candidates = [...names.monthsLong, ...names.monthsShort];
      const matched = matchName(trimmed, cursor, candidates);
      if (!matched) return invalid('format');
      month = (matched.index % 12) + 1;
      cursor = matched.next;
      continue;
    }

    if (letter !== 'y' && letter !== 'M' && letter !== 'd') {
      // An unsupported token: require it verbatim rather than guess.
      cursor = consumeLiteral(trimmed, cursor, token.raw);
      if (cursor < 0) return invalid('format');
      continue;
    }

    const max = letter === 'y' ? (run === 2 ? 2 : Math.max(run, 4)) : 2;
    const min = lenient || !token.fixed ? 1 : run;
    const read = consumeDigits(trimmed, cursor, min, max);
    if (!read) return invalid('format');
    cursor = read.next;

    if (letter === 'y') {
      yearWidth = read.text.length;
      year = Number(read.text);
    } else if (letter === 'M') {
      month = Number(read.text);
    } else {
      day = Number(read.text);
    }
  }

  // Anything left over means the text was not exhausted by the format.
  if (trimmed.slice(cursor).trim().length > 0) return invalid('format');

  if (year === null && month === null && day === null) return invalid('format');

  const now = new Date();
  const resolvedYear =
    year === null
      ? now.getFullYear()
      : yearWidth <= 2
        ? expandTwoDigitYear(year, twoDigitYearPivot)
        : year;

  return build(resolvedYear, month ?? now.getMonth() + 1, day ?? 1);
}

function build(year: number, month: number, day: number): AvParseResult {
  if (month < 1 || month > 12) return invalid('nonexistent');
  if (day < 1 || day > daysInMonth(year, month - 1)) return invalid('nonexistent');
  if (year < 1 || year > 9999) return invalid('nonexistent');
  return { status: 'ok', date: makeDate(year, month - 1, day) };
}

function invalid(reason: AvParseFailure): AvParseResult {
  return { status: 'invalid', reason };
}

/**
 * Matches a literal run.
 *
 * Separators are matched loosely: where the format wants `/`, any run of
 * punctuation or whitespace will do, so `2026-01-05` parses against
 * `yyyy/MM/dd`. Letters and digits in a literal still have to match exactly.
 */
function consumeLiteral(text: string, start: number, literal: string): number {
  const wantsLoose = /^[^A-Za-z0-9]+$/.test(literal);
  if (wantsLoose) {
    let i = start;
    while (i < text.length && /[^A-Za-z0-9]/.test(text[i]!)) i++;
    // A missing separator is tolerated only at the very end of the input.
    if (i === start && start < text.length) return -1;
    return i;
  }
  if (text.startsWith(literal, start)) return start + literal.length;
  return -1;
}

function consumeDigits(
  text: string,
  start: number,
  min: number,
  max: number,
): { text: string; next: number } | null {
  let i = start;
  while (
    i < text.length &&
    i - start < max &&
    text.charCodeAt(i) >= 48 &&
    text.charCodeAt(i) <= 57
  ) {
    i++;
  }
  const length = i - start;
  if (length < min || length === 0) return null;
  return { text: text.slice(start, i), next: i };
}

function matchName(
  text: string,
  start: number,
  candidates: readonly string[],
): { index: number; next: number } | null {
  const rest = text.slice(start).toLowerCase();
  let bestIndex = -1;
  let bestLength = 0;
  for (let i = 0; i < candidates.length; i++) {
    const lower = candidates[i]!.toLowerCase();
    if (rest.startsWith(lower) && lower.length > bestLength) {
      bestIndex = i;
      bestLength = lower.length;
    }
  }
  return bestIndex < 0 ? null : { index: bestIndex, next: start + bestLength };
}

function consumeName(text: string, start: number, candidates: readonly string[]): number | null {
  const matched = matchName(text, start, candidates);
  return matched ? matched.next : null;
}
