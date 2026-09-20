import { formatDate, type AvDateNames } from './date-format';
import { parseDate } from './date-parse';
import { isValidDate, makeDate, startOfDay } from './date-utils';
import type { AvValueMode } from './types';

/**
 * Translation between the `Date` the calendar works in and whatever shape the
 * surrounding form wants to hold.
 *
 * Most APIs do not want a `Date`. Forcing one on the consumer, then making them
 * write a mapping layer on both sides of every form, is the single most common
 * friction point with date pickers, so the value shape is configurable.
 */

export interface AvValueCodecOptions {
  readonly mode: AvValueMode;
  /** Format used by the `formatted` mode. */
  readonly valueFormat: string;
  readonly names?: AvDateNames;
}

/** Turns a control value of any supported shape into a local-midnight `Date`. */
export function decodeValue(value: unknown, options: AvValueCodecOptions): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return isValidDate(value) ? startOfDay(value) : null;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? startOfDay(date) : null;
  }

  if (typeof value === 'string') {
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (isoDate) {
      return makeDate(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    }

    // A full ISO instant: take the local calendar day it falls on.
    const instant = new Date(value);
    if (isValidDate(instant)) return startOfDay(instant);

    const parsed = parseDate(value, options.valueFormat, { names: options.names });
    return parsed.status === 'ok' ? parsed.date : null;
  }

  return null;
}

/** Turns a `Date` into the shape the form control should hold. */
export function encodeValue(date: Date | null, options: AvValueCodecOptions): unknown {
  if (!date || !isValidDate(date)) return null;

  switch (options.mode) {
    case 'iso-date':
      return toIsoDate(date);
    case 'iso':
      return date.toISOString();
    case 'timestamp':
      return date.getTime();
    case 'formatted':
      return formatDate(date, options.valueFormat, options.names);
    case 'date':
    default:
      return startOfDay(date);
  }
}

/** `yyyy-MM-dd` for the local calendar day, with no timezone shift. */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compares two encoded values for equality.
 *
 * Used to suppress no-op `onChange` emissions, which would otherwise mark a
 * pristine form dirty every time the input is reformatted.
 */
export function sameEncodedValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}
