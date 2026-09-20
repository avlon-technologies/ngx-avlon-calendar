import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  calendarGrid,
  clampDate,
  compareDays,
  daysInMonth,
  endOfMonth,
  isLeapYear,
  isSameDay,
  isSameMonth,
  isValidDate,
  isWithin,
  isoWeekNumber,
  makeDate,
  startOfCalendarGrid,
  startOfDay,
  startOfMonth,
} from './date-utils';

describe('makeDate', () => {
  it('builds a local-midnight date', () => {
    const d = makeDate(2026, 8, 20);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('keeps two-digit years literal rather than mapping them to the 1900s', () => {
    expect(makeDate(26, 0, 1).getFullYear()).toBe(26);
  });
});

describe('startOfDay', () => {
  it('drops the time component', () => {
    const d = startOfDay(new Date(2026, 8, 20, 23, 59, 59, 999));
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(20);
  });
});

describe('isValidDate', () => {
  it('rejects anything that is not a real date', () => {
    expect(isValidDate(new Date(2026, 0, 1))).toBe(true);
    expect(isValidDate(new Date(Number.NaN))).toBe(false);
    expect(isValidDate('2026-01-01')).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays(makeDate(2026, 0, 31), 1)).toEqual(makeDate(2026, 1, 1));
  });

  it('crosses a year boundary backwards', () => {
    expect(addDays(makeDate(2026, 0, 1), -1)).toEqual(makeDate(2025, 11, 31));
  });

  it('survives a daylight-saving transition without shifting the day', () => {
    // 8 March 2026 is a US spring-forward date.
    const before = makeDate(2026, 2, 7);
    expect(addDays(before, 1).getDate()).toBe(8);
    expect(addDays(before, 1).getHours()).toBe(0);
  });
});

describe('addMonths', () => {
  it('clamps the day when the target month is shorter', () => {
    expect(addMonths(makeDate(2026, 0, 31), 1)).toEqual(makeDate(2026, 1, 28));
    expect(addMonths(makeDate(2024, 0, 31), 1)).toEqual(makeDate(2024, 1, 29));
  });

  it('steps backwards across a year boundary', () => {
    expect(addMonths(makeDate(2026, 0, 15), -1)).toEqual(makeDate(2025, 11, 15));
  });

  it('handles multi-year jumps', () => {
    expect(addMonths(makeDate(2026, 0, 15), 25)).toEqual(makeDate(2028, 1, 15));
    expect(addMonths(makeDate(2026, 0, 15), -25)).toEqual(makeDate(2023, 11, 15));
  });
});

describe('addYears', () => {
  it('clamps 29 February in a non-leap target', () => {
    expect(addYears(makeDate(2024, 1, 29), 1)).toEqual(makeDate(2025, 1, 28));
  });
});

describe('daysInMonth and isLeapYear', () => {
  it('knows the month lengths', () => {
    expect(daysInMonth(2026, 0)).toBe(31);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 3)).toBe(30);
    expect(daysInMonth(2026, 11)).toBe(31);
  });

  it('applies the century rule', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });
});

describe('comparison helpers', () => {
  it('compares by calendar day, ignoring time', () => {
    expect(compareDays(new Date(2026, 0, 1, 23), new Date(2026, 0, 1, 1))).toBe(0);
    expect(compareDays(makeDate(2026, 0, 1), makeDate(2026, 0, 2))).toBeLessThan(0);
  });

  it('matches same days and same months', () => {
    expect(isSameDay(makeDate(2026, 0, 1), new Date(2026, 0, 1, 12))).toBe(true);
    expect(isSameDay(makeDate(2026, 0, 1), null)).toBe(false);
    expect(isSameMonth(makeDate(2026, 0, 1), makeDate(2026, 0, 31))).toBe(true);
    expect(isSameMonth(makeDate(2026, 0, 31), makeDate(2026, 1, 1))).toBe(false);
  });
});

describe('clampDate and isWithin', () => {
  const min = makeDate(2026, 0, 10);
  const max = makeDate(2026, 0, 20);

  it('pulls a date into range', () => {
    expect(clampDate(makeDate(2026, 0, 1), min, max)).toEqual(min);
    expect(clampDate(makeDate(2026, 0, 25), min, max)).toEqual(max);
    expect(clampDate(makeDate(2026, 0, 15), min, max)).toEqual(makeDate(2026, 0, 15));
  });

  it('treats the bounds as inclusive', () => {
    expect(isWithin(min, min, max)).toBe(true);
    expect(isWithin(max, min, max)).toBe(true);
    expect(isWithin(addDays(max, 1), min, max)).toBe(false);
  });

  it('accepts an open-ended range', () => {
    expect(isWithin(makeDate(1900, 0, 1), null, max)).toBe(true);
    expect(isWithin(makeDate(2999, 0, 1), min, null)).toBe(true);
  });
});

describe('calendarGrid', () => {
  it('always produces six weeks', () => {
    expect(calendarGrid(makeDate(2026, 8, 1), 0)).toHaveLength(42);
  });

  it('starts on the configured first day of week', () => {
    // 1 September 2026 is a Tuesday.
    const sundayFirst = startOfCalendarGrid(makeDate(2026, 8, 1), 0);
    expect(sundayFirst.getDay()).toBe(0);
    expect(sundayFirst).toEqual(makeDate(2026, 7, 30));

    const mondayFirst = startOfCalendarGrid(makeDate(2026, 8, 1), 1);
    expect(mondayFirst.getDay()).toBe(1);
    expect(mondayFirst).toEqual(makeDate(2026, 7, 31));
  });

  it('includes every day of the month', () => {
    const grid = calendarGrid(makeDate(2026, 1, 1), 0);
    const inMonth = grid.filter((d) => d.getMonth() === 1);
    expect(inMonth).toHaveLength(28);
  });

  it('starts a month that begins on the first-day-of-week without a leading week', () => {
    // 1 February 2026 is a Sunday.
    expect(startOfCalendarGrid(makeDate(2026, 1, 1), 0)).toEqual(makeDate(2026, 1, 1));
  });
});

describe('month boundaries', () => {
  it('finds the first and last day', () => {
    expect(startOfMonth(makeDate(2026, 1, 15))).toEqual(makeDate(2026, 1, 1));
    expect(endOfMonth(makeDate(2026, 1, 15))).toEqual(makeDate(2026, 1, 28));
    expect(endOfMonth(makeDate(2024, 1, 15))).toEqual(makeDate(2024, 1, 29));
  });
});

describe('isoWeekNumber', () => {
  it('matches the ISO-8601 definition at year boundaries', () => {
    // 2026-01-01 is a Thursday, so it belongs to week 1 of 2026.
    expect(isoWeekNumber(makeDate(2026, 0, 1))).toBe(1);
    // 2027-01-01 is a Friday, so it belongs to week 53 of 2026.
    expect(isoWeekNumber(makeDate(2027, 0, 1))).toBe(53);
    // 2026-12-31 is a Thursday, week 53.
    expect(isoWeekNumber(makeDate(2026, 11, 31))).toBe(53);
  });

  it('counts mid-year weeks', () => {
    expect(isoWeekNumber(makeDate(2026, 5, 15))).toBe(25);
  });
});
