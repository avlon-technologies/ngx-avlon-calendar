import { describe, expect, it } from 'vitest';
import { decodeValue, encodeValue, sameEncodedValue, toIsoDate } from './value-codec';
import { makeDate } from './date-utils';
import type { AvValueCodecOptions } from './value-codec';

const base: AvValueCodecOptions = { mode: 'date', valueFormat: 'MM/dd/yyyy' };

describe('decodeValue', () => {
  it('passes a Date through at local midnight', () => {
    const decoded = decodeValue(new Date(2026, 8, 20, 17, 30), base);
    expect(decoded).toEqual(makeDate(2026, 8, 20));
  });

  it('reads an ISO calendar date with no timezone shift', () => {
    expect(decodeValue('2026-09-20', base)).toEqual(makeDate(2026, 8, 20));
  });

  it('reads a timestamp', () => {
    const ms = makeDate(2026, 8, 20).getTime();
    expect(decodeValue(ms, base)).toEqual(makeDate(2026, 8, 20));
  });

  it('reads a string in the value format', () => {
    expect(decodeValue('09/20/2026', base)).toEqual(makeDate(2026, 8, 20));
  });

  it('treats empty and missing values as no date', () => {
    expect(decodeValue(null, base)).toBeNull();
    expect(decodeValue(undefined, base)).toBeNull();
    expect(decodeValue('', base)).toBeNull();
  });

  it('rejects an invalid Date', () => {
    expect(decodeValue(new Date(Number.NaN), base)).toBeNull();
  });

  it('rejects text that is not a date', () => {
    expect(decodeValue('not a date', base)).toBeNull();
  });
});

describe('encodeValue', () => {
  const date = makeDate(2026, 8, 20);

  it('returns a Date in date mode', () => {
    expect(encodeValue(date, base)).toEqual(date);
  });

  it('returns a timezone-free calendar date in iso-date mode', () => {
    expect(encodeValue(date, { ...base, mode: 'iso-date' })).toBe('2026-09-20');
  });

  it('returns a timestamp in timestamp mode', () => {
    expect(encodeValue(date, { ...base, mode: 'timestamp' })).toBe(date.getTime());
  });

  it('returns the display format in formatted mode', () => {
    expect(encodeValue(date, { ...base, mode: 'formatted' })).toBe('09/20/2026');
    expect(encodeValue(date, { mode: 'formatted', valueFormat: 'dd.MM.yyyy' })).toBe('20.09.2026');
  });

  it('returns an ISO instant in iso mode', () => {
    expect(encodeValue(date, { ...base, mode: 'iso' })).toBe(date.toISOString());
  });

  it('returns null for a missing date in every mode', () => {
    for (const mode of ['date', 'iso-date', 'iso', 'timestamp', 'formatted'] as const) {
      expect(encodeValue(null, { ...base, mode })).toBeNull();
    }
  });
});

describe('round trips', () => {
  it('survives encode then decode in every mode', () => {
    const date = makeDate(2026, 1, 29 - 1); // 28 February 2026
    for (const mode of ['date', 'iso-date', 'iso', 'timestamp', 'formatted'] as const) {
      const options = { ...base, mode };
      const encoded = encodeValue(date, options);
      expect(decodeValue(encoded, options), `mode ${mode}`).toEqual(date);
    }
  });
});

describe('toIsoDate', () => {
  it('pads every component', () => {
    expect(toIsoDate(makeDate(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(makeDate(890, 0, 5))).toBe('0890-01-05');
  });
});

describe('sameEncodedValue', () => {
  it('compares dates by instant, not identity', () => {
    expect(sameEncodedValue(makeDate(2026, 0, 1), makeDate(2026, 0, 1))).toBe(true);
    expect(sameEncodedValue(makeDate(2026, 0, 1), makeDate(2026, 0, 2))).toBe(false);
  });

  it('compares everything else by value', () => {
    expect(sameEncodedValue('2026-01-01', '2026-01-01')).toBe(true);
    expect(sameEncodedValue(null, null)).toBe(true);
    expect(sameEncodedValue(null, '2026-01-01')).toBe(false);
  });
});
