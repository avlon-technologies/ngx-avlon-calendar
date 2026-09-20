# Contributing

Thanks for taking the time. This document covers how the repository is laid
out, how to run it, and what a change is expected to carry with it.

## Getting set up

```bash
git clone https://github.com/avlon-technologies/ngx-avlon-calendar.git
cd ngx-avlon-calendar
npm install
npm run build:lib     # the demo imports the built package from dist/
npm start             # serves the demo at http://localhost:4200
```

Node 22.22.3 or newer, as required by Angular 22.

The demo resolves `@avlon/ngx-avlon-calendar` to `dist/ngx-avlon-calendar`, so
it exercises the packaged output rather than the source tree. Build the library
before serving the demo, or run `npm run watch` in a second terminal.

## Layout

| Path                          | What it is                                        |
| ----------------------------- | ------------------------------------------------- |
| `projects/ngx-avlon-calendar` | The publishable library.                          |
| `projects/demo`               | The demo application, deployed to GitHub Pages.   |
| `scripts/build-lib-css.mjs`   | Generates the library's single stylesheet.        |
| `prompts/`                    | The prompts that initiated significant work here. |

## The generated stylesheet

`projects/ngx-avlon-calendar/src/lib/styles/av-styles.css` is **generated and
committed**. Both components load it as a component stylesheet, so the build and
your editor both need it present on disk.

Edit `src/lib/styles/tokens.css` for tokens and structural rules, or change a
Tailwind class in a template, then:

```bash
npm run styles
```

Commit the regenerated file with your change. CI runs `npm run styles:check` and
fails if the committed copy has drifted from what the sources produce.

## Branching

The repository follows Gitflow.

| Branch              | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `main`              | Released code. Every commit is a tagged release.                              |
| `develop`           | Integration branch. Open your pull requests against this.                     |
| `feature/<name>`    | Branch off `develop`, merge back into `develop`.                              |
| `release/<version>` | Branch off `develop` to stabilise, merge into `main` and back into `develop`. |
| `hotfix/<version>`  | Branch off `main`, merge into `main` and back into `develop`.                 |

```bash
git switch develop
git switch -c feature/range-selection
```

## Commits

Conventional Commits, because the changelog and the version bump are derived
from them.

```
feat(calendar): add a range-selection mode
fix(mask): stop Backspace stalling on a separator
docs(readme): document the two-digit year pivot
```

`feat!:` or a `BREAKING CHANGE:` footer marks a breaking change.

Write the body for someone reading it in a year with no memory of the
discussion: what changed, and why that was the right call.

## Before you open a pull request

```bash
npm run verify
```

That runs the stylesheet generator, both test suites, and both builds. Also run:

```bash
npm run format
```

A pull request is expected to carry:

- **Tests.** Parsing, masking and date arithmetic are pure functions and should
  be tested directly. Component behaviour is tested through the DOM. Both
  components render into a shadow root, so tests use the `deepQuery` helper in
  `src/lib/testing/deep-query.ts` rather than `querySelector`.
- **A demo entry**, when the change is something a user can see. The demo is the
  reference for every option in the README.
- **A README update**, when the change adds or alters public API.
- **A changelog entry** in `projects/ngx-avlon-calendar/CHANGELOG.md`.

## Things worth knowing before changing the library

- **Dates are local midnight, always.** A date picker that quietly carries a
  time component is the source of most off-by-one-day bugs. `makeDate` and
  `startOfDay` exist so nothing has to think about it twice.
- **Nothing hard-codes a colour, a radius, or a duration.** Everything visual
  goes through a custom property declared in `tokens.css`. A new visual
  treatment means a new token, not a literal.
- **The mask's model is the digit buffer, not the text.** After any edit the
  digits are re-extracted from the element, re-rendered through the format, and
  written back, with the caret restored by counting digits. That is why paste,
  autofill, undo and IME input need no special cases, and it is worth keeping.
- **Angular `[class]` array bindings silently drop entries containing spaces.**
  Build a class string and join it. Both components have helpers that do this.
- **No runtime dependencies.** The package depends on Angular and nothing else.
  Adding one needs a good argument.

## Accessibility

Changes to either component are expected to keep:

- a roving tabindex over a grid with `grid`, `row` and `gridcell` roles,
- a live region announcing the focused day,
- a labelled dialog for the popover, with focus trapped and returned to the
  input on close,
- `prefers-reduced-motion` honoured.

## Reporting a bug

Open an issue with the package version, the Angular version, and the smallest
reproduction you can manage. A failing test is the most useful form of a bug
report.

## Security

Please do not open a public issue for a vulnerability. See
[SECURITY.md](SECURITY.md).

## Licence

By contributing you agree that your contributions are licensed under the MIT
Licence, as in [LICENSE](LICENSE).
