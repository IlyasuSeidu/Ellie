# Ryvro Release Task List

Last updated: June 24, 2026

This checklist follows the current Ryvro concept:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.

Ryvro is not being released as a calendar app, dashboard app, roster manager, stats tracker, or multi-language product. Any launch task should support one of these surfaces:

- Onboarding and shift setup.
- Ask screen.
- Settings and setup repair.
- Ryvro Pro paywall.
- Backend voice answers.
- Reminders.
- Legal, store, and account requirements.

Legend: Done · Repo task · Owner task · Blocked

## Product Scope

### Done

- Ryvro brand name, icon direction, domain, social handles, and support address are owner-approved.
- App brand is Ryvro, with native display name `Ryvro`.
- Production package identity is `com.ryvro.shiftplanner`.
- Runtime product language is English-only.
- Main app surface is the Ask screen.
- Bottom tabs are removed from the new concept.
- Settings is opened from the Ask screen.
- Setup and repair flows use plain-language screens instead of exposing a scary editor as the default path.
- Shift-specific colors are removed from active app chrome and primary UI surfaces.
- Voice answers use 12-hour time formatting.
- Offline answer support exists for exact dates and many date ranges.
- Online backend support exists for broad natural-language date and range questions.
- User details can be saved and synced for use in answers.
- Firebase functions were deployed to project `ryvro-shift-planner`.

### Still Required

- Full physical-device QA on iPhone and Android.
- Full RevenueCat sandbox purchase, restore, relock, and entitlement activation QA.
- Final App Store screenshots.
- Final Google Play screenshots.
- App Store submission.
- Google Play production submission.
- Owner legal/content review of public privacy, terms, and support pages.

## Onboarding And Setup

The release setup flow must prove the worker can configure an accurate repeating shift pattern without technical knowledge.

### Required QA

- Fresh install starts with the new Ryvro welcome screen.
- Setup asks for the repeating pattern in simple language.
- Known date selection is clear.
- Known shift selection is clear.
- Exact phase selection works when the known shift has multiple repeated days.
- Shift times use AM and PM everywhere.
- Overnight shift times display as `7:00 PM to 7:00 AM`, without extra next-day helper text.
- Reminder setup works and schedules real notifications when the user opts in.
- Final setup review lets the user fix pattern, date, shift type, times, or reminders.
- The user can try Ryvro voice once after setup.

### Do Not Reintroduce

- Main setup entry into the old Universal Shift Builder.
- Calendar-heavy setup as the primary experience.
- Shift color selection as a core user task.
- Multi-language setup.
- Chat or typing in the onboarding voice trial.

## Ask Screen

The Ask screen is the home of the app.

### Required QA

- Ask screen opens after onboarding.
- Top-right settings icon opens Settings.
- Back navigation from Settings returns to Ask.
- Large mic starts listening.
- User speaks before Ryvro answers.
- Ryvro response appears in one polished answer card.
- Answer includes the user's name when available.
- Answer sounds friendly and natural.
- Answer does not start with malformed words such as `there,`.
- Answer uses 12-hour time.
- Range answers are structured enough to read and listen to.
- No chat composer is visible.
- No typing path is visible.
- No bottom tab bar is visible.
- No `Today`, `Schedule`, `Stats`, or `Profile` tab is visible.

### Example Voice QA Questions

- What shift am I on today?
- What shift am I on tomorrow?
- Am I working next Saturday?
- What shift do I have in two weeks?
- What shift do I have next week Saturday?
- When is my next day off?
- What am I working for the next 7 days?
- What am I working for the next 14 days?
- What am I working from June 12 to June 27?
- What did I work last week?
- What shift is the first Saturday in August?
- What do I work at the end of the month?

## Offline And Online Answers

### Required QA

- Exact-date questions work offline.
- Supported range questions work offline.
- Online backend is used when network is available.
- Offline fallback is used when backend is unavailable.
- Backend questions use the deployed `ryvroBrain` function in `ryvro-shift-planner`.
- Answers are consistent between offline and online for deterministic schedule questions.

## Ryvro Pro

Ryvro uses a hard paywall after one voice trial.

### Required QA

- New user can complete setup and try voice once.
- After the first answer, the paywall appears before further voice use.
- Paying user is not asked to purchase again.
- Existing active entitlement unlocks voice after login.
- Restore purchase activates Ryvro Pro when entitlement `pro` is active.
- RevenueCat products are:
  - `ryvro_pro_monthly`
  - `ryvro_pro_annual`
- RevenueCat entitlement is `pro`.
- App Store Connect product metadata is complete and products are ready for submission.
- Google Play subscriptions remain blocked until Play payments and subscription setup are complete.

## Settings

Settings exists for repair, account, subscription, and support.

### Required QA

- View or fix shift setup opens the new simplified repair path.
- Shift times opens the new simple time screen.
- Reminders opens the new reminder screen.
- User details can be edited and saved.
- Save button leaves the saving state after success or failure.
- Manage subscription opens the correct purchase management path.
- Restore purchase works.
- Support, privacy, terms, and sign out work.

## Store And Legal

### Done

- Trademark/legal clearance for Ryvro completed on June 16, 2026.
- Launch markets reviewed: United States, United Kingdom, Australia, Canada, and New Zealand.
- No blocking conflict found for using Ryvro as the app brand for shift planning software.
- Approved by Ilyasu Seidu.
- Social handles reserved:
  - X: `@getryvro`
  - Instagram: `@getryvro`
  - TikTok: `@getryvro`
  - YouTube: `@getryvro`
  - LinkedIn: `Ryvro`
- Domain: `getryvro.com`.
- Support mailbox: `support@getryvro.com`.

### Owner Tasks Still Required

- Confirm final App Store metadata.
- Confirm final Google Play metadata.
- Confirm privacy policy, terms, and support content.
- Upload final screenshots.
- Run TestFlight physical-device QA.
- Run Google Play internal-track physical-device QA.
- Submit iOS for review.
- Submit Android for production review when eligible.

## Quality Gate Commands

Run before release handoff:

```bash
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm --prefix backend/functions test
npm --prefix backend/functions run build
npm run release:check
```

Deploy backend functions:

```bash
firebase deploy --only functions --project ryvro-shift-planner
```

## Go Or No-Go

Do not submit stores until all are true:

- Physical iPhone QA passes.
- Physical Android QA passes.
- Ryvro Pro purchase, restore, entitlement, relock, and login persistence pass.
- Ask screen answers the required voice QA questions.
- Offline fallback answers deterministic questions.
- Online backend answers broad natural-language date and range questions.
- Screenshots match the new Ryvro visual system.
- Store copy presents Ryvro as a voice shift assistant, not a calendar or dashboard app.
- Legal/support pages are owner-approved.
