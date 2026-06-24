# Ellie Onboarding Physical Device Test Runbook

Last updated: March 15, 2026  
Owner: QA / Product / Engineering  
Applies to: `/Users/Shared/Ellie`

## 1. Purpose

This runbook is the source of truth for thoroughly testing **all onboarding screens** on real devices (not simulator-only), including conditional routing, FIFO/rotating variants, persistence, i18n/RTL, and settings-entry reuse of onboarding screens.

## 2. Scope

### Screens in scope

From `/Users/Shared/Ellie/src/navigation/OnboardingNavigator.tsx`:

1. `Welcome` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
2. `Introduction` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`
3. `ShiftSystem` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumShiftSystemScreen.tsx`
4. `RosterType` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx`
5. `ShiftPattern` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`
6. `CustomPattern` (conditional rotating) -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumCustomPatternScreen.tsx`
7. `FIFOCustomPattern` (conditional FIFO) -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumFIFOCustomPatternScreen.tsx`
8. `PhaseSelector` (rotating) -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumPhaseSelectorScreen.tsx`
9. `FIFOPhaseSelector` (FIFO) -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen.tsx`
10. `StartDate` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumStartDateScreen.tsx`
11. `ShiftTimeInput` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumShiftTimeInputScreen.tsx`
12. `Completion` -> `/Users/Shared/Ellie/src/screens/onboarding/premium/PremiumCompletionScreen.tsx`

### Supporting logic in scope

- Flow routing: `/Users/Shared/Ellie/src/utils/onboardingNavigation.ts`
- State + validation + persistence: `/Users/Shared/Ellie/src/contexts/OnboardingContext.tsx`
- Root route gating: `/Users/Shared/Ellie/src/navigation/AppNavigator.tsx`
- Progress step mapping: `/Users/Shared/Ellie/src/constants/onboardingProgress.ts`
- Language/RTL behavior: `/Users/Shared/Ellie/src/contexts/LanguageContext.tsx`

### Out of scope

- Auth screen deep QA (covered elsewhere)
- Full dashboard analytics/voice deep functional QA (only onboarding handoff sanity is in scope here)

## 3. Device Matrix (Physical)

Run all critical paths on at least:

1. iOS primary device (example: iPhone 13)
2. iOS secondary device with different size/chip (example: iPhone XS Max)
3. Android physical device (mid-range preferred)

For each platform, test:

1. Online network
2. Offline mode during onboarding
3. Low-memory stress (background app switches)

## 4. Language Matrix

Supported runtime languages from `/Users/Shared/Ellie/src/i18n/languageDetector.ts`:

- `en`, `es`, `pt-BR`, `fr`, `ar`, `zh-CN`, `ru`, `hi`, `af`, `zu`, `id`

Minimum requirement:

1. Full onboarding smoke in `en`
2. Full onboarding smoke in `ar` (RTL + app reload path)
3. Spot checks on at least 3 additional non-English locales

## 5. Preconditions

1. Fresh install or onboarding reset before each full-path run.
2. Device date/time set correctly (auto-time on).
3. Build is installable and launches without red screen.
4. `npm run lint`, `npm run type-check`, and full test suite are green before manual signoff.

## 6. Build + Install Commands

From `/Users/Shared/Ellie`:

```bash
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --coverage --watchAll=false --runInBand --forceExit --silent
```

Install on physical iOS device:

```bash
npm run ios -- --device "<Exact Device Name>"
```

Install on physical Android device:

```bash
npm run android -- --device
```

## 7. Reset Between Test Runs

Preferred:

1. Uninstall app
2. Reinstall build

Alternative reset route:

1. Use Profile screen "run onboarding again" path (sets `onboarding:complete` false)
2. Confirm app returns to Onboarding on next root reset

Persistence keys to validate behavior:

- `onboarding:data`
- `onboarding:complete`
- `@ellie_language`

## 8. Mandatory Full-Flow Scenarios

Execute all scenarios end-to-end from `Welcome` to `Completion` -> `Main`.

### Scenario A: Rotating 2-shift standard

1. ShiftSystem: `2-shift`
2. RosterType: `rotating`
3. ShiftPattern: `STANDARD_4_4_4` (or any non-custom rotating pattern)
4. PhaseSelector path
5. StartDate
6. ShiftTimeInput for day/night
7. Completion save

Expected:

1. Route sequence uses `PhaseSelector` (not FIFOPhaseSelector)
2. Completion persists data and sets onboarding complete
3. App lands in Main dashboard

