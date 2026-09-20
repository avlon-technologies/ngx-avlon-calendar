import { describe, expect, it } from 'vitest';
import {
  buildMaskSpec,
  caretForDigits,
  countDigitsBefore,
  formatDate,
  renderMask,
  selectionForField,
  shouldAutoPad,
  stepFieldDigits,
  tokenizeFormat,
  wrapNumber,
} from './date-format';
import { makeDate } from './date-utils';

describe('tokenizeFormat', () => {
  it('splits fields from literals', () => {
    const tokens = tokenizeFormat('MM/dd/yyyy');
    expect(tokens.map((t) => t.raw)).toEqual(['MM', '/', 'dd', '/', 'yyyy']);
    expect(tokens.map((t) => t.type)).toEqual(['field', 'literal', 'field', 'literal', 'field']);
  });

  it('reads a quoted run as a literal', () => {
    const tokens = tokenizeFormat("dd 'of' MMMM");
    expect(tokens.map((t) => t.raw)).toEqual(['dd', ' of ', 'MMMM']);
  });

  it('keeps an unrecognised letter run rather than dropping it', () => {
    const tokens = tokenizeFormat('MM/dd/yyyy HH:mm');
    expect(tokens.some((t) => t.raw === 'HH')).toBe(true);
  });
});

describe('buildMaskSpec', () => {
  it('describes a fully numeric format as maskable', () => {
    const spec = buildMaskSpec('MM/dd/yyyy');
    expect(spec.maskable).toBe(true);
    expect(spec.totalDigits).toBe(8);
    expect(spec.placeholder).toBe('mm/dd/yyyy');
    expect(spec.fields.map((f) => f.kind)).toEqual(['month', 'day', 'year']);
    expect(spec.fields.map((f) => [f.digitStart, f.digitEnd])).toEqual([
      [0, 2],
      [2, 4],
      [4, 8],
    ]);
  });

  it('handles a day-first format', () => {
    const spec = buildMaskSpec('dd.MM.yyyy');
    expect(spec.placeholder).toBe('dd.mm.yyyy');
    expect(spec.fields.map((f) => f.kind)).toEqual(['day', 'month', 'year']);
  });

  it('handles a two-digit year', () => {
    const spec = buildMaskSpec('dd/MM/yy');
    expect(spec.totalDigits).toBe(6);
    expect(spec.placeholder).toBe('dd/mm/yy');
  });

  it('refuses to mask a format with a month name', () => {
    expect(buildMaskSpec('MMM d, yyyy').maskable).toBe(false);
  });

  it('refuses to mask a variable-width numeric field', () => {
    expect(buildMaskSpec('M/d/yyyy').maskable).toBe(false);
  });

  it('refuses to mask a format with an unsupported token', () => {
    expect(buildMaskSpec('MM/dd/yyyy HH:mm').maskable).toBe(false);
  });
});

describe('renderMask, progressive', () => {
  const spec = buildMaskSpec('MM/dd/yyyy');

  it('renders nothing for an empty buffer', () => {
    expect(renderMask('', spec).text).toBe('');
  });

  it('grows separators as soon as a field completes', () => {
    expect(renderMask('1', spec).text).toBe('1');
    expect(renderMask('12', spec).text).toBe('12/');
    expect(renderMask('123', spec).text).toBe('12/3');
    expect(renderMask('1231', spec).text).toBe('12/31/');
    expect(renderMask('12312026', spec).text).toBe('12/31/2026');
  });

  it('strips separators out of the incoming text', () => {
    expect(renderMask('12/31/2026', spec).text).toBe('12/31/2026');
    expect(renderMask('12-31-2026', spec).text).toBe('12/31/2026');
  });

  it('caps input at the mask capacity', () => {
    expect(renderMask('123120269999', spec).text).toBe('12/31/2026');
  });

  it('reports a slot position for every rendered digit', () => {
    expect(renderMask('12312026', spec).slots).toEqual([0, 1, 3, 4, 6, 7, 8, 9]);
  });
});

describe('renderMask, placeholder fill', () => {
  const spec = buildMaskSpec('MM/dd/yyyy');

  it('shows the whole mask with typed digits substituted', () => {
    expect(renderMask('', spec, true).text).toBe('mm/dd/yyyy');
    expect(renderMask('12', spec, true).text).toBe('12/dd/yyyy');
    expect(renderMask('1231', spec, true).text).toBe('12/31/yyyy');
  });

  it('keeps a slot for every position, typed or not', () => {
    expect(renderMask('12', spec, true).slots).toEqual([0, 1, 3, 4, 6, 7, 8, 9]);
  });
});

