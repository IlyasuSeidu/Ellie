# Ryvro Release Readiness Report

Date: 2026-05-30
Branch: `codex/ryvro-rebrand-rollout`
Open PR: `https://github.com/IlyasuSeidu/Ellie/pull/1`

This report is the current handoff for the Ryvro rebrand. It separates repo-proven work from account-only or device-only work that still needs the owner, console access, counsel, or physical hardware.

## Repo-Proven Status

Completed and guarded in the current branch:

- Public app identity is `Ryvro Shift Planner`, short native label is `Ryvro`, and bundle/package is `com.ryvro.shiftplanner`.
- Tracked Expo, generated iOS, generated Android, Detox release config, and e2e storage paths use the Ryvro identity.
- App icon, adaptive icon, splash image, favicon, onboarding assistant avatar, and public build-in-progress copy no longer use the retired mining-helmet default brand motif.
- Launch-critical English UI, selected translated user-facing assistant/paywall strings, calendar export metadata, reminders, settings/dashboard copy, and support/store/legal templates use Ryvro language.
- French, Afrikaans, Arabic, Spanish, Portuguese, Hindi, Russian, Chinese, Indonesian, and Zulu launch-critical onboarding/profile copy now use broad work-location and occupation-placeholder language instead of mining-site or mining/trades-only phrasing in roster setup, FIFO phase selection, and reminder labels.
- Backend daily intelligence prompts now describe Ryvro's launch audience across FIFO, healthcare, security, emergency services, transport, hospitality, manufacturing, mining, and other shift-work teams instead of treating mining/FIFO as the only launch lens.
- Universal fixtures and launch templates now cover healthcare, security, emergency services, manufacturing, transport/logistics, hospitality, separate aviation and rail operations, mining/FIFO, and call-center/operations examples.
- The default completed E2E seed and fresh onboarding E2E happy path now use healthcare worker data rather than a miner-only default.
- RevenueCat repo-side identifiers and guidance use Ryvro launch aliases while keeping old Ellie/miner aliases documented as compatibility-only migration inputs.
- RevenueCat launch env templates now include both native and Expo public platform SDK keys, and the production env preflight rejects mismatched public/native key pairs before EAS builds.
- Firebase/backend repo config exposes `ryvroBrain` and uses `RYVRO_BRAIN_*` as the preferred environment names while preserving old `ELLIE_BRAIN_*` keys only as migration fallbacks.
- CI and E2E workflows now exercise only `RYVRO_BRAIN_*` endpoint variables; legacy `ELLIE_BRAIN_*` names are no longer exported in workflow environments.
- New Expo config no longer mirrors `RYVRO_BRAIN_*` into legacy `ELLIE_BRAIN_*` extras; legacy brain values stay empty unless an old environment explicitly supplies them for migration.
- The active API reference now uses a broad healthcare rotating-schedule example and current Ryvro launch configuration: `RYVRO_BRAIN_*`, `ryvroBrain`, fresh Firebase config paths, RevenueCat native/public key pairs, and `npm run release:env:check`.
- The internal OpenWakeWord Expo module now uses Ryvro-branded package, native module, Android namespace, iOS podspec, resource bundle, and JS adapter identifiers.
- The ignored generated iOS CocoaPods workspace was refreshed on 2026-05-30; `pod install` installed `RyvroOpenWakeWord`, removed `EllieOpenWakeWord`, and `ios/Podfile.lock` now points at `../modules/ryvro-openwakeword/ios`.
- Native iOS build metadata now resolves to `FULL_PRODUCT_NAME = Ryvro.app`, `WRAPPER_NAME = Ryvro.app`, `PRODUCT_NAME = Ryvro`, and `PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner`; the remaining `TARGET_NAME = Ellie` is internal Xcode target scaffolding.
- Stale generated Detox artifacts from the retired iOS app identity were removed from the tracked tree; `artifacts/` is now ignored so current release evidence stays in docs and fresh CI/test output instead of checked-in logs.
- Dashboard quick actions now route to implemented launch surfaces instead of dead tap targets: builder/export actions enter the Universal Shift Builder, and alert/profile actions open the Profile tab.
- Schedule and Stats helper screens no longer present launch users with "Coming Soon" copy; they point users to the shipped Shift Builder, dashboard metrics, calendar import/export, exceptions, reminders, and profile schedule settings in every bundled locale.