### Scenario B: Rotating 3-shift standard

1. ShiftSystem: `3-shift`
2. Verify RosterType is skipped by routing logic
3. ShiftPattern standard 3-shift compatible
4. PhaseSelector
5. StartDate
6. ShiftTimeInput for morning/afternoon/night stages
7. Completion

Expected:

1. Route order matches 3-shift skip path
2. ShiftTimeInput shows 3-stage behavior

### Scenario C: Rotating custom pattern

1. ShiftSystem: `2-shift` and repeat with `3-shift`
2. RosterType: `rotating`
3. ShiftPattern: `CUSTOM`
4. Complete CustomPattern sliders + validations
5. Continue to PhaseSelector and finish flow

Expected:

1. CustomPattern appears only when `CUSTOM` selected
2. Validation states behave correctly (error/warn/success)

### Scenario D: FIFO standard straight-days

1. ShiftSystem: `2-shift`
2. RosterType: `fifo`
3. ShiftPattern: standard FIFO (example `FIFO_8_6`)
4. FIFOPhaseSelector stage 1: select `straight-days`
5. Block selection -> day-in-block -> continue
6. StartDate + ShiftTimeInput

Expected:

1. FIFOPhaseSelector used
2. Work pattern selected persists to `fifoConfig.workBlockPattern`
3. Day semantics/icons remain day where expected

### Scenario E: FIFO standard straight-nights

Same as D, but select `straight-nights`.

Expected:

1. Night semantics in FIFO phase/day cards
2. StartDate/calendar representation aligns with nights
3. ShiftTimeInput defaults to night-relevant stages where applicable

### Scenario F: FIFO standard swing with split config

1. Select FIFO standard pattern
2. FIFOPhaseSelector stage 1: `swing`
3. Enter swing split config stage
4. Modify day/night split via sliders
5. Continue block/day and finish onboarding

Expected:

1. Swing config stage appears only for swing
2. Split total validation enforces total = work block days
3. Day labels in day-in-block reflect configured split segments

### Scenario G: FIFO custom

1. RosterType: `fifo`
2. ShiftPattern: `FIFO_CUSTOM`
3. Complete FIFOCustomPattern
4. Continue through FIFOPhaseSelector, StartDate, ShiftTimeInput, Completion

Expected:

1. FIFOCustomPattern appears conditionally
2. `fifoConfig` persists custom work/rest/work-pattern data

## 9. Per-Screen Thorough Checklist

For each screen below test:

1. Layout on small and large phone
2. Touch targets (single tap, rapid tap, double tap)
3. Gesture behavior (left/right/up where designed)
4. Back/forward CTA states
5. Haptic triggers (where applicable)
6. Reduced motion compatibility
7. Accessibility labels/roles
8. Localization string rendering
9. Persistence after app background + resume

### Welcome

1. Auto-advance timer fires once (~3 seconds)
2. Manual "Get Started" cancels timer path
3. No duplicate navigation on rapid taps

### Introduction

1. Chat progression for name/occupation/company/country
2. Skip path where allowed
3. Long-press edit/rewind behavior works
4. Keyboard handling and scroll anchoring stable

### ShiftSystem

1. Swipe right selects active card
2. Swipe left moves to next
3. Swipe up opens info modal
4. Progress dots sync with active card

### RosterType

1. Card face is compact (icon/title/subtitle/brief desc)
2. Detailed content only in Learn More modal
3. Swipe interactions mirror ShiftSystem behavior

### ShiftPattern

1. Pattern list filtered by active shiftSystem + rosterType
2. Standard selection advances correctly
3. Custom/FIFO custom selection routes to proper custom screen
4. Settings-entry behavior (if launched from settings) honors save/back semantics

### CustomPattern (rotating)

1. Slider interactions, preview update, and validations
2. No stuck state on save/back
3. Settings-entry: back does not save, save persists

### FIFOCustomPattern

1. Copy clarity and step comprehension
2. Work pattern cards switch day/night/swing correctly
3. Swing config appears only for swing and stays synced
4. Preview title and card semantics match selected work pattern
5. Status messaging states (error/warn/success) accurate
6. Settings-entry back/save semantics

### PhaseSelector (rotating)

1. Correct phase card semantics for 2-shift vs 3-shift
2. Day-in-phase stage appears when needed
3. `phaseOffset` result maps correctly
4. Settings-entry stage save/back behavior

### FIFOPhaseSelector

