# Ryvro

![CI Pipeline](https://github.com/IlyasuSeidu/ryvro/workflows/CI%20Pipeline/badge.svg)
![E2E Tests](https://github.com/IlyasuSeidu/ryvro/workflows/E2E%20Tests/badge.svg)
[![codecov](https://codecov.io/gh/IlyasuSeidu/ryvro/branch/main/graph/badge.svg)](https://codecov.io/gh/IlyasuSeidu/ryvro)

Ryvro is a voice-first shift assistant.

The product promise is simple:

> Configure your shift once. Then ask Ryvro by voice anytime and get the right shift answer instantly.

Ryvro is built for shift workers who do not want to manage a calendar, study a dashboard, or count through a repeating pattern. They open the app, ask a question, and hear the answer.

## Current Product Concept

Ryvro has one main job:

- Help the worker set up an accurate repeating shift pattern.
- Let the worker ask natural voice questions about that pattern.
- Answer today, future dates, ranges, next days off, next work days, weekends, and named weekdays clearly.
- Keep the app simple enough for a non-technical worker to understand without friction.

The shipped mental model is not a roster manager. It is not a calendar app. It is not a productivity dashboard. It is a voice assistant for shift answers.

## Main Surfaces

### Onboarding And Setup

The setup flow gathers only what Ryvro needs to answer accurately:

- The repeating shift pattern.
- A known date.
- The exact shift phase on that known date.
- Shift times in 12-hour format.
- Reminder preference.
- A final setup check before the user tries Ryvro.

The setup screens use the new Ryvro visual system: dark base, cyan, blue, silver, and muted text. The UI avoids shift-specific random colors.

### Ask

The Ask screen is the main app surface after onboarding.

It contains:

- Ryvro brand header.
- Settings icon in the top-right corner.
- Large animated microphone.
- Voice-only interaction.
- One polished answer card.

There is no chat composer, no typing box, and no bottom tab bar in the main concept.

### Settings

Settings is opened from the Ask screen. It exists for repair and account tasks:

- View or fix shift setup.
- Edit shift times.
- Edit reminders.
- Edit user details.
- Manage Ryvro Pro.
- Contact support, privacy, terms, and sign out.

Settings should keep advanced setup hidden behind plain-language repair paths.

### Ryvro Pro

Ryvro uses a hard paywall with one voice trial:

- A new user can try Ryvro voice once.
- After the first answer, Ryvro Pro is required for ongoing voice answers.
- RevenueCat entitlement source of truth is `pro`.
- Product IDs are `ryvro_pro_monthly` and `ryvro_pro_annual`.

## What Ryvro Answers

Ryvro supports exact-date and range questions through the local offline brain and the online backend.

Examples:

- What shift am I on today?
- What shift am I on tomorrow?
- Am I working next Saturday?
- What shift do I have in two weeks?
- When is my next day off?
- What am I working from June 12 to June 27?
- What do I work over the next 14 days?
- What shift is the first Saturday in August?
- What do I work at the end of the month?

Answers should be friendly, include the user's name when available, use 12-hour time, and avoid technical schedule language.

## Architecture

Ryvro keeps the accurate schedule engine behind a simplified experience.

High-level flow:

1. Onboarding captures the user's repeating pattern and exact phase.
2. The app stores the normalized schedule locally and syncs it to Firebase when available.
3. The offline local brain answers deterministic schedule questions instantly.
4. The online backend handles broader natural-language questions and range parsing.
5. The voice surface reads answers aloud and displays a clean answer card.

Important implementation areas:

- `src/screens/onboarding/premium/` for the current setup flow.
- `src/screens/main/RyvroAskScreen.tsx` for the main voice surface.
- `src/screens/main/SimpleSettingsScreen.tsx` for settings and repair entry points.
- `src/services/VoiceAssistantService.ts` for voice orchestration.
- `src/utils/localShiftBrain.ts` for offline answers.
- `src/utils/shiftQueryTools.ts` for deterministic schedule tools.
- `backend/functions/src/ryvro-brain.ts` for online backend answers.

## Visual System

Use only the current Ryvro palette for active surfaces:

- Dark base.
- Cyan.
- Blue `#147cff`.
- Silver.
- Muted text.

Do not use shift-specific color themes for tabs, status areas, cards, or buttons. Shift type can be shown with words and icons, but the app should remain visually consistent.

## Language

The active product is English-only.

Old locale files may remain for history or migration, but the app runtime should not expose a language picker or localized user-facing copy in the new concept.

## Backend And Firebase

Production Firebase project:

- `ryvro-shift-planner`

Main functions:

- `ryvroBrain`
- `parseShiftScheduleDescription`

Deploy backend functions:

```bash
firebase deploy --only functions --project ryvro-shift-planner
```

## Development

Install dependencies:

```bash
npm ci --legacy-peer-deps
```

Start Expo:

```bash
npm start
```

Run the main quality gates:

```bash
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm --prefix backend/functions test
npm --prefix backend/functions run build
```

Run the full release gate:

```bash
npm run release:check
```

## Release Status

Ryvro is still in launch preparation. The app is not live in the App Store or Google Play until the owner completes store submission, physical-device QA, subscription QA, screenshots, and final review steps.

Current launch handoff files:

- [Release tasks](RYVRO_RELEASE_TASKS.md)
- [Release readiness report](docs/RYVRO_RELEASE_READINESS_REPORT.md)
- [External service setup](docs/RYVRO_EXTERNAL_SERVICE_SETUP.md)
- [RevenueCat handoff](docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md)
- [App Store and TestFlight handoff](docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md)
- [Submit blocker triage](docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md)

## Historical Material

The repository still contains historical documents and archived implementation notes from the old builder, dashboard, calendar, and multi-language direction. Those files are engineering history, not the current product model.

For any new code, docs, screenshots, store copy, or GitHub issue, use the current concept:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.
