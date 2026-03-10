# I18N Runtime Language Polish Execution Plan

Date: March 10, 2026
Repository: /Users/Shared/Ellie

## Scope

Close confirmed remaining i18n gaps by replacing English fallback text in runtime locales with real localized copy while preserving key parity and interpolation-token correctness.

This execution follows strict chronological tasks. No scope expansion beyond i18n translation-polish + validation.

## Confirmed Gaps (Audit-Backed)

- Key parity is complete across all locales/namespaces.
- Remaining issue: many locales still contain English text identical to `en` values.
- Most impacted locales: `zh-CN`, `ru`, `hi`, `af`, `zu`, `id`.
- Partial carryovers in `fr` and `ar` onboarding.
- Minor carryovers in `es` and `pt-BR` (mostly proper nouns/region names).

## Chronological Tasks

### ✅ Task 1 — Baseline Untranslated Report

- Produce deterministic reports of `sameAsEnglish` keys per locale and namespace.
- Save artifacts for before/after comparison.

### ✅ Task 2 — Runtime Locale Translation Completion

- Translate remaining English-equivalent values for:
  - `fr`, `ar`, `zh-CN`, `ru`, `hi`, `af`, `zu`, `id`
  - namespaces: `common`, `onboarding`, `dashboard`, `profile`, `schedule`
- Preserve interpolation tokens exactly (`{{...}}`).
- Preserve intentional proper nouns and acronyms where appropriate.

### ✅ Task 3 — Quality Review and Corrections

- Validate token integrity against English source.
- Re-run parity and untranslated audits.
- Manually fix malformed outputs (token spacing, untranslated boilerplate, awkward artifacts).

### ⏳ Task 4 — Documentation Truth Alignment

- Update i18n docs to reflect the post-polish runtime language state.
- Keep explicit caveats only where objectively true.

### ⏳ Task 5 — Validation, Commit, Push

- Run:
  - `npm run type-check`
  - `npm run lint`
  - `npm test -- --runInBand --silent`
- Fix any failures.
- Commit with clear message.
- Push to `origin/main`.

## Definition of Done

- Runtime locales above have full key parity and no unintended English fallback strings.
- Placeholder token integrity is 100% preserved.
- Type-check/lint/tests pass.
- Changes committed and pushed.

## Implementation Status (Live)

- ✅ Task 1 completed
- ✅ Task 2 completed
- ✅ Task 3 completed
- ⏳ Task 4 pending
- ⏳ Task 5 pending
