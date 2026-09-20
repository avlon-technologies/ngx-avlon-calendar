import {
  caretForDigits,
  countDigitsBefore,
  extractDigits,
  fieldAtDigitIndex,
  maskSpecFor,
  renderMask,
  selectionForField,
  shouldAutoPad,
  stepFieldDigits,
} from './date-format';
import type { AvMaskSpec } from './types';

export interface AvMaskOptions {
  /** The display format the mask is derived from. */
  readonly format: string;
  /** Show the whole placeholder while typing, e.g. `12/dd/yyyy`. */
  readonly showMaskPlaceholder: boolean;
  /** Highest two-digit year treated as 20xx when stepping a year field. */
  readonly twoDigitYearPivot: number;
  /** Complete a field from one unambiguous digit, so `5` becomes `05`. */
  readonly autoPad: boolean;
}

/**
 * Input masking for a date field.
 *
 * The controller is deliberately free of Angular so the rules can be unit
 * tested against a plain element, and so the same logic can serve both the
 * picker's own input and the standalone `[avDateMask]` directive.
 *
 * ### How it works
 *
 * The input's text is never the model. The model is the *digit buffer*: every
 * digit the user has typed, in order, with separators stripped. After any edit
 * the buffer is re-extracted from the element, re-rendered through the format,
 * and written back, with the caret restored by counting digits rather than
 * characters. That makes paste, drag-and-drop, autofill, undo and IME input all
 * land in the same place as ordinary typing, because none of them get a special
 * case.
 */
export class AvMaskController {
  constructor(private readonly options: () => AvMaskOptions) {}

  get spec(): AvMaskSpec {
    return maskSpecFor(this.options().format);
  }

  /** True when the configured format can be masked at all. */
  get enabled(): boolean {
    return this.spec.maskable;
  }

  /** The hint text for an empty field, e.g. `mm/dd/yyyy`. */
  get placeholder(): string {
    return this.spec.placeholder;
  }

  /**
   * Re-normalizes the element after the browser has applied an edit.
   *
   * Returns the text now in the element.
   */
  onInput(el: HTMLInputElement, inputType: string | null): string {
    const spec = this.spec;
    if (!spec.maskable) return el.value;

    const options = this.options();
    const caret = el.selectionStart ?? el.value.length;
    const deleting = !!inputType && inputType.startsWith('delete');

    let digits = extractDigits(el.value, spec);
    let digitsBefore = Math.min(countDigitsBefore(el.value, caret), digits.length);

    if (!deleting && options.autoPad) {
      const padded = this.autoPadAt(spec, digits, digitsBefore);
      if (padded) {
        digits = padded.digits;
        digitsBefore = padded.digitsBefore;
      }
    }

    const render = renderMask(digits, spec, options.showMaskPlaceholder);
    const position = caretForDigits(render, digitsBefore, deleting);

    el.value = render.text;
    setCaret(el, position, position);
    return render.text;
  }

  /**
   * Handles the keys the browser would otherwise get wrong.
   *
   * Returns the new text when the key was handled here, or `null` to let the
   * default edit proceed.
   */
  onKeydown(el: HTMLInputElement, event: KeyboardEvent, reference: Date): string | null {
    const spec = this.spec;
    if (!spec.maskable || event.metaKey || event.ctrlKey || event.altKey) return null;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      return this.step(el, event.key === 'ArrowUp' ? 1 : -1, reference);
    }

    const collapsed = el.selectionStart === el.selectionEnd;

    // Stepping the caret over a separator first means the default deletion
    // always removes a digit, so a second press can never stall on a slash.
    if (event.key === 'Backspace' && collapsed) {
      let p = el.selectionStart ?? 0;
      while (p > 0 && !isDigit(el.value[p - 1]!)) p--;
      if (p !== el.selectionStart) setCaret(el, p, p);
      return null;
    }

    if (event.key === 'Delete' && collapsed) {
      let p = el.selectionStart ?? 0;
      while (p < el.value.length && !isDigit(el.value[p]!)) p++;
      if (p !== el.selectionStart) setCaret(el, p, p);
      return null;
    }