1. Stage order:
   - Standard FIFO: Work Pattern -> (Swing Config if swing) -> Current Block -> Day in Block
   - FIFO_CUSTOM: Current Block -> Day in Block
2. Swipe hints and X-days badges visible on both block cards
3. One-shot navigation guard (no duplicate transitions)
4. Work-block semantics adapt to straight-days / straight-nights / swing
5. Persisted `fifoConfig` includes selected work pattern and split

### StartDate

1. Calendar month navigation and day selection
2. Phase-aware positioning from `phaseOffset`
3. FIFO icons/labels align with selected FIFO work pattern
4. Settings-entry mode:
   - Back exits to settings
   - Save persists start date and returns

### ShiftTimeInput

1. Preset cards render for active stage
2. Custom input validates hour/minute and overnight transitions
3. Auto-detected shift-type metadata correctness
4. Stage progression:
   - Rotating 2-shift: day/night
   - Rotating 3-shift: morning/afternoon/night
   - FIFO pattern-aware stages
5. Settings-entry mode:
   - Back exits to settings without stage-back traversal
   - Save & Return persists current stage and exits

### Completion

1. Save-on-mount and loading state behavior
2. Error state + retry path
3. Summary displays chosen data correctly
4. Final CTA transitions to Main app
5. `onboarding:complete = true` and `onboarding:data` persisted

## 10. Settings-Entry Onboarding Reuse Tests (Mandatory Regression Block)

From Profile/Shift Settings, verify onboarding screens opened in settings mode:

1. ShiftPattern
2. CustomPattern
3. FIFOCustomPattern
4. PhaseSelector
5. FIFOPhaseSelector
6. StartDate
7. ShiftTimeInput

For each:

1. Back does not apply staged changes
2. Save applies changes
3. Returns directly to settings/profile
4. No accidental onboarding progression when in settings mode

## 11. Localization + RTL Tests

### Required checks

1. Run one full onboarding in English
2. Run one full onboarding in Arabic
3. Spot-check all other supported languages on at least:
   - Welcome
   - ShiftPattern
   - FIFOPhaseSelector
   - Completion

### Arabic-specific

1. Changing language to Arabic triggers applying-language overlay
2. App reload path completes
3. RTL direction applied across onboarding screens
4. Switching back to LTR language reloads and restores LTR

## 12. Stability + Interruption Tests

Run these at least once per platform:

1. Kill app at each major step, relaunch, verify resume state
2. Lock/unlock phone mid-step
3. Background app for >60 seconds and return
4. Toggle airplane mode during onboarding
5. Change timezone and verify date/time-dependent screens still coherent

## 13. Accessibility Tests (Physical)

1. VoiceOver (iOS) and TalkBack (Android) on critical screens
2. Screen reader focus order for CTA-heavy screens
3. Verify labels on:
   - card actions
   - save/back actions
   - day cells in date/phase selectors
4. Dynamic text scaling sanity check (at least one pass)

## 14. Evidence Capture Standard

For every full flow run capture:

1. Device model + OS version
2. App build identifier
3. Flow variant ID (A-G above)
4. Screen recording from Welcome to Completion
5. Key screenshots:
   - ShiftPattern selection
   - Phase/FIFOPhase selector final day selection
   - StartDate with selected day
   - ShiftTimeInput final stage
   - Completion success

Naming format:

`<date>-<platform>-<device>-<flowId>-<locale>-<result>.mp4/png`

## 15. Defect Logging Format

For every bug:

1. Title
2. Build + device + OS
3. Flow ID + exact screen
4. Preconditions
5. Repro steps
6. Expected result
7. Actual result
8. Attachments (video/screenshot/log)
9. Severity: blocker/high/medium/low

## 16. Exit Criteria (Go/No-Go)

Do not sign off onboarding physical QA until all are true:

1. All scenarios A-G pass on at least one iOS and one Android physical device
2. No blocker/high defects open
3. Localization checks pass including Arabic RTL reload
4. Settings-entry onboarding reuse tests pass
5. Completion persistence verified (`onboarding:complete`, `onboarding:data`)
6. CI-equivalent quality gate passes on same commit:
   - `npm run lint`
   - `npm run type-check`
   - `npm test -- --coverage --watchAll=false --runInBand --forceExit --silent`

## 17. Recommended Command Bundle for Test Day

```bash
cd /Users/Shared/Ellie
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --coverage --watchAll=false --runInBand --forceExit --silent
```

iOS install:

```bash
npm run ios -- --device "<Device Name>"
```

Android install:

```bash
npm run android -- --device
```
