import { Injectable, InjectionToken, LOCALE_ID, inject } from '@angular/core';
import { AV_DEFAULT_NAMES, formatDate, type AvDateNames } from './date-format';
import { parseDate, type AvParseOptions, type AvParseResult } from './date-parse';
import { startOfDay } from './date-utils';

/** Overrides the locale the default adapter uses, independent of `LOCALE_ID`. */
export const AV_DATE_LOCALE = new InjectionToken<string>('AV_DATE_LOCALE');

/**
 * Override for the first day of the week, 0 (Sunday) through 6 (Saturday).
 * When absent the adapter asks the runtime, then falls back to Sunday.
 */
export const AV_FIRST_DAY_OF_WEEK = new InjectionToken<number>('AV_FIRST_DAY_OF_WEEK');

interface WeekInfoCapable {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
}

/**
 * Locale-facing seam.
 *
 * Everything the calendar needs to know about *words* and *week shape* lives
 * here, so a consumer can swap in their own names, first day of week, or
 * parsing strategy without forking a component. The value type stays a native
 * `Date` throughout: this is a seam for localization, not a second date
 * library.
 *
 * Resolves to {@link AvNativeDateAdapter} unless an application provides its
 * own, so nothing has to be configured for the common case.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => inject(AvNativeDateAdapter),
})
export abstract class AvDateAdapter {
  /** BCP-47 tag the adapter localizes to. */
  abstract readonly locale: string;

  /** Month and weekday names used for display and for parsing `MMM`/`MMMM`. */
  abstract names(): AvDateNames;

  /** 0 for Sunday through 6 for Saturday. */
  abstract firstDayOfWeek(): number;

  /** Renders a date with the given format string. */
  abstract format(date: Date | null, format: string): string;

  /** Reads a date from text written in the given format. */
  abstract parse(text: string, format: string, options?: AvParseOptions): AvParseResult;

  /** Today, at local midnight. */
  today(): Date {
    return startOfDay(new Date());
  }

  /** Long-form label for a date, used by screen-reader announcements. */
  describe(date: Date): string {
    return this.format(date, 'EEEE, MMMM d, yyyy');
  }
}

/**
 * The default adapter: native `Date` plus `Intl` for names and week shape.
 *
 * Name lookup is memoized per instance because `Intl.DateTimeFormat`
 * construction is not cheap and the calendar re-renders often.
 */
@Injectable({ providedIn: 'root' })
export class AvNativeDateAdapter extends AvDateAdapter {
  private readonly weekStart = inject(AV_FIRST_DAY_OF_WEEK, { optional: true });
  override readonly locale =
    inject(AV_DATE_LOCALE, { optional: true }) ?? inject(LOCALE_ID, { optional: true }) ?? 'en-US';

  private cachedNames: AvDateNames | null = null;

  override names(): AvDateNames {
    this.cachedNames ??= buildNames(this.locale);
    return this.cachedNames;
  }

  override firstDayOfWeek(): number {
    return this.weekStart ?? detectFirstDayOfWeek(this.locale);
  }

  override format(date: Date | null, format: string): string {
    return formatDate(date, format, this.names());
  }

  override parse(text: string, format: string, options: AvParseOptions = {}): AvParseResult {
    return parseDate(text, format, { names: this.names(), ...options });
  }
}

/** Builds a name bundle from `Intl`, falling back to English if it is missing. */
export function buildNames(locale: string): AvDateNames {
  try {
    const monthName = (style: 'long' | 'short') => {
      const fmt = new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' });
      return Array.from({ length: 12 }, (_, m) => fmt.format(Date.UTC(2021, m, 15)));
    };
    const weekdayName = (style: 'long' | 'short' | 'narrow') => {
      const fmt = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' });
      // 2021-08-01 was a Sunday, so the run starts at index 0 = Sunday.
      return Array.from({ length: 7 }, (_, d) => fmt.format(Date.UTC(2021, 7, 1 + d)));
    };
    return {
      monthsLong: monthName('long'),
      monthsShort: monthName('short'),
      weekdaysLong: weekdayName('long'),
      weekdaysShort: weekdayName('short'),
      weekdaysNarrow: weekdayName('narrow'),
    };
  } catch {
    return AV_DEFAULT_NAMES;
  }
}

/**
 * Asks the runtime where the week starts.
 *
 * `Intl.Locale#getWeekInfo` reports 1 for Monday through 7 for Sunday, which is
 * shifted from the `Date#getDay` convention this library uses everywhere else.
 */
export function detectFirstDayOfWeek(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as unknown as WeekInfoCapable;
    const firstDay =
      typeof info.getWeekInfo === 'function' ? info.getWeekInfo().firstDay : info.weekInfo?.firstDay;
    if (typeof firstDay === 'number') return firstDay % 7;
  } catch {
    // Older runtimes have no week info; Sunday is the safest default.
  }
  return 0;
}
