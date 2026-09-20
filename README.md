# ngx-avlon-calendar workspace

Angular workspace for **[ngx-avlon-calendar](projects/ngx-avlon-calendar/README.md)**,
a date picker built with Tailwind CSS: format-driven input masking, real
validation with visible errors, reactive and template-driven forms, and a
calendar themed through custom properties.

| Project | Path | What it is |
| --- | --- | --- |
| `ngx-avlon-calendar` | `projects/ngx-avlon-calendar` | The publishable library. |
| `demo` | `projects/demo` | A single-page demo of every option. |

## Getting started

```bash
npm install
npm run build:lib     # the demo imports the built package from dist/
npm start             # serves the demo at http://localhost:4200
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run build:lib` | Builds the package and its prebuilt stylesheet into `dist/`. |
| `npm run watch` | Rebuilds the library on change, for use alongside `npm start`. |
| `npm start` | Serves the demo. |
| `npm run build` | Builds the library then the demo. |
| `npm test` | Runs the library's unit tests. |
| `npm run format` | Prettier over both projects. |

The demo resolves `ngx-avlon-calendar` to `dist/ngx-avlon-calendar`, so it
exercises the packaged output rather than the source tree. Build the library
before serving the demo, or run `npm run watch` in a second terminal.

## Documentation

The library's own [README](projects/ngx-avlon-calendar/README.md) covers
installation, formats, value modes, validation, theming, localization and
accessibility.

Prompts that initiated significant work in this repository are preserved under
[`prompts/`](prompts/README.md).
