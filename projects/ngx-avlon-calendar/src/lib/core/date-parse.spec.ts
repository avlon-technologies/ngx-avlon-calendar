import { describe, expect, it } from 'vitest';
import { parseDate } from './date-parse';
import { makeDate } from './date-utils';

function ok(text: string, format: string): Date {
  const result = parseDate(text, format);
  expect(result.status, `expected "${text}" to parse as ${format}`).toBe('ok');
  return (result as { date: Date }).date;
}

function fails(text: string, format: string): string {
  const result = parseDate(text, format);
  expect(result.status, `expected "${text}" to fail as ${format}`).toBe('invalid');
  return (result as { reason: string }).reason;
}

describe('parseDate', () => {
  it('reads a complete date in the configured format', () => {
    expect(ok('12/31/2026', 'MM/dd/yyyy')).toEqual(makeDate(2026, 11, 31));
    expect(ok('31.12.2026', 'dd.MM.yyyy')).toEqual(makeDate(2026, 11, 31));
    expect(ok('2026-12-31', 'yyyy-MM-dd')).toEqual(makeDate(2026, 11, 31));
  });

  it('treats an empty string as no value rather than an error', () => {
    expect(parseDate('', 'MM/dd/yyyy').status).toBe('empty');
    expect(parseDate('   ', 'MM/dd/yyyy').status).toBe('empty');
  });

  it('accepts unpadded numbers', () => {
    expect(ok('1/5/2026', 'MM/dd/yyyy')).toEqual(makeDate(2026, 0, 5));
  });

  it('accepts any separator where one is expected', () => {
    expect(ok('12-31-2026', 'MM/dd/yyyy')).toEqual(makeDate(2026, 11, 31));
    expect(ok('12 31 2026', 'MM/dd/yyyy')).toEqual(makeDate(2026, 11, 31));
  });

  it('reads a run of bare digits positionally', () => {
    expect(ok('12312026', 'MM/dd/yyyy')).toEqual(makeDate(2026, 11, 31));
    expect(ok('31122026', 'dd/MM/yyyy')).toEqual(makeDate(2026, 11, 31));
  });

  it('accepts a pasted ISO date whatever the format says', () => {
    expect(ok('2026-12-31', 'MM/dd/yyyy')).toEqual(makeDate(2026, 11, 31));
  });

  it('reads month names in either width', () => {
    expect(ok('January 5, 2026', 'MMMM d, yyyy')).toEqual(makeDate(2026, 0, 5));
    expect(ok('Jan 5, 2026', 'MMMM d, yyyy')).toEqual(makeDate(2026, 0, 5));
    expect(ok('5 Feb 2026', 'd MMM yyyy')).toEqual(makeDate(2026, 1, 5));
  });

  it('reads month names case-insensitively', () => {
    expect(ok('5 february 2026', 'd MMM yyyy')).toEqual(makeDate(2026, 1, 5));
  });

  it('accepts and discards a weekday name', () => {
    expect(ok('Monday, January 5, 2026', 'EEEE, MMMM d, yyyy')).toEqual(makeDate(2026, 0, 5));
  });

  it('rejects a day that does not exist', () => {
    expect(fails('02/30/2026', 'MM/dd/yyyy')).toBe('nonexistent');
    expect(fails('13/01/2026', 'MM/dd/yyyy')).toBe('nonexistent');
    expect(fails('04/31/2026', 'MM/dd/yyyy')).toBe('nonexistent');
  });

  it('knows which Februaries have 29 days', () => {
    expect(ok('02/29/2024', 'MM/dd/yyyy')).toEqual(makeDate(2024, 1, 29));
    expect(fails('02/29/2026', 'MM/dd/yyyy')).toBe('nonexistent');
    expect(fails('02/29/1900', 'MM/dd/yyyy')).toBe('nonexistent');
    expect(ok('02/29/2000', 'MM/dd/yyyy')).toEqual(makeDate(2000, 1, 29));
  });

  it('rejects text that does not fit the format', () => {
    expect(fails('tomorrow', 'MM/dd/yyyy')).toBe('format');
    expect(fails('12/31/2026 extra', 'MM/dd/yyyy')).toBe('format');
  });

  it('applies the two-digit year pivot', () => {
    expect(ok('05/01/68', 'MM/dd/yy')).toEqual(makeDate(2068, 4, 1));
    expect(ok('05/01/69', 'MM/dd/yy')).toEqual(makeDate(1969, 4, 1));
  });

  it('honours a custom pivot', () => {
    expect(parseDate('05/01/40', 'MM/dd/yy', { twoDigitYearPivot: 30 })).toEqual({
      status: 'ok',
      date: makeDate(1940, 4, 1),
    });
  });

  it('can be told to reject unpadded numbers', () => {
    expect(parseDate('1/5/2026', 'MM/dd/yyyy', { lenient: false }).status).toBe('invalid');
  });

  it('can be told to ignore pasted ISO dates', () => {
    expect(parseDate('2026-12-31', 'MM/dd/yyyy', { acceptIso: false }).status).toBe('invalid');
  });

  it('never produces a date outside the Gregorian range it renders', () => {
    expect(fails('01/01/0000', 'MM/dd/yyyy')).toBe('nonexistent');
  });
});
