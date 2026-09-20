/**
 * Popover placement and focus containment.
 *
 * The panel is a native `popover`, which puts it in the browser's top layer. It
 * therefore renders above everything and cannot be clipped by an ancestor's
 * `overflow`, while still living inside the component's shadow root, so the
 * component's styles reach it and the host page's do not. That combination is
 * what lets the library drop its overlay dependency and stay fully
 * encapsulated.
 *
 * Nothing here touches Angular, so the geometry can be reasoned about and
 * tested on its own.
 */

export type AvPlacement = 'bottom' | 'top';

export interface AvPanelPosition {
  readonly top: number;
  readonly left: number;
  readonly placement: AvPlacement;
  /** Height budget when neither side has room for the panel's natural height. */
  readonly maxHeight: number;
}

export interface AvPositionOptions {
  /** Gap between the field and the panel, in pixels. */
  readonly offset?: number;
  /** Minimum distance kept from the viewport edge, in pixels. */
  readonly margin?: number;
  /** Align the panel's right edge with the anchor's right edge. */
  readonly alignEnd?: boolean;
}

/**
 * Places `panel` against `anchor`.
 *
 * Prefers below, flips above when below would overflow and above has more room,
 * and always clamps horizontally so the panel stays on screen. Returns
 * viewport coordinates, which is what a top-layer element wants.
 */
export function positionPanel(
  anchor: DOMRect,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  options: AvPositionOptions = {},
): AvPanelPosition {
  const offset = options.offset ?? 6;
  const margin = options.margin ?? 8;

  const spaceBelow = viewport.height - anchor.bottom - offset - margin;
  const spaceAbove = anchor.top - offset - margin;

  const fitsBelow = panel.height <= spaceBelow;
  const placement: AvPlacement = fitsBelow || spaceBelow >= spaceAbove ? 'bottom' : 'top';

  const maxHeight = Math.max(120, placement === 'bottom' ? spaceBelow : spaceAbove);
  const height = Math.min(panel.height, maxHeight);

  const top =
    placement === 'bottom'
      ? anchor.bottom + offset
      : Math.max(margin, anchor.top - offset - height);

  const preferredLeft = options.alignEnd ? anchor.right - panel.width : anchor.left;
  const maxLeft = Math.max(margin, viewport.width - panel.width - margin);
  const left = Math.min(Math.max(margin, preferredLeft), maxLeft);

  return { top, left, placement, maxHeight };
}

/** True when the runtime supports the popover API. */
export function supportsPopover(element: HTMLElement): boolean {
  return typeof (element as { showPopover?: unknown }).showPopover === 'function';
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Every element inside `root` that can take focus, in document order. */
export function focusableWithin(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

/**
 * Keeps Tab and Shift+Tab inside `root`.
 *
 * Call from a `keydown` handler; returns true when the event was handled. A
 * roving tabindex means the grid usually exposes a single stop, so without this
 * one Tab press would leave the panel with it still open.
 */
export function trapTab(root: ParentNode, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;

  const focusable = focusableWithin(root);
  if (focusable.length === 0) return false;

  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = deepActiveElement();

  if (event.shiftKey && (active === first || !active || !contains(root, active))) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}

/**
 * The focused element, following shadow roots.
 *
 * `document.activeElement` stops at the shadow host, so a component that owns a
 * shadow root has to walk down to find what is really focused.
 */
export function deepActiveElement(): HTMLElement | null {
  let active = document.activeElement as HTMLElement | null;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement as HTMLElement;
  }
  return active;
}

function contains(root: ParentNode, node: Node): boolean {
  return root instanceof Node ? root.contains(node) : false;
}

/**
 * True when `event` started outside `roots`.
 *
 * Uses the composed path so a click inside a shadow root is correctly
 * attributed to the component that owns it rather than to its host element.
 */
export function isOutside(event: Event, roots: readonly (Node | null | undefined)[]): boolean {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const nodes = roots.filter((r): r is Node => !!r);
  if (path.length > 0) {
    return !path.some((target) => nodes.includes(target as Node));
  }
  const target = event.target as Node | null;
  return !target || !nodes.some((root) => root.contains(target));
}
