import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { compareDays, isValidDate, startOfDay } from '../core/date-utils';
import { decodeValue } from '../core/value-codec';
import type { AvDateFilter } from '../core/types';

/**
 * Standalone validators.
 *
 * `av-date-picker` applies the equivalent checks itself, so you rarely need
 * these. They are exported because a form sometimes has to state its own rules
 * without a picker present, and because a cross-field rule such as "end must
 * follow start" is easier to express against the same error shapes.
 */

/** A bound date, or a function returning one, so limits can move over time. */
export type AvDateBound = Date | string | number | null | (() => Date | string | number | null);

function resolveBound(bound: AvDateBound): Date | null {
  const raw = typeof bound === 'function' ? bound() : bound;
  return decodeValue(raw, { mode: 'date', valueFormat: 'yyyy-MM-dd' });
}

function readControlDate(control: AbstractControl, valueFormat = 'yyyy-MM-dd'): Date | null {
  return decodeValue(control.value, { mode: 'date', valueFormat });
}

/** Fails with `avDateMin` when the control's date falls before `min`. */
export function avDateMin(min: AvDateBound, valueFormat?: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const bound = resolveBound(min);
    const actual = readControlDate(control, valueFormat);
    if (!bound || !actual) return null;
    return compareDays(actual, bound) < 0
      ? { avDateMin: { min: startOfDay(bound), actual } }
      : null;
  };
}

/** Fails with `avDateMax` when the control's date falls after `max`. */
export function avDateMax(max: AvDateBound, valueFormat?: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const bound = resolveBound(max);
    const actual = readControlDate(control, valueFormat);
    if (!bound || !actual) return null;
    return compareDays(actual, bound) > 0
      ? { avDateMax: { max: startOfDay(bound), actual } }
      : null;
  };
}

/** Fails with `avDateDisabled` when `filter` rejects the control's date. */
export function avDateFilter(filter: AvDateFilter, valueFormat?: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actual = readControlDate(control, valueFormat);
    if (!actual) return null;
    return filter(actual) ? null : { avDateDisabled: { actual } };
  };
}

/**
 * Fails with `avDateInvalid` when the control holds something that is not a
 * usable date. Useful on a plain text control that has no picker attached.
 */
export function avDateValid(valueFormat = 'yyyy-MM-dd'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') return null;
    if (raw instanceof Date && !isValidDate(raw)) return { avDateInvalid: { text: String(raw) } };
    const actual = decodeValue(raw, { mode: 'date', valueFormat });
    return actual ? null : { avDateInvalid: { text: String(raw) } };
  };
}

/**
 * Cross-field rule: the control named `endKey` must not fall before the control
 * named `startKey`. Apply to the group that owns both.
 *
 * The error lands on the group as `avDateRange` and on the end control as
 * `avDateMin`, so a picker bound to the end control shows it without extra work.
 */
export function avDateRange(startKey: string, endKey: string, valueFormat?: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startControl = group.get(startKey);
    const endControl = group.get(endKey);
    if (!startControl || !endControl) return null;

    const start = readControlDate(startControl, valueFormat);
    const end = readControlDate(endControl, valueFormat);
    if (!start || !end) return null;

    if (compareDays(end, start) >= 0) {
      const existing = endControl.errors;
      if (existing?.['avDateMin']) {
        const { avDateMin: _removed, ...rest } = existing;
        endControl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }

    endControl.setErrors({ ...(endControl.errors ?? {}), avDateMin: { min: start, actual: end } });
    return { avDateRange: { start, end } };
  };
}
