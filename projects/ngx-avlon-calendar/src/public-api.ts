/**
 * ngx-avlon-calendar
 *
 * An Angular date picker built on Tailwind CSS, with format-driven input
 * masking, real validation, a themable calendar, and a presentation layer that
 * bends to the surrounding design rather than the other way round.
 */

// Components and directives
export { AvCalendar } from './lib/calendar/av-calendar';
export type { AvChoiceCell, AvDayCell, AvMonthModel, AvWeekRow } from './lib/calendar/av-calendar';
export { AvDatePicker } from './lib/datepicker/av-date-picker';
export { AvDateMask } from './lib/datepicker/av-date-mask.directive';

// Configuration
export {
  AV_CALENDAR_DEFAULTS,
  AV_CALENDAR_DEFAULT_CONFIG,
  AV_DEFAULT_ERROR_MESSAGES,
  mergeConfig,
  provideAvlonCalendar,
} from './lib/core/defaults';
export type { AvCalendarConfig, AvlonCalendarOptions } from './lib/core/defaults';

// Date adapter
export {
  AV_DATE_LOCALE,
  AV_FIRST_DAY_OF_WEEK,
  AvDateAdapter,
  AvNativeDateAdapter,
  buildNames,
  detectFirstDayOfWeek,
} from './lib/core/date-adapter';

// Formatting, parsing and masking
export {
  AV_DEFAULT_NAMES,
  buildMaskSpec,
  caretForDigits,
  countDigitsBefore,
  expandTwoDigitYear,
  extractDigits,
  fieldAtDigitIndex,
  formatDate,
  maskSpecFor,
  renderMask,
  selectionForField,
  shouldAutoPad,
  stepFieldDigits,
  tokenizeFormat,
  wrapNumber,
} from './lib/core/date-format';
export type { AvDateNames } from './lib/core/date-format';
export { parseDate } from './lib/core/date-parse';
export type { AvParseFailure, AvParseOptions, AvParseResult } from './lib/core/date-parse';
export { AvMaskController } from './lib/core/mask-controller';
export type { AvMaskOptions } from './lib/core/mask-controller';

// Value translation
export { decodeValue, encodeValue, sameEncodedValue, toIsoDate } from './lib/core/value-codec';
export type { AvValueCodecOptions } from './lib/core/value-codec';

// Date helpers
export {
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
  today,
  yearPage,
} from './lib/core/date-utils';

// Validators
export {
  avDateFilter,
  avDateMax,
  avDateMin,
  avDateRange,
  avDateValid,
} from './lib/validators/date-validators';
export type { AvDateBound } from './lib/validators/date-validators';

// Types
export type {
  AvCalendarView,
  AvDateFilter,
  AvDayCellContext,
  AvErrorMessages,
  AvFieldKind,
  AvFieldVariant,
  AvFloatLabel,
  AvFormatToken,
  AvIconPosition,
  AvMaskField,
  AvMaskRender,
  AvMaskSpec,
  AvOpenTrigger,
  AvSize,
  AvValueMode,
} from './lib/core/types';