    return null;
  }

  /** Increments or decrements the field under the caret and selects it. */
  step(el: HTMLInputElement, delta: number, reference: Date): string | null {
    const spec = this.spec;
    if (!spec.maskable) return null;

    const options = this.options();
    const caret = el.selectionStart ?? 0;
    const digits = extractDigits(el.value, spec);
    const current = renderMask(digits, spec, options.showMaskPlaceholder);
    const digitIndex = digitSlotAtCaret(current.slots, caret);

    const field = fieldAtDigitIndex(spec, digitIndex);
    if (!field) return null;

    const nextDigits = stepFieldDigits(
      spec,
      digits,
      field,
      delta,
      reference,
      options.twoDigitYearPivot,
    );
    const render = renderMask(nextDigits, spec, options.showMaskPlaceholder);
    el.value = render.text;

    const selection = selectionForField(render, field);
    if (selection) setCaret(el, selection.start, selection.end);
    else setCaret(el, render.text.length, render.text.length);

    return render.text;
  }

  /** Writes text into the element, normalized through the mask. */
  write(el: HTMLInputElement, text: string): void {
    const spec = this.spec;
    if (!spec.maskable) {
      el.value = text;
      return;
    }
    el.value = renderMask(text, spec, this.options().showMaskPlaceholder).text;
  }

  /** The masked rendering of arbitrary text, without touching the DOM. */
  render(text: string): string {
    const spec = this.spec;
    if (!spec.maskable) return text;
    return renderMask(text, spec, this.options().showMaskPlaceholder).text;
  }

  /**
   * Drops a dangling separator from incomplete text.
   *
   * While typing, `12/31/` is right: the caret has already stepped past the
   * separator, ready for the year. Once the field is left, the same text just
   * looks broken, so the trailing run comes off.
   */
  tidy(text: string): string {
    if (!this.spec.maskable) return text;
    return text.replace(/[^0-9]+$/, '');
  }

  /** Selects the whole field the caret currently sits in. */
  selectFieldAtCaret(el: HTMLInputElement): void {
    const spec = this.spec;
    if (!spec.maskable) return;
    const render = renderMask(el.value, spec, this.options().showMaskPlaceholder);
    const field = fieldAtDigitIndex(spec, digitSlotAtCaret(render.slots, el.selectionStart ?? 0));
    if (!field) return;
    const selection = selectionForField(render, field);
    if (selection) setCaret(el, selection.start, selection.end);
  }

  /**
   * Completes a field from a single unambiguous digit.
   *
   * Only applies to the digit just typed at the end of the buffer, so editing
   * an earlier field never rewrites itself under the user.
   */
  private autoPadAt(
    spec: AvMaskSpec,
    digits: string,
    digitsBefore: number,
  ): { digits: string; digitsBefore: number } | null {
    if (digitsBefore !== digits.length || digits.length === 0) return null;

    const field = fieldAtDigitIndex(spec, digits.length - 1);
    if (!field) return null;

    const partial = digits.slice(field.digitStart);
    if (!shouldAutoPad(field.kind, field.width, partial)) return null;

    return {
      digits: `${digits.slice(0, field.digitStart)}0${partial}`,
      digitsBefore: digitsBefore + 1,
    };
  }
}

/**
 * The digit index the caret addresses.
 *
 * A caret sitting exactly on a digit slot addresses that digit, so landing just
 * after a separator selects the field you are about to type into rather than
 * the one you just left. Anywhere else it addresses the digit behind it.
 */
function digitSlotAtCaret(slots: readonly number[], caret: number): number {
  let index = 0;
  while (index < slots.length && slots[index]! < caret) index++;
  if (index < slots.length && slots[index] === caret) return index;
  return Math.max(0, index - 1);
}

function isDigit(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function setCaret(el: HTMLInputElement, start: number, end: number): void {
  // Selection APIs throw on input types that do not support them.
  try {
    el.setSelectionRange(start, end);
  } catch {
    // Nothing to do: the caret simply stays where the browser put it.
  }
}
