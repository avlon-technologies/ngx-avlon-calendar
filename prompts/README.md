# Prompt History

This directory preserves the user prompts that initiate meaningful bodies of
work in this repository. Each file records one initiating prompt verbatim,
along with the purpose, expected outputs, and repository context at the time.

## Convention

- Filename: `YYYY-MM-DD-NNN-short-slug.md`
  - `YYYY-MM-DD` — the date the prompt was received (local time).
  - `NNN` — zero-padded per-date sequence number.
  - `short-slug` — 3-6 lowercase hyphenated words.
- Front matter carries a `content_hash` (sha256 of the normalized prompt text)
  so repeated prompts are recognized rather than duplicated.
- The original wording is the artifact. It is never rewritten, summarized in
  place, or improved. The only permitted alteration is redaction of secrets.
