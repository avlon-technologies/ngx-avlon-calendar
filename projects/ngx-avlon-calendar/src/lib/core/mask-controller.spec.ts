import { beforeEach, describe, expect, it } from 'vitest';
import { AvMaskController, type AvMaskOptions } from './mask-controller';
import { makeDate } from './date-utils';

/**
 * These tests drive a real `input` element the way a browser would: apply the
 * edit first, then hand the element to the controller to normalize. That keeps
 * the assertions honest about caret behaviour, which is where masks usually go
 * wrong.
 */

let el: HTMLInputElement;
let options: AvMaskOptions;
let mask: AvMaskController;

const REFERENCE = makeDate(2026, 5, 15); // 15 June 2026

beforeEach(() => {
  el = document.createElement('input');
  document.body.appendChild(el);
  options = {
    format: 'MM/dd/yyyy',
    showMaskPlaceholder: false,
    twoDigitYearPivot: 68,
    autoPad: true,
  };
  mask = new AvMaskController(() => options);
});

/** Types characters one at a time, exactly as a browser would deliver them. */
function type(text: string): void {
  for (const ch of text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.value = el.value.slice(0, start) + ch + el.value.slice(end);
    el.setSelectionRange(start + 1, start + 1);
    mask.onInput(el, 'insertText');
  }
}

/** Presses Backspace: keydown assist, then the browser's own deletion. */
function backspace(): void {
  const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
  mask.onKeydown(el, event, REFERENCE);

  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  if (start === end) {
    if (start === 0) return;
    el.value = el.value.slice(0, start - 1) + el.value.slice(start);
    el.setSelectionRange(start - 1, start - 1);
  } else {
    el.value = el.value.slice(0, start) + el.value.slice(end);
    el.setSelectionRange(start, start);
  }
  mask.onInput(el, 'deleteContentBackward');
}

function paste(text: string): void {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? start;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  el.setSelectionRange(start + text.length, start + text.length);
  mask.onInput(el, 'insertFromPaste');
}

describe('typing', () => {
  it('inserts separators as fields complete', () => {
    type('1');
    expect(el.value).toBe('1');
    type('2');
    expect(el.value).toBe('12/');
    expect(el.selectionStart).toBe(3);
    type('31');
    expect(el.value).toBe('12/31/');
    type('2026');
    expect(el.value).toBe('12/31/2026');
  });

  it('ignores characters that are not digits', () => {
    type('ab12cd31ef2026');
    expect(el.value).toBe('12/31/2026');
  });

  it('refuses input past the capacity of the mask', () => {
    type('123120269999');
    expect(el.value).toBe('12/31/2026');
  });

  it('completes a month from a single unambiguous digit', () => {
    type('5');
    expect(el.value).toBe('05/');
    expect(el.selectionStart).toBe(3);
  });

  it('waits on an ambiguous first digit', () => {
    type('1');
    expect(el.value).toBe('1');
  });

  it('completes a day from a single unambiguous digit', () => {
    type('12');
    type('7');
    expect(el.value).toBe('12/07/');
  });

  it('can have auto-completion turned off', () => {
    options = { ...options, autoPad: false };
    type('5');
    expect(el.value).toBe('5');
  });

  it('respects a day-first format', () => {
    options = { ...options, format: 'dd.MM.yyyy' };
    type('31122026');
    expect(el.value).toBe('31.12.2026');
  });
});