describe('caretForDigits', () => {
  const spec = buildMaskSpec('MM/dd/yyyy');

  it('hops over the separator after a completed field', () => {
    const render = renderMask('12', spec);
    expect(render.text).toBe('12/');
    expect(caretForDigits(render, 2)).toBe(3);
  });

  it('stays tight against the last digit when deleting', () => {
    const render = renderMask('12', spec);
    expect(caretForDigits(render, 2, true)).toBe(2);
  });

  it('lands on the next empty slot in fill mode', () => {
    const render = renderMask('12', spec, true);
    expect(caretForDigits(render, 2)).toBe(3);
  });
});

describe('countDigitsBefore', () => {
  it('ignores separators', () => {
    expect(countDigitsBefore('12/31/2026', 0)).toBe(0);
    expect(countDigitsBefore('12/31/2026', 3)).toBe(2);
    expect(countDigitsBefore('12/31/2026', 6)).toBe(4);
    expect(countDigitsBefore('12/31/2026', 10)).toBe(8);
  });
});

describe('selectionForField', () => {
  const spec = buildMaskSpec('MM/dd/yyyy');

  it('covers the whole field', () => {
    const render = renderMask('12312026', spec);
    expect(selectionForField(render, spec.fields[1]!)).toEqual({ start: 3, end: 5 });
    expect(selectionForField(render, spec.fields[2]!)).toEqual({ start: 6, end: 10 });
  });

  it('returns null for a field that has not been rendered yet', () => {
    const render = renderMask('12', spec);
    expect(selectionForField(render, spec.fields[2]!)).toBeNull();
  });
});

describe('shouldAutoPad', () => {
  it('completes an unambiguous month', () => {
    expect(shouldAutoPad('month', 2, '2')).toBe(true);
    expect(shouldAutoPad('month', 2, '9')).toBe(true);
  });

  it('waits when a second digit could still follow', () => {
    expect(shouldAutoPad('month', 2, '1')).toBe(false);
    expect(shouldAutoPad('month', 2, '0')).toBe(false);
    expect(shouldAutoPad('day', 2, '3')).toBe(false);
  });

  it('completes an unambiguous day', () => {
    expect(shouldAutoPad('day', 2, '4')).toBe(true);
  });

  it('never pads a year', () => {
    expect(shouldAutoPad('year', 4, '2')).toBe(false);
  });
});

describe('stepFieldDigits', () => {
  const spec = buildMaskSpec('MM/dd/yyyy');
  const reference = makeDate(2026, 5, 15); // 15 June 2026

  it('increments the month', () => {
    expect(stepFieldDigits(spec, '03152026', spec.fields[0]!, 1, reference)).toBe('04152026');
  });

  it('wraps December to January', () => {
    expect(stepFieldDigits(spec, '12152026', spec.fields[0]!, 1, reference)).toBe('01152026');
  });

  it('wraps January back to December', () => {
    expect(stepFieldDigits(spec, '01152026', spec.fields[0]!, -1, reference)).toBe('12152026');
  });

  it('wraps the day within the month it is actually in', () => {
    // February 2026 has 28 days, so stepping past the end returns to the 1st.
    expect(stepFieldDigits(spec, '02282026', spec.fields[1]!, 1, reference)).toBe('02012026');
  });

  it('respects a leap February', () => {
    expect(stepFieldDigits(spec, '02282024', spec.fields[1]!, 1, reference)).toBe('02292024');
  });

  it('steps the year without wrapping', () => {
    expect(stepFieldDigits(spec, '06152026', spec.fields[2]!, 1, reference)).toBe('06152027');
  });

  it('starts an empty field from the reference date', () => {
    expect(stepFieldDigits(spec, '', spec.fields[0]!, 1, reference)).toBe('06');
  });
});

describe('wrapNumber', () => {
  it('wraps in both directions', () => {
    expect(wrapNumber(13, 1, 12)).toBe(1);
    expect(wrapNumber(0, 1, 12)).toBe(12);
    expect(wrapNumber(-1, 1, 12)).toBe(11);
    expect(wrapNumber(6, 1, 12)).toBe(6);
  });
});

describe('formatDate', () => {
  const date = makeDate(2026, 0, 5); // 5 January 2026, a Monday

  it('pads fixed-width fields', () => {
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('01/05/2026');
  });

  it('omits padding for single-character tokens', () => {
    expect(formatDate(date, 'M/d/yyyy')).toBe('1/5/2026');
  });

  it('writes month names', () => {
    expect(formatDate(date, 'MMMM d, yyyy')).toBe('January 5, 2026');
    expect(formatDate(date, 'd MMM yyyy')).toBe('5 Jan 2026');
  });

  it('writes weekday names', () => {
    expect(formatDate(date, 'EEEE')).toBe('Monday');
    expect(formatDate(date, 'EEE')).toBe('Mon');
  });

  it('truncates a two-digit year', () => {
    expect(formatDate(date, 'dd/MM/yy')).toBe('05/01/26');
  });

  it('returns an empty string for a missing date', () => {
    expect(formatDate(null, 'MM/dd/yyyy')).toBe('');
    expect(formatDate(new Date(Number.NaN), 'MM/dd/yyyy')).toBe('');
  });
});
