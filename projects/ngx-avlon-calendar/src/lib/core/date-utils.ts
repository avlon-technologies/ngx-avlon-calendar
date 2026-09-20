/**
 * Small, dependency-free date helpers.
 *
 * Every date this library produces is a native `Date` pinned to **local
 * midnight**. Times are deliberately out of scope: a date picker that quietly
 * carries a time component is the source of most off-by-one-day bugs.
 */

/** Returns a new date at local midnight on the same calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Today at local midnight. */
export function today(): Date {
  return startOfDay(new Date());
}

/** Builds a local-midnight date from calendar parts. Handles years 0-99 correctly. */
export function makeDate(year: number, month: number, day: number): Date {
  const d = new Date(2000, 0, 1);
  d.setFullYear(year, month, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** True when the value is a `Date` representing a real point in time. */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** True when both arguments fall on the same calendar day. */
export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** True when both arguments fall in the same calendar month. */
export function isSameMonth(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Compares two dates by calendar day. Negative when `a` is earlier. */
export function compareDays(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

export function addDays(date: Date, amount: number): Date {
  return makeDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Adds months, clamping the day so 31 Jan + 1 month lands on 28/29 Feb. */
export function addMonths(date: Date, amount: number): Date {
  const targetMonth = date.getMonth() + amount;
  const year = date.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getDate(), daysInMonth(year, month));
  return makeDate(year, month, day);
}

export function addYears(date: Date, amount: number): Date {
  return addMonths(date, amount * 12);
}

export function startOfMonth(date: Date): Date {
  return makeDate(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return makeDate(date.getFullYear(), date.getMonth(), daysInMonth(date.getFullYear(), date.getMonth()));
}

/** Number of days in the given zero-based month. */
export function daysInMonth(year: number, month: number): number {
  return makeDate(year, month + 1, 0).getDate();
}

/** True when `year` is a leap year in the proleptic Gregorian calendar. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Restricts `date` to the inclusive `[min, max]` window. */
export function clampDate(date: Date, min: Date | null, max: Date | null): Date {
  if (min && compareDays(date, min) < 0) return startOfDay(min);
  if (max && compareDays(date, max) > 0) return startOfDay(max);
  return startOfDay(date);
}

/** True when `date` sits inside the inclusive `[min, max]` window. */
export function isWithin(date: Date, min: Date | null, max: Date | null): boolean {
  if (min && compareDays(date, min) < 0) return false;
  if (max && compareDays(date, max) > 0) return false;
  return true;
}

/**
 * The first cell of the six-week grid that contains `month`.
 *
 * `firstDayOfWeek` is 0 for Sunday through 6 for Saturday.
 */
export function startOfCalendarGrid(month: Date, firstDayOfWeek: number): Date {
  const first = startOfMonth(month);
  const offset = (first.getDay() - firstDayOfWeek + 7) % 7;
  return addDays(first, -offset);
}

/** The 42 days of the six-week grid containing `month`. */
export function calendarGrid(month: Date, firstDayOfWeek: number): Date[] {
  const start = startOfCalendarGrid(month, firstDayOfWeek);
  const cells: Date[] = new Array(42);
  for (let i = 0; i < 42; i++) cells[i] = addDays(start, i);
  return cells;
}

/**
 * ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday).
 */
export function isoWeekNumber(date: Date): number {
  const d = makeDate(date.getFullYear(), date.getMonth(), date.getDate());
  // Shift to the Thursday of this ISO week.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstThursday = makeDate(d.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

/** The decade page (of 12 years) that contains `year`, as `[start, end]`. */
export function yearPage(year: number, pageSize = 24): [number, number] {
  const start = Math.floor(year / pageSize) * pageSize;
  return [start, start + pageSize - 1];
}
