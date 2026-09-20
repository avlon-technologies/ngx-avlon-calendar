# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

While the package is below 1.0, only the latest minor release receives fixes.

## Reporting a vulnerability

Please do not open a public issue.

Report privately through GitHub's
[security advisory form](https://github.com/avlon-technologies/ngx-avlon-calendar/security/advisories/new),
or email **security@avlon.ca**.

Include the package version, a description of the issue, and a reproduction if
you have one. We will acknowledge within five working days and keep you updated
as we investigate.

## Scope

This is a client-side UI library. It makes no network requests, reads no
credentials, persists nothing, and executes no user-supplied code. It has no
runtime dependencies beyond Angular itself. The areas most likely to matter are:

- **Rendering of consumer-supplied content.** Templates passed through
  `dayTemplate` and strings passed through `errorMessages` are rendered by
  Angular, which escapes interpolated values. Report anything that bypasses that.
- **Parsing.** `parseDate` accepts arbitrary text. Report any input that makes it
  hang, throw, or return a date that does not correspond to the input.
- **Style isolation.** Both components render into a shadow root. Report any way
  a host page's styles reach into a component, or a component's styles escape it.

Out of scope: vulnerabilities in Angular itself, in the build toolchain, or in
the demo application deployed to GitHub Pages.

## Disclosure

We will agree a disclosure timeline with you, publish a security advisory, and
credit you unless you would rather we did not.
