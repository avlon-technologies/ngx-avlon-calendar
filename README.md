# ngx-avlon-calendar

[![CI](https://github.com/avlon-technologies/ngx-avlon-calendar/actions/workflows/ci.yml/badge.svg)](https://github.com/avlon-technologies/ngx-avlon-calendar/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@avlon/ngx-avlon-calendar.svg)](https://www.npmjs.com/package/@avlon/ngx-avlon-calendar)
[![licence](https://img.shields.io/npm/l/@avlon/ngx-avlon-calendar.svg)](LICENSE)

An Angular date picker that is actually pleasant to type into: format-driven
input masking, real validation with visible errors, reactive and
template-driven forms, and a calendar themed through CSS custom properties.

No runtime dependencies. No stylesheet to import. Shadow-DOM encapsulated, so
styles cross the boundary in neither direction.

```bash
npm install @avlon/ngx-avlon-calendar
```

```html
<av-date-picker formControlName="checkIn" label="Check in" [min]="today" [required]="true" />
```

**[Live demo](https://avlon-technologies.github.io/ngx-avlon-calendar/)** ·
**[Documentation](projects/ngx-avlon-calendar/README.md)** ·
[Changelog](projects/ngx-avlon-calendar/CHANGELOG.md)

## This repository

| Project                     | Path                          | What it is                                      |
| --------------------------- | ----------------------------- | ----------------------------------------------- |
| `@avlon/ngx-avlon-calendar` | `projects/ngx-avlon-calendar` | The published library.                          |
| `demo`                      | `projects/demo`               | The demo application, deployed to GitHub Pages. |

## Getting started

```bash
npm install
npm run build:lib     # the demo imports the built package from dist/
npm start             # serves the demo at http://localhost:4200
```

Node 20 or newer.

## Scripts

| Script                 | Does                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `npm start`            | Serves the demo.                                               |
| `npm run build:lib`    | Builds the publishable package into `dist/`.                   |
| `npm run watch`        | Rebuilds the library on change, for use alongside `npm start`. |
| `npm run styles`       | Regenerates the library's single stylesheet.                   |
| `npm run styles:check` | Fails if the committed stylesheet has drifted.                 |
| `npm test`             | Runs the library's unit tests.                                 |
| `npm run test:demo`    | Runs the demo page tests.                                      |
| `npm run verify`       | Everything CI runs: styles, both test suites, both builds.     |
| `npm run pack:lib`     | Produces the publishable tarball.                              |
| `npm run format`       | Prettier over both projects.                                   |

## Releasing

Releases follow Gitflow: a release is a tag on `main`.

1. Branch `release/x.y.z` off `develop`.
2. Bump `version` in `projects/ngx-avlon-calendar/package.json`.
3. Move the `Unreleased` changelog entries under a new `## [x.y.z]` heading.
   The release workflow reads that section and uses it as the GitHub release
   notes, so write it to be read on its own.
4. Merge into `main`, then tag and push:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The tag triggers the release workflow, which verifies the build, checks that the
tag matches `package.json`, publishes to npm with provenance, and opens a GitHub
release. Merge `main` back into `develop`.

Publishing requires an `NPM_TOKEN` secret with publish rights to the `@avlon`
scope, configured on the `npm` environment.

## Documentation

The library's own [README](projects/ngx-avlon-calendar/README.md) is the manual:
installation, formats, value modes, validation, theming, localization,
accessibility, API reference, operations and troubleshooting.

- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)

Prompts that initiated significant work here are preserved under
[`prompts/`](prompts/README.md).

## Licence

MIT. Provided as is, without warranty of any kind. See [LICENSE](LICENSE).
