/**
 * Adopting a consumer's stylesheet into a component's shadow root.
 *
 * Encapsulation has one sharp edge: markup you pass in through a template,
 * such as `dayTemplate`, is rendered *inside* the shadow root, where your
 * application's stylesheet cannot reach it. Custom properties still inherit, so
 * colours and spacing tokens work, but your own class names do not.
 *
 * Rather than leave that as a documented disappointment, the components take an
 * `extraStyles` input and adopt it alongside their own. It is opt-in and
 * explicit: isolation stays the default, and the only styles that cross the
 * boundary are the ones you hand over deliberately.
 */

const cache = new Map<string, CSSStyleSheet>();

/** True when the runtime supports constructable stylesheets. */
export function supportsAdoptedStyleSheets(): boolean {
  return (
    typeof CSSStyleSheet === 'function' &&
    typeof CSSStyleSheet.prototype.replaceSync === 'function' &&
    typeof ShadowRoot === 'function' &&
    'adoptedStyleSheets' in ShadowRoot.prototype
  );
}

/**
 * Builds a stylesheet from CSS text, reusing one per distinct string.
 *
 * Constructable stylesheets are shared by reference, so a hundred calendars
 * given the same CSS cost one parse and one sheet between them.
 */
export function styleSheetFor(css: string): CSSStyleSheet | null {
  const existing = cache.get(css);
  if (existing) return existing;

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    cache.set(css, sheet);
    return sheet;
  } catch {
    // An engine without constructable stylesheets, or CSS it refuses to parse.
    return null;
  }
}

/**
 * Replaces the sheets previously adopted by this caller with `css`.
 *
 * `previous` is the caller's own list, so the component's own styles and any
 * other adopter's are left untouched. Returns the new list to hand back next
 * time.
 */
export function adoptStyles(
  root: ShadowRoot | null | undefined,
  css: string | readonly string[] | null | undefined,
  previous: readonly CSSStyleSheet[],
): CSSStyleSheet[] {
  if (!root || !supportsAdoptedStyleSheets()) return [];

  const sources = css == null ? [] : Array.isArray(css) ? css : [css as string];
  const next = sources
    .map((text) => styleSheetFor(text))
    .filter((sheet): sheet is CSSStyleSheet => sheet !== null);

  const kept = Array.from(root.adoptedStyleSheets).filter((sheet) => !previous.includes(sheet));

  try {
    root.adoptedStyleSheets = [...kept, ...next];
  } catch {
    // Some engines reject assignment mid-render; the component still works,
    // just without the consumer's extra styles.
    return [];
  }

  return next;
}
