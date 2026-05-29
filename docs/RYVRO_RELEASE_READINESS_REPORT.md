# Ryvro Release Readiness Report

Date: 2026-05-29
Branch: `codex/ryvro-rebrand-rollout`
Current rollback point before this report: commit `9570a6e` (`Remove retired helmet motif from Ryvro public content`)

This report is the current handoff for the Ryvro rebrand. It separates repo-proven work from account-only or device-only work that still needs the owner, console access, counsel, or physical hardware.

## Repo-Proven Status

Completed and guarded in the current branch:

- Public app identity is `Ryvro Shift Planner`, short native label is `Ryvro`, and bundle/package is `com.ryvro.shiftplanner`.
- Tracked Expo, generated iOS, generated Android, Detox release config, and e2e storage paths use the Ryvro identity.
- App icon, adaptive icon, splash image, favicon, onboarding assistant avatar, and public build-in-progress copy no longer use the retired mining-helmet default brand motif.
- Launch-critical English UI, selected translated user-facing assistant/paywall strings, calendar export metadata, reminders, settings/dashboard copy, and support/store/legal templates use Ryvro language.
- Universal fixtures and launch templates now cover healthcare, security, emergency services, manufacturing, transport/logistics, hospitality, aviation/rail, mining/FIFO, and call-center/operations examples.
- RevenueCat repo-side identifiers and guidance use Ryvro launch aliases while keeping old Ellie/miner aliases documented as compatibility-only migration inputs.
- Firebase/backend repo config exposes `ryvroBrain` and uses `RYVRO_BRAIN_*` as the preferred environment names while preserving old `ELLIE_BRAIN_*` keys only as migration fallbacks.

## Current Public Clearance Evidence

`npm run release:clearance` was run on 2026-05-29 at `2026-05-29T17:04:00.191Z`.

- Apple public software search returned 5 fuzzy results and no exact `Ryvro` or `Ryvro Shift Planner` app result.
- Google Play public search returned no exact `Ryvro` or `Ryvro Shift Planner` result text; visible fuzzy names were `Rydoo` and `Rydora`.
- Chrome read-only Google Play search for `Ryvro` showed visible public results such as `Rolify`, `Land Rover Remote`, `Rvolution Remote`, `Rydoo`, and `Rydora`, with no exact `Ryvro` or `Ryvro Shift Planner` visible.
- USPTO Trademark Search was reachable, but this is not legal trademark clearance.
- `getryvro.com`, `useryvro.com`, `tryryvro.com`, and `getryvroapp.com` had no public DNS records and Verisign `.com` returned no match.
- `ryvro.com` is already registered through GoDaddy/Afternic and should not be treated as available unless purchased from the current registrant.
- `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, and `ryvro.org` had no public DNS records in the preflight, but registrar availability still needs direct confirmation.
- X, Instagram, and TikTok `@ryvro` returned public `200` responses; this does not prove ownership or availability.
- YouTube `@ryvro` returned public `404`; LinkedIn `company/ryvro` returned `999`; both still require logged-in reservation checks.

## Verification Completed

- `npm test -- ryvroEnvTemplate --runInBand`: passed on 2026-05-29 after the latest public-content guard update.
- Focused Phase 9 automated QA passed on 2026-05-29:
  - `npm test -- AuthService SignInScreen ShiftScheduleParserService universalShiftEdgeCases MonthlyCalendarCard ShiftSettingsPanel PremiumWelcomeScreen SmartReminderService --runInBand`: 8 suites, 162 tests.
  - `npm test -- universalShiftCalendarUtils HolidayService NotificationService SmartReminderSettingsService shift-schedule-parser --runInBand`: 4 suites, 107 tests.
  - `npm test` in `backend/functions`: TypeScript build plus 38 Node tests.
- `npm test -- universalShiftTemplates ryvroEnvTemplate --runInBand`: passed on 2026-05-29, including a guard that completed E2E onboarding seeds carry Universal Shift Builder schedules.
- `E2E_TEST_MODE=1 npx expo start --localhost` plus `npx detox test --configuration ios.release e2e/dashboard.test.ts --reuse`: passed on 2026-05-29 on the iPhone 16 simulator, 15 dashboard smoke tests.
- `E2E_TEST_MODE=1 npx detox test --configuration ios.release.xsmax e2e/dashboard.test.ts`: passed on 2026-05-29 on the iPhone XS Max simulator, 15 dashboard smoke tests. The run uninstalled the previous app first, installed the rebuilt `Ryvro.app`, and verified the small-screen dashboard smoke without the RevenueCat release guard alert.
- `npm test -- RevenueCatRuntime ryvroEnvTemplate --runInBand`: passed on 2026-05-29 after adding the E2E RevenueCat runtime guard and treating `test_` RevenueCat keys as unavailable launch keys.
- `npm run validate`: passed on 2026-05-29 after the latest Phase 9 E2E seed and selector updates.
- Latest completed pushed GitHub Actions baseline for the Phase 9 code change: CI run `26652464303` passed for commit `b2c475b`.
- iOS release simulator build command `npm run test:e2e:build:ios`: previously passed on 2026-05-29T15:22:59Z with built plist values `CFBundleDisplayName = Ryvro`, `CFBundleName = Ryvro`, and `CFBundleIdentifier = com.ryvro.shiftplanner`.
- Android debug build passed on 2026-05-29 with `cd android && ./gradlew assembleDebug`; the generated APK reported package `com.ryvro.shiftplanner`, versionCode `1`, and versionName `1.0.0`.

## Device QA Notes

Completed:

- Available simulator build/install identity was verified through the Detox iOS release build path and generated plist evidence.
- Small-screen simulator QA passed on an iPhone XS Max simulator with 15 dashboard smoke tests.
- Android build identity was verified from the debug APK package metadata.

Still pending:

- Physical iPhone 13 fresh install, auth, Universal Builder, dashboard color/icon, reminders, exceptions, and import/export QA.
- Physical iPhone XS Max QA if physical-device coverage remains a release requirement; the iPhone XS Max simulator small-screen smoke has passed.
- Android install and Android auth/Universal Builder QA. The build passed, but no Android device or emulator was attached (`adb devices` returned no devices, and `emulator` was not available on PATH).
- Google Sign-In and Apple Sign-In smoke tests after fresh Firebase/OAuth/Apple console configuration is generated for `com.ryvro.shiftplanner`.

## Account-Only Work

These items cannot be proven from the repo alone:

- Formal trademark/legal clearance in launch markets.
- App Store Connect app-name reservation for `Ryvro Shift Planner`.
- Google Play Console app-title and `com.ryvro.shiftplanner` package reservation.
- Registrar purchase/reservation for the preferred domain, with `getryvro.com` still the cleanest public candidate.
- Logged-in social handle reservation.
- Fresh Firebase iOS/Android app configs and OAuth clients for `com.ryvro.shiftplanner`.
- RevenueCat dashboard display-name, product, offering, and entitlement cleanup if production still contains retired Ellie/miner names.
- Production Firebase deploy and smoke test for the `ryvroBrain` endpoint before retiring the legacy `ellieBrain` compatibility endpoint.

## Merge Readiness

The repo-side Ryvro rebrand is materially ready for review, but launch is not complete until the account-only and physical-device checks above are done. Treat the branch as merge-reviewable engineering work, not as fully launch-cleared production release evidence.
