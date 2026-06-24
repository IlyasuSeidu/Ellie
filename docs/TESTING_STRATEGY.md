# Ryvro Testing Strategy

Last updated: 2026-06-24

The test strategy follows the current Ryvro concept:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.

## Primary Risks

- The setup flow saves the wrong phase of the shift pattern.
- Voice answers use the wrong date or date range.
- Offline and online answers disagree.
- Spoken answers use confusing time formatting.
- A purchased user is sent back to the paywall.
- Settings repair paths open confusing old flows.
- User details do not sync or are not used in answers.

## Automated Test Priorities

### Schedule Accuracy

Cover:

- known date alignment
- exact phase selection
- overnight shift times
- exact-date questions
- named weekdays
- next 7 days
- next 14 days
- explicit date ranges
- last week
- first Saturday in a month
- end of month

Key files:

- `src/utils/localShiftBrain.ts`
- `src/utils/shiftQueryTools.ts`
- `src/utils/knownShiftPhase.ts`
- `backend/functions/src/ryvro-brain.ts`

### Voice Answers

Cover:

- user speaks before Ryvro answers
- answer card appears
- response includes user name when available
- answer uses 12-hour time
- duplicate filler text is not added
- malformed leading text is not added
- range answers are structured

Key files:

- `src/services/VoiceAssistantService.ts`
- `src/utils/voiceAssistantPrompts.ts`
- `src/services/__tests__/VoiceAssistantService.localShiftBrain.test.ts`

### Subscription

Cover:

- one free voice answer
- hard paywall after the trial answer
- entitlement `pro` unlocks ongoing voice use
- restore purchase updates entitlement state
- login does not force a purchased user to buy again

Key files:

- `src/contexts/SubscriptionContext.tsx`
- `src/components/paywall/`

### Settings And Sync

Cover:

- edit user details
- save button exits loading state
- details sync to backend when available
- details are used in answers
- fix setup, fix time, and fix reminders open simplified flows
- back navigation returns to Ask

### UI Concept Guardrails

Cover:

- no bottom tab bar in the main concept
- no visible chat composer on Ask
- no typing path in onboarding voice trial
- no shift-specific accent colors in app chrome
- English-only runtime

## Required Local Commands

```bash
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm --prefix backend/functions test
npm --prefix backend/functions run build
```

## Release Gate

```bash
npm run release:check
```

## Manual Device QA

Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md`.

Required manual QA includes:

- Fresh install.
- Auth.
- Simplified setup.
- Voice trial.
- Paywall.
- Sandbox purchase.
- Restore purchase.
- Ask screen after purchase.
- Settings repair paths.
- Offline exact-date answer.
- Offline range answer.
- Online backend answer.
- Reminder scheduling.
- Store screenshot capture.

## Store Screenshot QA

Use `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`.

Screenshots must show the current Ryvro screens:

- Welcome.
- Setup.
- Ask.
- Paywall.
- Optional known date, Try Ryvro, and Reminders.

Do not capture old builder, tab, dashboard, stats, or calendar-first screens for store submission.
