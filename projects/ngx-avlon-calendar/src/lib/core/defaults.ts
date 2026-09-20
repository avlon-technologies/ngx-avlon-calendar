import {
  InjectionToken,
  type EnvironmentProviders,
  type Provider,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  AV_DATE_LOCALE,
  AV_FIRST_DAY_OF_WEEK,
  AvDateAdapter,
  AvNativeDateAdapter,
} from './date-adapter';
import type {
  AvErrorMessages,
  AvFieldVariant,
  AvFloatLabel,
  AvIconPosition,
  AvOpenTrigger,
  AvSize,
  AvValueMode,
} from './types';

/**
 * Application-wide defaults for every picker and calendar.
 *
 * Every field here also exists as a component input. The token exists so a
 * design system can set the house style once instead of repeating it on a
 * hundred templates, and so a component input always wins locally.
 */
export interface AvCalendarConfig {
  /** Display and mask format. Default `MM/dd/yyyy`. */
  displayFormat: string;
  /** Shape of the value handed to the form control. Default `date`. */
  valueMode: AvValueMode;
  /** Format used when `valueMode` is `formatted`. Defaults to `displayFormat`. */
  valueFormat: string | null;
  /** Show the full mask as a placeholder while typing. Default false. */
  showMaskPlaceholder: boolean;
  /** Highest two-digit year read as 20xx. Default 68. */
  twoDigitYearPivot: number;
  /** Where the calendar toggle sits. Default `right`. */
  iconPosition: AvIconPosition;
  /** Field chrome. Default `outlined`. */
  variant: AvFieldVariant;
  /** Control density. Default `md`. */
  size: AvSize;
  /** What opens the panel. Default `icon`. */
  openOn: AvOpenTrigger;
  /** Label float behaviour. Default `auto`. */
  floatLabel: AvFloatLabel;
  /** Show a clear button once a value is present. Default false. */
  clearable: boolean;
  /** Theme class applied to the field and the panel. Default `av-theme-default`. */
  theme: string;
  /** Number of months the panel shows side by side. Default 1. */
  numberOfMonths: number;
  /** Show ISO week numbers in the day grid. Default false. */
  showWeekNumbers: boolean;
  /** Show the Today / Clear footer. Default true. */
  showFooter: boolean;
  /** Keep the panel open after a day is picked. Default false. */
  keepOpenOnSelect: boolean;
  /** Messages shown for each validation error code. */
  errorMessages: AvErrorMessages;
}

export const AV_DEFAULT_ERROR_MESSAGES: AvErrorMessages = {
  required: 'A date is required.',
  avDateInvalid: 'Enter a valid date.',
  avDateMin: 'Choose a date on or after {min}.',
  avDateMax: 'Choose a date on or before {max}.',
  avDateDisabled: 'That date is not available.',
};

export const AV_CALENDAR_DEFAULT_CONFIG: AvCalendarConfig = {
  displayFormat: 'MM/dd/yyyy',
  valueMode: 'date',
  valueFormat: null,
  showMaskPlaceholder: false,
  twoDigitYearPivot: 68,
  iconPosition: 'right',
  variant: 'outlined',
  size: 'md',
  openOn: 'icon',
  floatLabel: 'auto',
  clearable: false,
  theme: 'av-theme-default',
  numberOfMonths: 1,
  showWeekNumbers: false,
  showFooter: true,
  keepOpenOnSelect: false,
  errorMessages: AV_DEFAULT_ERROR_MESSAGES,
};

export const AV_CALENDAR_DEFAULTS = new InjectionToken<AvCalendarConfig>('AV_CALENDAR_DEFAULTS', {
  providedIn: 'root',
  factory: () => AV_CALENDAR_DEFAULT_CONFIG,
});

export interface AvlonCalendarOptions extends Partial<AvCalendarConfig> {
  /** BCP-47 locale for month and weekday names. Defaults to `LOCALE_ID`. */
  locale?: string;
  /** 0 (Sunday) through 6 (Saturday). Defaults to the locale's own convention. */
  firstDayOfWeek?: number;
  /** Swap in a custom adapter for names, week shape, formatting, or parsing. */
  dateAdapter?: Provider;
}

/**
 * Registers the calendar's defaults and date adapter for the application.
 *
 * Calling this is optional: every component works with no providers at all.
 * Reach for it when you want a house style, a non-default locale, or a custom
 * adapter.
 */
export function provideAvlonCalendar(options: AvlonCalendarOptions = {}): EnvironmentProviders {
  const { locale, firstDayOfWeek, dateAdapter, ...config } = options;

  const providers: Provider[] = [
    dateAdapter ?? { provide: AvDateAdapter, useClass: AvNativeDateAdapter },
    {
      provide: AV_CALENDAR_DEFAULTS,
      useValue: mergeConfig(AV_CALENDAR_DEFAULT_CONFIG, config),
    },
  ];

  if (locale !== undefined) providers.push({ provide: AV_DATE_LOCALE, useValue: locale });
  if (firstDayOfWeek !== undefined) {
    providers.push({ provide: AV_FIRST_DAY_OF_WEEK, useValue: firstDayOfWeek });
  }

  return makeEnvironmentProviders(providers);
}

/** Shallow-merges an override over a base config, deep-merging error messages. */
export function mergeConfig(
  base: AvCalendarConfig,
  override: Partial<AvCalendarConfig>,
): AvCalendarConfig {
  return {
    ...base,
    ...override,
    errorMessages: { ...base.errorMessages, ...(override.errorMessages ?? {}) },
  };
}
