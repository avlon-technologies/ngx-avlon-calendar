#!/usr/bin/env node
/**
 * Builds the standalone stylesheet shipped with ngx-avlon-calendar.
 *
 * The library's templates are written in Tailwind utilities. That is fine for
 * anyone who already runs Tailwind and is willing to add the package to their
 * content sources, but it is a poor first experience for everyone else: install
 * the library, render a picker, get unstyled markup with no error to explain
 * why.
 *
 * So the package ships both. This script runs Tailwind over the library's own
 * templates and emits exactly the utilities they use, with the theme tokens
 * prepended, into `styles/ngx-avlon-calendar.css`. Preflight is deliberately
 * excluded - a component library has no business resetting its host's margins.
 *
 * Run automatically by `npm run build:lib`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const libRoot = join(root, 'projects', 'ngx-avlon-calendar');
const distRoot = join(root, 'dist', 'ngx-avlon-calendar');
const outDir = join(distRoot, 'styles');
const outFile = join(outDir, 'ngx-avlon-calendar.css');
const themeFile = join(libRoot, 'styles', 'theme.css');

if (!existsSync(distRoot)) {
  console.error(
    `[build-lib-css] ${distRoot} does not exist. Run "ng build ngx-avlon-calendar" first.`,
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Theme and utilities go into named cascade layers so a consuming app's own
// styles can override either without an arms race over specificity.
const entry = `@layer theme, avlon-theme, utilities;

@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);

@source '${join(libRoot, 'src').replace(/\\/g, '/')}';
`;

const entryFile = join(outDir, '.entry.css');
writeFileSync(entryFile, entry, 'utf8');

const tailwindBin = join(
  root,
  'node_modules',
  '@tailwindcss',
  'cli',
  'dist',
  'index.mjs',
);

try {
  execFileSync(
    process.execPath,
    [tailwindBin, '--input', entryFile, '--output', outFile, '--minify'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (error) {
  console.error('[build-lib-css] Tailwind failed:');
  console.error(error.stderr?.toString() ?? error.message);
  process.exit(1);
} finally {
  rmSync(entryFile, { force: true });
}

const utilities = readFileSync(outFile, 'utf8');
const theme = readFileSync(themeFile, 'utf8');

const banner = `/*! ngx-avlon-calendar - prebuilt styles.
 *
 * Import this when you do NOT run Tailwind, or do not want to add this package
 * to your Tailwind content sources:
 *
 *   @import 'ngx-avlon-calendar/styles/ngx-avlon-calendar.css';
 *
 * If you DO run Tailwind, import the tokens only and let your own build emit
 * the utilities:
 *
 *   @import 'ngx-avlon-calendar/styles/theme.css';
 *   @source '../node_modules/ngx-avlon-calendar';
 *
 * No Preflight is included, so your page's base styles are left alone.
 */
`;

writeFileSync(outFile, `${banner}${utilities}\n@layer avlon-theme {\n${theme}\n}\n`, 'utf8');

const kb = (Buffer.byteLength(readFileSync(outFile)) / 1024).toFixed(1);
console.log(`[build-lib-css] wrote styles/ngx-avlon-calendar.css (${kb} kB)`);
