---
date: 2026-09-20
sequence: 001
title: Design and implement an Angular + Tailwind calendar picker
status: received
scope: implementation
source: user
related_artifacts: []
redactions: none
content_hash: sha256:29b590225a8e55e98907b9e23020205829b45a34a013952d0d298512d7984fc1
---

# Prompt: Design and implement an Angular + Tailwind calendar picker

## Purpose

Initiates the design and implementation of `ngx-avlon-calendar`: an Angular
date picker library styled with Tailwind CSS, covering format-driven input
masking, date validation with visible errors, configurable presentation,
support for both reactive and template-driven forms, and a themable calendar.

## Original Prompt

> let's design and implement an angular calendar picker, using tailwindcss. It should do proper input masking (based on date format), and date validation, support for different presentation options (i.e. little calendar icon to right or left).  Input allows you to enter a date - validation errors would be displayed.  Supports reactive forms, and non-reactive forms. calendar is themable.  Claim to fame, will be aesethetics and flexibility.

## Expected Outputs

- An Angular calendar/date picker component implemented with Tailwind CSS.
- Input masking driven by the configured date format.
- Date validation, with validation errors displayed to the user.
- Presentation options, including calendar icon placement (left or right).
- Free-text date entry through the input.
- Support for reactive forms and template-driven (non-reactive) forms.
- A themable calendar.
- Emphasis on aesthetics and flexibility as the differentiators.

## Notes

- Repository state at the time: empty working tree apart from Continuum
  architecture scaffolding (`continuum/`, `.claude/skills/`, `.githooks/`,
  `.github/workflows/continuum-architecture.yml`). No commits yet on `main`.
- No existing prompt-history directory; `prompts/` and this convention were
  created by this invocation.
- No secrets present in the prompt; no redactions performed.
