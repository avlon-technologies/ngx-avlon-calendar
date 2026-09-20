/**
 * DOM queries that descend into shadow roots.
 *
 * Both components render with `ViewEncapsulation.ShadowDom`, which is the whole
 * point of the library's isolation guarantee: nothing the host page writes can
 * select into the component, and nothing the component writes can escape. The
 * same boundary stops `querySelector` from a fixture's host element, so tests
 * walk it explicitly.
 *
 * This file is test-only and is not part of the public API.
 */

/**
 * Every element matching `selector`, in document order, across shadow roots.
 *
 * A descendant selector cannot cross a shadow boundary in any engine: inside a
 * shadow root the host element is not an ancestor, so `av-date-picker input`
 * matches nothing however deeply you search. When a compound selector finds
 * nothing, this splits it at the last descendant combinator and searches the
 * remainder inside each match of the prefix, which is what the selector was
 * plainly meant to express.
 */
export function deepQueryAll<T extends Element = HTMLElement>(
  root: ParentNode | null,
  selector: string,
): T[] {
  if (!root) return [];

  const direct = collect<T>(root, selector);
  if (direct.length > 0) return direct;

  const split = splitLastDescendant(selector);
  if (!split) return direct;

  const found: T[] = [];
  // Recurse on the prefix too: a selector can cross more than one boundary,
  // such as a section holding a picker that renders a calendar of its own.
  for (const host of deepQueryAll<Element>(root, split.prefix)) {
    const shadow = (host as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    for (const match of deepQueryAll<T>(shadow ?? host, split.suffix)) {
      if (!found.includes(match)) found.push(match);
    }
  }
  return found;
}

function collect<T extends Element>(root: ParentNode, selector: string): T[] {
  const found: T[] = [];
  const seen = new Set<ParentNode>();

  const visit = (node: ParentNode) => {
    if (seen.has(node)) return;
    seen.add(node);

    for (const match of Array.from(node.querySelectorAll<T>(selector))) {
      if (!found.includes(match)) found.push(match);
    }

    // The starting node may itself be a shadow host, in which case everything
    // worth finding is behind its own boundary rather than beneath it.
    const own = (node as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (own) visit(own);

    // Shadow content is invisible to the query above, so recurse into every
    // shadow root beneath this node.
    for (const element of Array.from(node.querySelectorAll('*'))) {
      const shadow = (element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
      if (shadow) visit(shadow);
    }
  };

  visit(root);
  return found;
}

/**
 * Splits `a b` into `{ prefix: 'a', suffix: 'b' }` at the last descendant
 * combinator, ignoring whitespace inside brackets, parentheses or quotes.
 */
function splitLastDescendant(selector: string): { prefix: string; suffix: string } | null {
  let depth = 0;
  let quote: string | null = null;

  for (let i = selector.length - 1; i > 0; i--) {
    const ch = selector[i]!;

    if (quote) {
      if (ch === quote && selector[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ']' || ch === ')') depth++;
    else if (ch === '[' || ch === '(') depth--;
    else if (ch === ' ' && depth === 0) {
      const prefix = selector.slice(0, i).trim();
      const suffix = selector.slice(i + 1).trim();
      // Only a plain descendant combinator can span a shadow boundary.
      if (!prefix || !suffix || /[>+~,]$/.test(prefix)) return null;
      return { prefix, suffix };
    }
  }

  return null;
}

/** The first element matching `selector`, across shadow roots. */
export function deepQuery<T extends Element = HTMLElement>(
  root: ParentNode | null,
  selector: string,
): T | null {
  return deepQueryAll<T>(root, selector)[0] ?? null;
}