## Current Public Clearance Evidence

`npm run release:clearance` was run on 2026-05-31 at `2026-05-31T05:16:18.075Z`.

- Apple public software search returned 5 fuzzy results and no exact `Ryvro` or `Ryvro Shift Planner` app result.
- Google Play public search returned no exact `Ryvro` or `Ryvro Shift Planner` result text; visible fuzzy names were `Rydoo`, `Rydora`, `Ryver`, and `Ryver LLC`.
- Chrome/Computer Use previously read the public Google Play search page for `Ryvro` on 2026-05-30. Visible public results included fuzzy/non-conflicting names such as Rolify, Rydoo, and Rydora, with no exact Ryvro listing visible. This is still not logged-in Play Console evidence; Play Console title/package availability requires account-owner verification.
- USPTO Trademark Search was reachable, but this is not legal trademark clearance.
- `getryvro.com`, `useryvro.com`, `tryryvro.com`, and `getryvroapp.com` had no public DNS records and Verisign `.com` returned no match.
- `ryvro.com` is already registered through GoDaddy/Afternic and should not be treated as available unless purchased from the current registrant.
- `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, and `ryvro.org` had no public DNS records in the preflight, but registrar availability still needs direct confirmation.
- X, Instagram, and TikTok `@ryvro` returned public `200` responses; this does not prove ownership or availability.
- YouTube `@ryvro` returned public `404`; LinkedIn `company/ryvro` returned public `404`; both still require logged-in reservation checks.

## Verification Completed

- `npm test -- ryvroEnvTemplate --runInBand`: passed on 2026-05-29 after the latest public-content guard update.
- Focused Phase 9 automated QA passed on 2026-05-29:
  - `npm test -- AuthService SignInScreen ShiftScheduleParserService universalShiftEdgeCases MonthlyCalendarCard ShiftSettingsPanel PremiumWelcomeScreen SmartReminderService --runInBand`: 8 suites, 162 tests.
  - `npm test -- universalShiftCalendarUtils HolidayService NotificationService SmartReminderSettingsService shift-schedule-parser --runInBand`: 4 suites, 107 tests.
  - `npm test` in `backend/functions`: TypeScript build plus 38 Node tests.
- `npm test -- --runInBand --silent tests/config/universalShiftTemplates.test.ts tests/config/ryvroEnvTemplate.test.ts`: passed on 2026-05-30, including guards that completed E2E onboarding seeds carry Universal Shift Builder schedules and the fresh onboarding E2E happy path uses non-mining healthcare worker data.
- `pod install` in `ios/`: passed on 2026-05-30 and regenerated the ignored local CocoaPods metadata from `EllieOpenWakeWord` to `RyvroOpenWakeWord`.
- `E2E_TEST_MODE=1 npx expo start --localhost` plus `npx detox test --configuration ios.release e2e/dashboard.test.ts --reuse`: passed on 2026-05-29 on the iPhone 16 simulator, 15 dashboard smoke tests.
- `E2E_TEST_MODE=1 npx detox test --configuration ios.release.xsmax e2e/dashboard.test.ts`: passed on 2026-05-29 on the iPhone XS Max simulator, 15 dashboard smoke tests. The run uninstalled the previous app first, installed the rebuilt `Ryvro.app`, and verified the small-screen dashboard smoke without the RevenueCat release guard alert.
- `npm test -- RevenueCatRuntime ryvroEnvTemplate --runInBand`: passed on 2026-05-29 after adding the E2E RevenueCat runtime guard and treating `test_` RevenueCat keys as unavailable launch keys.
- `npm run validate`: passed on 2026-05-29 after the latest Phase 9 E2E seed and selector updates.
- Recent pushed GitHub Actions check for PR #1 passed on commit `610795d`: CI run `26678024310` passed Lint and Type Check, Unit Tests, and Build Check.
- Earlier same-day pushed GitHub Actions checks also passed on commits `f004097`, `10353e7`, `3f92d56`, `90d403d`, and `82fd530`, covering dashboard quick actions, release env template alignment, legal launch URLs, EAS scaffolding, and production env preflight.
- Local release verification on 2026-05-30 passed `git diff --check`, focused config tests, and `npm run release:check` after the non-mining E2E onboarding fixture update. The release check included TypeScript, 106 Jest suites / 1,729 tests, and the backend functions TypeScript build.
- Local release verification on 2026-05-30 passed focused RevenueCat/config tests and `npm run release:check` after the RevenueCat env mirror guard update. The release check included TypeScript, 106 Jest suites / 1,731 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-30 passed focused API-reference/config tests and `npm run release:check` after the active API reference launch-configuration update. The release check included TypeScript, 106 Jest suites / 1,732 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused readiness/audit config tests, `npm run release:clearance`, and `npm run release:check` after refreshing the launch-readiness handoff. The release check included TypeScript, 106 Jest suites / 1,732 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused README/deployment-plan config tests, and `npm run release:check` after adding the README release status snapshot. The release check included TypeScript, 106 Jest suites / 1,734 tests, 4 snapshots, and the backend functions TypeScript build.
- Latest pushed GitHub Actions check for PR #1 passed on commit `47441dd`: CI run `26704558053` passed Unit Tests, Lint and Type Check, and Build Check.
- Previous pushed GitHub Actions checks for PR #1 passed on commit `3d85add` with CI run `26704249051` and commit `e638418` with CI run `26679223794`.
- Prior completed pushed GitHub Actions baseline for the Android release E2E readiness change: CI run `26659012373` passed for commit `92a52ab`.
- iOS release simulator build command `npm run test:e2e:build:ios`: previously passed on 2026-05-29T15:22:59Z with built plist values `CFBundleDisplayName = Ryvro`, `CFBundleName = Ryvro`, and `CFBundleIdentifier = com.ryvro.shiftplanner`.
- `xcodebuild -workspace ios/Ellie.xcworkspace -scheme Ellie -configuration Release -showBuildSettings | rg "PRODUCT_NAME|FULL_PRODUCT_NAME|PRODUCT_BUNDLE_IDENTIFIER|WRAPPER_NAME|TARGET_NAME|INFOPLIST_FILE"`: passed on 2026-05-30 and reported `FULL_PRODUCT_NAME = Ryvro.app`, `WRAPPER_NAME = Ryvro.app`, `PRODUCT_NAME = Ryvro`, and `PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner`.
- Android debug build passed on 2026-05-29 with `cd android && ./gradlew assembleDebug`; the generated APK reported package `com.ryvro.shiftplanner`, versionCode `1`, and versionName `1.0.0`.
- Android release-style Detox build passed on 2026-05-29 with `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox build --configuration android.release`.
- Android release-style Detox dashboard smoke passed on 2026-05-29 with `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/dashboard.test.ts`: 15 dashboard smoke tests on `Medium_Phone_API_36.0`.
- Android release-style Detox auth form/navigation smoke passed on 2026-05-29 with `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/auth.test.ts`: 16 auth tests on `Medium_Phone_API_36.0`.
- Android release-style Detox onboarding happy path passed on 2026-05-29 with `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/onboarding.test.ts`: Welcome through Introduction, Universal Shift Builder template save, AhaMoment, and Completion.
- Android release-style Detox profile language-selector smoke passed on 2026-05-29 with `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/profile.test.ts`: 3 profile tests on `Medium_Phone_API_36.0`.

## Device QA Notes

Completed:

- Available simulator build/install identity was verified through the Detox iOS release build path and generated plist evidence.
- Small-screen simulator QA passed on an iPhone XS Max simulator with 15 dashboard smoke tests.
- Android build identity was verified from the debug APK package metadata.
- Android release-style emulator dashboard QA passed on `Medium_Phone_API_36.0` with 15 Detox dashboard smoke tests.
- Android release-style emulator auth, onboarding through Universal Shift Builder, and profile language-selector QA passed on `Medium_Phone_API_36.0`.

Still pending:

- Physical iPhone 13 fresh install, auth, Universal Builder, dashboard color/icon, reminders, exceptions, and import/export QA.
- Physical iPhone XS Max QA if physical-device coverage remains a release requirement; the iPhone XS Max simulator small-screen smoke has passed.
- Physical Android device QA. Android release-style build, dashboard, auth form/navigation, onboarding through Universal Shift Builder, and profile language-selector smoke now pass on an emulator, but this is not complete production device coverage.
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
