#!/usr/bin/env node
/**
 * Generates the library's single, self-contained stylesheet.
 *
 * The components are authored with Tailwind utility classes, but the published
 * package must not require Tailwind, must not ship a stylesheet the consumer
 * has to remember to import, and must not leak styles into the host page. So
 * this script resolves the utilities ahead of time:
 *
 *   1. Run Tailwind over the library's own source, emitting only the utilities
 *      those templates actually use. Preflight is excluded - a component
 *      library has no business resetting its host's margins.
 *   2. Rewrite `:root` to also match `:host`, because a shadow root is not the
 *      document root and Tailwind's theme variables would otherwise not resolve
 *      inside the component.
 *   3. Append the hand-authored token contract and structural rules.
 *
 * The result is committed to source control and loaded by both components as a
 * component stylesheet, so Angular adopts it into their shadow roots. CI
 * regenerates it and fails if the committed copy has drifted.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const libSrc = join(root, 'projects', 'ngx-avlon-calendar', 'src');
const stylesDir = join(libSrc, 'lib', 'styles');
const tokensFile = join(stylesDir, 'tokens.css');
const outFile = join(stylesDir, 'av-styles.css');

if (!existsSync(tokensFile)) {
  console.error(`[build-lib-css] missing ${tokensFile}`);
  process.exit(1);
}

mkdirSync(stylesDir, { recursive: true });

const scanRoot = libSrc.replace(/\\/g, '/');

// `theme.css` carries the variables utilities reference; `utilities.css` carries
// the utilities themselves. Importing "tailwindcss" wholesale would also pull in
// Preflight, which must never reach a consumer's page.
//
// `source(none)` turns off automatic content detection, which would otherwise
// walk the whole workspace from the working directory and pull the demo
// application's classes into the library's stylesheet.
const entry = `@import 'tailwindcss/theme.css';
@import 'tailwindcss/utilities.css' source(none);

@source '${scanRoot}/lib/**/*.html';
@source '${scanRoot}/lib/**/*.ts';
@source not '${scanRoot}/**/*.spec.ts';
`;

const entryFile = join(stylesDir, '.entry.css');
const rawFile = join(stylesDir, '.raw.css');
writeFileSync(entryFile, entry, 'utf8');

const tailwindBin = join(root, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs');

try {
  execFileSync(process.execPath, [tailwindBin, '--input', entryFile, '--output', rawFile], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  console.error('[build-lib-css] Tailwind failed:');
  console.error(error.stderr?.toString() ?? error.message);
  rmSync(entryFile, { force: true });
  process.exit(1);
}

let utilities = readFileSync(rawFile, 'utf8');
rmSync(entryFile, { force: true });
rmSync(rawFile, { force: true });

// A shadow root is not `:root`, so every `var(--color-*)` and `var(--spacing)`
// Tailwind emits would resolve to nothing inside the component. Current
// Tailwind already emits `:root, :host` for exactly this reason; the rewrite
// below covers older output, and the assertion catches a future regression
// rather than shipping a silently unstyled component.
utilities = utilities
  .replace(/(^|[\s,{])(:root)\s*\{/g, (_match, lead) => `${lead}:root, :host {`)
  .replace(/:root,\s*:host,\s*:host/g, ':root, :host');

if (/:root/.test(utilities) && !/:root,\s*:host/.test(utilities)) {
  console.error('[build-lib-css] Tailwind theme variables are not scoped to :host.');
  console.error('  The component would render unstyled inside its shadow root.');
  process.exit(1);
}

/**
 * Drops theme variables nothing references.
 *
 * Importing `tailwindcss/theme.css` directly emits the entire default palette,
 * because the usual tree-shaking only happens for the `@import "tailwindcss"`
 * entry point. The library styles itself from its own `--av-*` tokens, so the
 * great majority of those declarations are dead weight in every consumer's
 * bundle.
 */
function pruneUnusedThemeVars(css, extraUsage) {
  const open = css.indexOf(':root, :host {');
  if (open < 0) return css;
  const start = css.indexOf('{', open) + 1;
  const end = css.indexOf('}', start);
  if (end < 0) return css;

  const block = css.slice(start, end);
  const rest = css.slice(0, open) + css.slice(end) + extraUsage;

  const kept = [];
  // Declarations wrap across lines, so split on the semicolon, not the newline.
  for (const raw of block.split(';')) {
    const decl = raw.trim();
    if (!decl) continue;
    const name = /^(--[\w-]+)\s*:/.exec(decl)?.[1];
    if (!name) continue;
    // A variable earns its place if anything outside this block reads it, or if
    // another surviving declaration in this block does.
    if (rest.includes(`var(${name})`) || block.replace(raw, '').includes(`var(${name})`)) {
      kept.push(`  ${decl.replace(/\s+/g, ' ')};`);
    }
  }

  const body = kept.join('\n');
  return `${css.slice(0, start)}\n${body}\n${css.slice(end)}`;
}

const tokens = readFileSync(tokensFile, 'utf8');

const prunedBytes = Buffer.byteLength(utilities);
utilities = pruneUnusedThemeVars(utilities, tokens);
const saved = ((prunedBytes - Buffer.byteLength(utilities)) / 1024).toFixed(1);
if (Number(saved) > 0) console.log(`[build-lib-css] pruned ${saved} kB of unused theme variables`);


const banner = `/*!
 * ngx-avlon-calendar - generated stylesheet. DO NOT EDIT.
 *
 * Produced by scripts/build-lib-css.mjs from the library's templates plus
 * src/lib/styles/tokens.css. Regenerate with: npm run styles
 *
 * Loaded as a component stylesheet into each component's shadow root, so it
 * neither escapes into the host page nor is reachable from it. No Preflight is
 * included and Tailwind is not required at runtime.
 */
`;

writeFileSync(outFile, `${banner}${utilities}\n${tokens}\n`, 'utf8');

const kb = (Buffer.byteLength(readFileSync(outFile)) / 1024).toFixed(1);
console.log(`[build-lib-css] wrote src/lib/styles/av-styles.css (${kb} kB)`);
