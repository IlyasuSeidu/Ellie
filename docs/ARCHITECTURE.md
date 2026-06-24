# Ryvro Architecture

Last updated: 2026-06-24

Ryvro is a voice-first shift assistant.

The architecture supports this product promise:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.

The accurate schedule engine still exists, but the user should not feel like they are managing a calendar, dashboard, or technical roster editor.

## Product Surfaces

### Onboarding And Setup

Setup captures the minimum data needed for accurate answers:

- Repeating shift pattern.
- Known date.
- Shift type on the known date.
- Exact phase when a shift type appears more than once in the cycle.
- Shift times in 12-hour format.
- Reminder preference.

The setup UI is intentionally plain-language and modern. It should not expose engine terms such as phase offset, recurrence rule, sequence block, or builder state.

### Ask

Ask is the main app surface.

It owns:

- Microphone interaction.
- Listening, processing, and speaking states.
- One clean Ryvro answer card.
- Settings entry point.
- Paywall trigger after the free voice trial.

There is no main bottom tab bar in the current concept.

### Settings

Settings owns:

- Setup repair paths.
- Shift times.
- Reminders.
- User details.
- Subscription management.
- Support, privacy, terms, and sign out.

Settings should open simplified repair screens first. Any advanced editor must stay hidden as a fallback, not as the default user path.

## Schedule Data Flow

```text
Setup screens
  -> normalized shift schedule
  -> local storage
  -> Firebase sync when available
  -> offline local brain
  -> online backend when available
  -> voice answer card and spoken response
```

## Main Runtime Layers

### Presentation

Key areas:

- `src/screens/onboarding/premium/`
- `src/screens/main/RyvroAskScreen.tsx`
- `src/screens/main/SimpleSettingsScreen.tsx`
- `src/components/paywall/`
- `src/navigation/`

Rules:

- Keep visible copy plain English.
- Use the Ryvro palette only: dark base, cyan, blue `#147cff`, silver, and muted text.
- Do not use shift-specific colors in app chrome, cards, tabs, status areas, or primary actions.
- Do not add typing or chat UI to the main voice experience.

### Schedule Engine

Key areas:

- `src/utils/localShiftBrain.ts`
- `src/utils/shiftQueryTools.ts`
- `src/utils/universalShiftUtils.ts`
- `src/utils/universalShiftScheduleUtils.ts`
- `src/utils/knownShiftPhase.ts`

Rules:

- Keep deterministic schedule math local and testable.
- Preserve exact phase alignment.
- Use 12-hour answer formatting.
- Prefer structured date/range handling before generic AI text.

### Voice Orchestration

Key areas:

- `src/services/VoiceAssistantService.ts`
- `src/utils/voiceAssistantPrompts.ts`
- speech recognition integrations
- speech output integrations

Rules:

- The user speaks first.
- Ryvro answers only after speech input is captured.
- Spoken and written answers should match.
- Answer text should include the user's name when available.
- Answers should be friendly without adding duplicate filler.

### Backend

Key areas:

- `backend/functions/src/ryvro-brain.ts`
- `backend/functions/src/__tests__/ryvro-brain.test.ts`

Production project:

- `ryvro-shift-planner`

Main functions:

- `ryvroBrain`
- `parseShiftScheduleDescription`

Rules:

- Prefer deterministic date and range resolution before model fallback.
- Keep exact-date and date-range tools consistent with the offline local brain.
- Never answer as if a schedule is generic when a saved schedule is available.

### Persistence And Sync

Key areas:

- Firebase Auth
- Cloud Firestore
- local storage services
- user details services
- onboarding data persistence

Rules:

- User details entered in the app should sync to the backend when possible.
- Local state should remain usable offline.
- Save buttons must leave loading state on success or failure.
- Backend failures should fall back cleanly for deterministic schedule answers.

### Subscription

Key areas:

- `src/contexts/SubscriptionContext.tsx`
- `src/components/paywall/`
- RevenueCat SDK integration

Rules:

- Entitlement ID is `pro`.
- Product IDs are `ryvro_pro_monthly` and `ryvro_pro_annual`.
- One free voice answer is allowed.
- After the first answer, ongoing voice use requires Ryvro Pro.
- A purchased user must not be sent back to the paywall when entitlement is active.

## Date And Range Handling

Ryvro should answer:

- Today.
- Tomorrow.
- Exact dates.
- Named weekdays.
- Next week and later named weekdays.
- Next 7 days.
- Next 14 days.
- Date ranges such as June 12 to June 27.
- Last week.
- First Saturday in August.
- End of the month.

Range answers must be structured for reading and listening.

## English-Only Runtime

The current product is English-only.

Old locale files may remain in the repository for history or migration, but active runtime screens should not expose multi-language selection or localized product experiences.

## Historical Material

Older documents may mention dashboards, tabs, broad builders, imports, exports, stats, or multi-language launch work. Treat those as history unless the README and this architecture document explicitly say the same thing.
