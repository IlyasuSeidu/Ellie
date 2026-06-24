# Ryvro Release Readiness Report

Date: 2026-06-24

This report tracks the current Ryvro launch concept:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.

Ryvro is not being prepared as a calendar app, dashboard app, broad roster manager, stats tracker, or multi-language product.

## Repo-Proven Status

Current repo-side direction:

- Public brand is `Ryvro`.
- Native display name is `Ryvro`.
- Bundle and package identity is `com.ryvro.shiftplanner`.
- Runtime app experience is English-only.
- New visual system uses dark base, cyan, blue `#147cff`, silver, and muted text.
- Main post-onboarding surface is the Ask screen.
- Bottom tabs are removed from the current app concept.
- Settings is opened from the Ask screen.
- Setup and settings repair paths use simplified screens.
- Shift-specific color themes have been removed from active UI chrome and primary components.
- Voice answers use 12-hour AM and PM formatting.
- User details can be saved, synced, and used in answers.
- Offline local answer support exists for deterministic schedule questions.
- Online backend answer support exists through `ryvroBrain`.
- Backend functions were deployed to Firebase project `ryvro-shift-planner`.

## Current Launch Flow

1. User signs in or creates an account.
2. User completes simplified shift setup.
3. User reviews the setup.
4. User tries Ryvro voice once.
5. User lands on the Ask screen.
6. After the first answer, ongoing voice use is gated by Ryvro Pro.
7. Settings remains available for setup repair, user details, reminders, subscription, and support.

## Current Required QA

### Setup

- Fresh install onboarding reaches the new setup flow.
- Pattern setup is understandable without technical terms.
- Known date and known shift type save correctly.
- Exact phase selection prevents the schedule from lining up on the wrong repeated shift.
- Shift times display in 12-hour format everywhere.
- Overnight times display cleanly, such as `7:00 PM to 7:00 AM`.
- Reminder preference saves and schedules real notifications.
- Setup review repair paths return the user to the right place.

### Voice

- Ask screen opens after onboarding.
- Microphone starts listening only when the user taps the mic.
- Ryvro answers only after the user speaks.
- Answer card remains visible.
- Answer includes the user's name when available.
- Answer text and spoken answer are pleasant, clear, and not duplicated.
- Exact-date questions are accurate.
- Named weekday questions are accurate.
- Range questions are formatted clearly.
- Offline fallback answers deterministic questions when backend is unavailable.
- Online backend answers broad natural-language questions when available.

### Subscription

- One free voice answer works.
- Paywall appears after the first answer for non-Pro users.
- A purchased user is not sent back to paywall.
- Restore purchase activates Pro when RevenueCat entitlement `pro` is active.
- Monthly and annual products are loaded from RevenueCat and the stores.

### Settings

- Settings icon opens Settings from Ask.
- Back navigation returns to Ask.
- User details edit and save.
- Fix setup opens simplified repair flow.
- Fix times opens simplified time flow.
- Fix reminders opens simplified reminder flow.
- Support, privacy, terms, restore purchase, manage subscription, and sign out work.

## Account And External Status

### Completed

- Trademark/legal clearance for Ryvro completed on June 16, 2026.
- Launch markets reviewed: United States, United Kingdom, Australia, Canada, and New Zealand.
- Clearance source: owner trademark search packet.
- Result: no blocking conflict found for using Ryvro as the app brand for shift planning software.
- Approved by Ilyasu Seidu.
- Domain `getryvro.com` is controlled.
- Support email is `support@getryvro.com`.
- Social handles:
  - X: `@getryvro`
  - Instagram: `@getryvro`
  - TikTok: `@getryvro`
  - YouTube: `@getryvro`
  - LinkedIn: `Ryvro`
- Firebase project for Ryvro is `ryvro-shift-planner`.
- `ryvroBrain` and `parseShiftScheduleDescription` were deployed to the Ryvro Firebase project.

### Still Required Before Store Launch

- Physical iPhone TestFlight QA.
- Physical Android internal-track QA.
- RevenueCat sandbox purchase and restore QA.
- Confirm App Store subscription purchase activates entitlement `pro`.
- Complete Google Play subscription setup after payment account blocker is cleared.
- Capture final store screenshots from the new Ryvro screens.
- Owner legal/content review for privacy, terms, and support pages.
- Final App Store metadata review and submission.
- Final Google Play production review when eligible.

## Current Backend Evidence

Deploy command used for the correct project:

```bash
firebase deploy --only functions --project ryvro-shift-planner
```

Deployed functions include:

- `ryvroBrain`
- `parseShiftScheduleDescription`

The deploy output confirmed `ryvroBrain` updated successfully in `ryvro-shift-planner`.

## Current Quality Gate

Run this before release handoff:

```bash
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm --prefix backend/functions test
npm --prefix backend/functions run build
npm run release:check
```

## Documentation Source Of Truth

- `README.md`
- `docs/ARCHITECTURE.md`
- `RYVRO_RELEASE_TASKS.md`
- `docs/RYVRO_STORE_LISTING.md`
- `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md`
- `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md`
- `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md`

Older documents that mention dashboards, tabs, calendar-first UX, broad builders, imports, exports, stats, or multi-language launch work are historical unless they match the current concept above.