describe('deleting', () => {
  it('steps over a separator instead of stalling on it', () => {
    type('12312026');
    expect(el.value).toBe('12/31/2026');

    for (let i = 0; i < 4; i++) backspace();
    expect(el.value).toBe('12/31/');

    // The next press must remove a digit, not sit on the slash forever.
    backspace();
    expect(el.value).toBe('12/3');
  });

  it('empties the field completely', () => {
    type('12312026');
    for (let i = 0; i < 12; i++) backspace();
    expect(el.value).toBe('');
  });

  it('keeps the caret tight against the remaining digits', () => {
    type('1231');
    expect(el.value).toBe('12/31/');
    backspace();
    expect(el.value).toBe('12/3');
    expect(el.selectionStart).toBe(4);
  });

  it('removes a selected run of digits', () => {
    type('12312026');
    el.setSelectionRange(0, 5);
    backspace();
    // The remaining digits re-flow from the left, and the trailing separator
    // stays because the next field is where typing would resume.
    expect(el.value).toBe('20/26/');
  });

  it('trims a dangling separator from incomplete text', () => {
    type('1231');
    expect(el.value).toBe('12/31/');
    expect(mask.tidy(el.value)).toBe('12/31');
  });
});

describe('pasting', () => {
  it('accepts a formatted date', () => {
    paste('12/31/2026');
    expect(el.value).toBe('12/31/2026');
  });

  it('accepts a date written with other separators', () => {
    paste('31-12-2026');
    options = { ...options, format: 'dd/MM/yyyy' };
    expect(mask.render('31-12-2026')).toBe('31/12/2026');
  });

  it('accepts bare digits', () => {
    paste('12312026');
    expect(el.value).toBe('12/31/2026');
  });

  it('discards trailing noise', () => {
    paste('12/31/2026T00:00:00');
    expect(el.value).toBe('12/31/2026');
  });
});

describe('arrow stepping', () => {
  it('increments the field the caret sits in', () => {
    type('06152026');
    el.setSelectionRange(0, 0);
    mask.step(el, 1, REFERENCE);
    expect(el.value).toBe('07/15/2026');
  });

  it('selects the field it just changed', () => {
    type('06152026');
    el.setSelectionRange(0, 0);
    mask.step(el, 1, REFERENCE);
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(2);
  });

  it('steps the day when the caret is in the day field', () => {
    type('06152026');
    el.setSelectionRange(3, 3);
    mask.step(el, 1, REFERENCE);
    expect(el.value).toBe('06/16/2026');
  });

  it('steps the year when the caret is in the year field', () => {
    type('06152026');
    el.setSelectionRange(6, 6);
    mask.step(el, -1, REFERENCE);
    expect(el.value).toBe('06/15/2025');
  });

  it('wraps a month past December', () => {
    type('12152026');
    el.setSelectionRange(1, 1);
    mask.step(el, 1, REFERENCE);
    expect(el.value).toBe('01/15/2026');
  });

  it('starts an empty field from the reference date', () => {
    el.setSelectionRange(0, 0);
    mask.step(el, 1, REFERENCE);
    expect(el.value).toBe('06/');
  });
});

describe('unmaskable formats', () => {
  beforeEach(() => {
    options = { ...options, format: 'MMM d, yyyy' };
  });

  it('leaves the text alone', () => {
    el.value = 'Jan 5, 2026';
    el.setSelectionRange(11, 11);
    expect(mask.onInput(el, 'insertText')).toBe('Jan 5, 2026');
  });

  it('reports itself as disabled', () => {
    expect(mask.enabled).toBe(false);
  });

  it('does nothing on an arrow step', () => {
    el.value = 'Jan 5, 2026';
    expect(mask.step(el, 1, REFERENCE)).toBeNull();
  });
});

describe('placeholder fill mode', () => {
  beforeEach(() => {
    options = { ...options, showMaskPlaceholder: true };
  });

  it('shows the whole mask as soon as typing starts', () => {
    type('12');
    expect(el.value).toBe('12/dd/yyyy');
  });

  it('puts the caret on the next empty slot', () => {
    type('12');
    expect(el.selectionStart).toBe(3);
  });

  it('fills in progressively', () => {
    type('1231');
    expect(el.value).toBe('12/31/yyyy');
  });
});

describe('placeholder text', () => {
  it('derives a hint from the format', () => {
    expect(mask.placeholder).toBe('mm/dd/yyyy');
    options = { ...options, format: 'dd.MM.yy' };
    expect(mask.placeholder).toBe('dd.mm.yy');
  });
});
