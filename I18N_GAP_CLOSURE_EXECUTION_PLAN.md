# I18N Gap Closure Execution Plan

Source of truth for this execution:

- /Users/Shared/Ellie/I18N_IMPLEMENTATION_PLAN.md
- /Users/Shared/Ellie/I18N_PHASE1_EXECUTION_TASKS.md
- Current codebase audit findings (March 10, 2026)

## Goal

Close all confirmed i18n implementation gaps with no assumptions:

1. complete missing language scaffolding from plan phases (plus already-added runtime languages)
2. close missing translation-key coverage in onboarding runtime screens
3. remove remaining hardcoded UI text in targeted files
4. correct ES/PT residual English copy identified by audit
5. align docs with actual runtime behavior/state

## Ordered Tasks (execute strictly in order)

### Task 1 — Runtime Language Matrix Completion

- Extend supported language set in detector/types to include:
  - `zh-CN`, `ru`, `hi`, `af`, `zu`, `id` (preserving `en`, `es`, `pt-BR`, `fr`, `ar`)
- Update language normalization mapping for new languages.
- Update i18n bootstrap resources imports/registry.
- Add dayjs locale wiring for `zh-cn`, `ru`, `hi`, `id` and fallback handling for unsupported locales.
- Expand language selector options and display names for all supported languages.
- Create locale folders/files for new languages across namespaces:
  - `common`, `onboarding`, `dashboard`, `profile`, `schedule`

### Task 2 — Missing English Key Coverage (Onboarding)

- Add all missing `en` keys used in runtime onboarding/profile/dashboard code where `t()` key references exist but no backing key exists.
- Include dynamic/interpolated keys with exact placeholder tokens (`{{...}}`).
- Cover sections including:
  - `customPattern.*`
  - `fifoCustom.*`
  - `completion.summary.*` and related completion keys
  - `phaseSelector.*` missing title/card/modal/day text keys
  - `shiftPattern.*` missing title/instruction/end-state keys

### Task 3 — Full Locale Key Parity Sync

- Ensure all locale files have exact key parity with English baseline after Task 2.
- Add missing keys in each locale file for all supported languages.
- Keep existing translated strings intact; fill new/missing keys deterministically.

### Task 4 — Remove Remaining Hardcoded UI Strings in Targeted Screens

- Replace remaining hardcoded user-facing strings in audited files with `t()` lookups.
- Mandatory targets:
  - `PremiumShiftSystemScreen` transition overlay text
  - `PremiumPhaseSelectorScreen` hardcoded day/ordinal description logic and copy
  - `PremiumStartDateScreen` helper card/label hardcoded strings in exported UI helpers
  - `PremiumShiftTimeInputScreen` preset labels to translation keys

### Task 5 — ES/PT Strict Language Polish (Known Residual English Carryovers)

- Replace remaining known ES/PT onboarding English carryovers identified by audit (core hints, section headers, card copy, learn-more labels, etc.) with real Spanish/Portuguese copy.
- Preserve interpolation tokens and structure.

### Task 6 — Documentation Truth Alignment

- Update `I18N_IMPLEMENTATION_PLAN.md` verification section and status text to reflect actual runtime behavior (including Arabic being implemented, not fallback-only).
- Keep phase roadmap clear and non-contradictory.

### Task 7 — Verification and Delivery

- Run:
  - `npm run type-check`
  - `npm run lint`
  - `npm test -- --runInBand --silent`
- Fix any regressions.
- Commit all changes and push to GitHub.

## Definition of Done

- All tasks above completed in sequence.
- No missing runtime `t()` keys in audited target files.
- All supported locale files present with key parity.
- Hardcoded user-facing strings removed from targeted onboarding areas.
- ES/PT residual English audit list resolved.
- Checks pass and changes pushed.

## Execution Status (March 10, 2026)

- Task 1: completed
- Task 2: completed
- Task 3: completed
- Task 4: completed
- Task 5: completed
- Task 6: completed
- Task 7: completed (type-check, lint, tests all green)
