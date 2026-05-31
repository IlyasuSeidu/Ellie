# Ryvro Release Readiness Report

Date: 2026-05-31
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
- Backend daily intelligence prompts and research-funnel persona scoring now describe Ryvro's launch audience across FIFO, healthcare, security, emergency services, transport, hospitality, manufacturing, mining, and other shift-work teams instead of treating mining/FIFO as the only launch lens.
- The active research-funnel operating-system and automation prompt docs now match the runtime launch-persona model, including healthcare rotating clinicians, security/emergency operators, transport/logistics workers, hospitality/manufacturing workers, and mining/FIFO workers.
- Universal fixtures and launch templates now cover healthcare, security, emergency services, manufacturing, transport/logistics, hospitality, separate aviation and rail operations, mining/FIFO, and call-center/operations examples.
- Store-submission form draft now covers App Store privacy answers, Google Play Data safety answers, content rating, export compliance, and reviewer notes for the account-owner console steps.
- Owner launch runbook now sequences clearance, console setup, Firebase/OAuth/backend secrets, RevenueCat products, legal/support publication, production builds, device QA, and store submission evidence.
- Screenshot capture checklist now defines store-ready App Store and Google Play screenshot file names, device sizes, capture preconditions, native-build-only rules, and evidence-log fields for the account owner.
- Store readiness preflight now runs inside `npm run release:check`; it validates tracked App Store/Google Play copy limits, required screenshot specs, reviewer/support values, RevenueCat product IDs, data-safety draft anchors, and forbidden claim patterns before store metadata is copied into the consoles.
- Owner handoff preflight now runs inside `npm run release:check`; it validates that clearance, console reservations, Firebase/OAuth/EAS/RevenueCat setup, production backend smoke, device QA, screenshots, store forms, and the "not live yet" stop gates remain documented.
- Final EAS submit readiness now has a separate owner-only guard, `npm run release:submit:check`, which intentionally fails until EAS submit placeholders are replaced and required evidence-log rows are marked `Passed` or explicitly `Not applicable` with non-secret notes.
- GitHub Actions CI now includes a dedicated `Release Check` job that runs `npm run release:check`, so pushed PRs exercise the same TypeScript, Jest, native scaffold, store readiness, and backend build gate used locally.
- The default completed E2E seed and fresh onboarding E2E happy path now use healthcare worker data rather than a miner-only default.
- The launch smoke-test matrix now follows the shipped Universal Shift Builder entry modes: non-mining template start, FIFO/mining or rotating-shift AI description, and manual custom setup with reminders, exceptions, and calendar export enabled.
- RevenueCat repo-side identifiers and guidance use Ryvro launch aliases while keeping old Ellie/miner aliases documented as compatibility-only migration inputs.
- RevenueCat launch env templates now include both native and Expo public platform SDK keys, the public entitlement mirror, and the production env preflight rejects mismatched public/native key or entitlement pairs before EAS builds.
- Production env preflight now requires the real EAS project UUID shape before release builds, so placeholder or project-name values fail before EAS secrets are pushed.
- Production env preflight also requires Expo public Google OAuth client IDs to mirror the private web and iOS Google client IDs, so release builds cannot silently ship with split OAuth projects.
- Dynamic Expo config now derives the Google Sign-In plugin's iOS URL scheme from `GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, so production EAS builds can follow the fresh Ryvro OAuth client instead of a stale static scheme.
- Dynamic Expo config now also pins launch native capability fallbacks for Apple Sign-In, iOS microphone/speech privacy strings, Android microphone permission, and required Expo/Firebase/Google native config plugins if static config inheritance changes.
- Production env preflight now validates the Firebase API key, app ID, messaging sender ID, auth domain, and storage bucket shape against the same Ryvro `FIREBASE_PROJECT_ID`.
- Production env preflight now rejects retired Ellie/ShiftSync Firebase project IDs and Cloud Function hosts for `ryvroBrain` and `parseShiftScheduleDescription`.
- Production env preflight now requires real root-level Firebase native service files for `EXPO_IOS_GOOGLE_SERVICES_FILE` and `EXPO_ANDROID_GOOGLE_SERVICES_FILE`, rejects tracked local placeholders or generated native-folder paths, and checks the files target `FIREBASE_PROJECT_ID` plus `com.ryvro.shiftplanner`.
- Production env preflight now rejects unsafe production `API_BASE_URL` values such as localhost, HTTP, or retired Ellie hosts.
- Production env preflight now requires legal and support URLs to be live HTTPS Ryvro-owned URLs with matching privacy, terms/legal, and support/help paths, so generic placeholder domains cannot pass before EAS secrets are pushed.
- Firebase/backend repo config exposes `ryvroBrain` and uses `RYVRO_BRAIN_*` as the preferred environment names while preserving old `ELLIE_BRAIN_*` keys only as migration fallbacks.
- CI and E2E workflows now exercise only `RYVRO_BRAIN_*` endpoint variables; legacy `ELLIE_BRAIN_*` names are no longer exported in workflow environments.
- New Expo config no longer mirrors `RYVRO_BRAIN_*` into legacy `ELLIE_BRAIN_*` extras; legacy brain values stay empty unless an old environment explicitly supplies them for migration.
- The active API reference now uses a broad healthcare rotating-schedule example and current Ryvro launch configuration: `RYVRO_BRAIN_*`, `ryvroBrain`, fresh Firebase config paths, RevenueCat native/public key pairs, and `npm run release:env:check`.
- The internal OpenWakeWord Expo module now uses Ryvro-branded package, native module, Android namespace, iOS podspec, resource bundle, and JS adapter identifiers.
- The ignored generated iOS CocoaPods workspace was refreshed on 2026-05-30; `pod install` installed `RyvroOpenWakeWord`, removed `EllieOpenWakeWord`, and `ios/Podfile.lock` now points at `../modules/ryvro-openwakeword/ios`.
- Native iOS display metadata now resolves to `CFBundleDisplayName = Ryvro` and `PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner`; clean Expo prebuilds use the internal `RyvroShiftPlanner` workspace, scheme, and product.
- Release native scaffold preflight now runs inside `npm run release:check`; it verifies tracked Expo/native source-of-truth identity and warns when ignored generated iOS scaffolding or Firebase plist files still carry Ellie-era internals.
- Stale generated Detox artifacts from the retired iOS app identity were removed from the tracked tree; `artifacts/` is now ignored so current release evidence stays in docs and fresh CI/test output instead of checked-in logs.
- Dashboard quick actions now route to implemented launch surfaces instead of dead tap targets: builder/export actions enter the Universal Shift Builder, and alert/profile actions open the Profile tab.
- Profile/settings now exposes configured support, account deletion, privacy policy, and terms links so launch users and app reviewers can reach the required legal/support pages from inside the app.
- Schedule and Stats helper screens no longer present launch users with "Coming Soon" copy; they point users to the shipped Shift Builder, dashboard metrics, calendar import/export, exceptions, reminders, and profile schedule settings in every bundled locale.
- Global pending-sync visibility now surfaces queued user-profile, shift-log, session, analytics, and related offline writes through the app-level sync status indicator.
- Runtime cache TTL policy is centralized in `src/config/cacheConfig.ts` and wired through shift schedules, holidays, RevenueCat offerings, paywall recovery, voice assistant persistence, and storage maintenance.
- First-store-build version values are aligned across tracked Expo and native config: app version `1.0.0`, iOS build number `1`, Android versionCode `1`, and Android versionName `1.0.0`.

## Current Public Clearance Evidence

`npm run release:clearance` was run on 2026-05-31 at `2026-05-31T07:14:40.822Z`.

- Apple public software search returned 5 fuzzy results and no exact `Ryvro` or `Ryvro Shift Planner` app result.
- Google Play public search returned no exact `Ryvro` or `Ryvro Shift Planner` result text; visible fuzzy names were `Rydoo` and `Rydora`.
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
- `E2E_TEST_MODE=1 npx detox test --configuration ios.release.xsmax e2e/dashboard.test.ts`: passed on 2026-05-29 on the iPhone XS Max simulator, 15 dashboard smoke tests. The historical run installed the then-current Ryvro display-name build and verified the small-screen dashboard smoke without the RevenueCat release guard alert; current clean prebuilds produce the internal `RyvroShiftPlanner.app` product with `CFBundleDisplayName = Ryvro`.
- `npm test -- RevenueCatRuntime ryvroEnvTemplate --runInBand`: passed on 2026-05-29 after adding the E2E RevenueCat runtime guard and treating `test_` RevenueCat keys as unavailable launch keys.
- `npm run validate`: passed on 2026-05-29 after the latest Phase 9 E2E seed and selector updates.
- Recent pushed GitHub Actions check for PR #1 passed on commit `610795d`: CI run `26678024310` passed Lint and Type Check, Unit Tests, and Build Check.
- Earlier same-day pushed GitHub Actions checks also passed on commits `f004097`, `10353e7`, `3f92d56`, `90d403d`, and `82fd530`, covering dashboard quick actions, release env template alignment, legal launch URLs, EAS scaffolding, and production env preflight.
- Local release verification on 2026-05-30 passed `git diff --check`, focused config tests, and `npm run release:check` after the non-mining E2E onboarding fixture update. The release check included TypeScript, 106 Jest suites / 1,729 tests, and the backend functions TypeScript build.
- Local release verification on 2026-05-30 passed focused RevenueCat/config tests and `npm run release:check` after the RevenueCat env mirror guard update. The release check included TypeScript, 106 Jest suites / 1,731 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-30 passed focused API-reference/config tests and `npm run release:check` after the active API reference launch-configuration update. The release check included TypeScript, 106 Jest suites / 1,732 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused readiness/audit config tests, `npm run release:clearance`, and `npm run release:check` after refreshing the launch-readiness handoff. The release check included TypeScript, 106 Jest suites / 1,732 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused README/deployment-plan config tests, and `npm run release:check` after adding the README release status snapshot. The release check included TypeScript, 106 Jest suites / 1,734 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused offline-strategy/config tests and `npm run release:check` after aligning offline-first docs with the current NetInfo-backed implementation. The release check included TypeScript, 106 Jest suites / 1,735 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused pending-sync indicator/config tests, and `npm run release:check` after adding global pending-sync visibility. The release check included TypeScript, 108 Jest suites / 1,740 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused cache-policy/config tests and `npm run release:check` after centralizing cache TTL policy in `src/config/cacheConfig.ts`. The release check included TypeScript, 109 Jest suites / 1,742 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused store-version/config tests, and `npm run release:check` after aligning dynamic Expo version fallbacks with first-store-build native values. The release check included TypeScript, 109 Jest suites / 1,743 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `npm run release:clearance`, `git diff --check`, focused public-clearance config tests, and `npm run release:check` after refreshing public clearance evidence. The release check included TypeScript, 109 Jest suites / 1,743 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused production-env config tests, and `npm run release:check` after tightening the production env preflight for EAS UUIDs and RevenueCat entitlement mirrors. The release check included TypeScript, 109 Jest suites / 1,745 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused production-env config tests, and `npm run release:check` after adding Google OAuth native/public mirror checks to the production env preflight. The release check included TypeScript, 109 Jest suites / 1,746 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused production-env config tests, and `npm run release:check` after adding Firebase value-shape and project-scope checks to the production env preflight. The release check included TypeScript, 109 Jest suites / 1,747 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, focused production-env config tests, and `npm run release:check` after adding live HTTPS API base URL checks to the production env preflight. The release check included TypeScript, 109 Jest suites / 1,748 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused localization/config tests and `npm run release:check` after broadening launch-visible completion benefit copy and removing retired Arabic Ellie labels. The release check included TypeScript, 109 Jest suites / 1,749 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `npm --prefix backend/functions test -- --runInBand`, focused Ryvro env/config tests, `git diff --check`, and `npm run release:check` after broadening backend research-funnel runtime personas beyond mining/FIFO. The release check included TypeScript, 109 Jest suites / 1,749 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused Ryvro env/config tests, stale-phrase searches, `git diff --check`, and `npm run release:check` after aligning active research-funnel docs and automation prompts with the broad runtime persona model. The release check included TypeScript, 109 Jest suites / 1,750 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused Ryvro env/config tests, a direct Expo config probe, `git diff --check`, and `npm run release:check` after deriving the Google Sign-In iOS URL scheme from the Ryvro OAuth client ID at build time. The release check included TypeScript, 109 Jest suites / 1,751 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused production-env config tests, `git diff --check`, and `npm run release:check` after rejecting retired Firebase project IDs and Cloud Function hosts in the Ryvro production env preflight. The release check included TypeScript, 109 Jest suites / 1,752 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused Ryvro store-submission/config tests, `git diff --check`, and `npm run release:check` after adding the App Store privacy, Google Play Data safety, content rating, export compliance, and reviewer-notes draft. The release check included TypeScript, 109 Jest suites / 1,753 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused owner-runbook/config tests, `git diff --check`, and `npm run release:check` after adding the sequenced owner launch runbook and refreshing pushed CI evidence. The release check included TypeScript, 109 Jest suites / 1,754 tests, 4 snapshots, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused native-scaffold/config tests, `npm run release:native:check`, `git diff --check`, and `npm run release:check` after adding the Ryvro native scaffold preflight to the release gate. The release check included TypeScript, 109 Jest suites / 1,755 tests, 4 snapshots, the native scaffold preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused production-env config tests, `git diff --check`, and `npm run release:check` after requiring Ryvro-owned legal/support URLs in the production env preflight. The release check included TypeScript, 109 Jest suites / 1,756 tests, 4 snapshots, the native scaffold preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused store-readiness/config tests, `npm run release:store:check`, `git diff --check`, and `npm run release:check` after adding the store metadata preflight to the release gate. The release check included TypeScript, 109 Jest suites / 1,757 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused CI workflow/config tests, `git diff --check`, `npm run lint`, and `npm run release:check` after adding the dedicated GitHub Actions `Release Check` job and installing backend function dependencies inside that job. The release check included TypeScript, 109 Jest suites / 1,757 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused owner-handoff/config tests, `git diff --check`, `npm run release:owner:check`, and `npm run release:check` after adding the owner-only launch blocker preflight. The release check included TypeScript, 109 Jest suites / 1,758 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed clean iOS prebuild, focused native/config tests, `git diff --check`, `npm run lint`, and `npm run release:check` after aligning Firebase service-file paths and clean-generated `RyvroShiftPlanner` iOS scaffolding. The release check included TypeScript, 109 Jest suites / 1,758 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused production-env config tests, `git diff --check`, `npm run lint`, and `npm run release:check` after requiring real root-level Firebase native service files for Ryvro production builds. The release check included TypeScript, 109 Jest suites / 1,759 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused owner-handoff/config tests, `git diff --check`, `npm run lint`, and `npm run release:check` after recording the Firebase service-file gate in the launch handoff and updating recent pushed CI evidence. The release check included TypeScript, 109 Jest suites / 1,759 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed `git diff --check`, `npm run lint`, and `npm run release:check` after adding Profile legal/support link coverage for support, account deletion, privacy, and terms. The release check included TypeScript, 110 Jest suites / 1,760 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused screenshot-checklist/config tests, `git diff --check`, and `npm run release:check` after adding the store screenshot capture checklist. The release check included TypeScript, 110 Jest suites / 1,760 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused submit-readiness/config tests, `npm run release:submit:check` with the expected owner-evidence failure, `git diff --check`, and `npm run release:check` after adding the final EAS submit readiness guard. The release check included TypeScript, 110 Jest suites / 1,761 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused config/defaults tests, `npm run release:owner:check`, `git diff --check`, and `npm run release:check` after deriving Ryvro Cloud Function defaults from `FIREBASE_PROJECT_ID` and documenting both backend function URLs. The release check included TypeScript, 110 Jest suites / 1,764 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed backend research-funnel tests, focused Ryvro env/config tests, `git diff --check`, and `npm run release:check` after adding Day 1 research-sequence hooks for every launch persona and documenting all runtime persona IDs. The release check included TypeScript, 110 Jest suites / 1,764 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused submit-readiness/config tests, `npm run release:submit:check` with the expected owner-evidence failure, `git diff --check`, and `npm run release:check` after adding social-handle and final store-submission rows to the submit-readiness evidence guard. The release check included TypeScript, 110 Jest suites / 1,764 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Local release verification on 2026-05-31 passed focused config tests, `npm run release:submit:check` with the expected owner-evidence failure, `git diff --check`, and `npm run release:check` after removing the retired `ELLIE_BRAIN_*` runtime fallback and `ellieBrain` backend export from new Ryvro builds. The release check included TypeScript, 110 Jest suites / 1,765 tests, 4 snapshots, the native scaffold preflight, the store readiness preflight, the owner handoff preflight, and the backend functions TypeScript build.
- Recent pushed GitHub Actions check for PR #1 passed on commit `51e04b9`: CI run `26721241901` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `d80ea95`: CI run `26721045586` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `b6c0505`: CI run `26720871665` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `a019d6c`: CI run `26715426451` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `1bc3031`: CI run `26714684603` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `35ea875`: CI run `26714544097` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `574f3b1`: CI run `26714296664` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `0edba23`: CI run `26714150098` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `55beb97`: CI run `26713667593` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed GitHub Actions check for PR #1 passed on commit `37057ae`: CI run `26713338408` passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check`.
- Recent pushed GitHub Actions check for PR #1 passed on commit `4d7519e`: CI run `26712571047` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `1deb795`: CI run `26712150556` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `d2a45bb`: CI run `26711322778` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `134a5ca`: CI run `26711178813` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `2202b94`: CI run `26711015976` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `9bdae31`: CI run `26708126932` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `7c33bd4`: CI run `26707996159` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `71e70f1`: CI run `26707866556` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `680454e`: CI run `26707724396` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `c07d19e`: CI run `26707609409` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `1892dcb`: CI run `26707461391` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `7bd2cf4`: CI run `26707355628` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `09d5a07`: CI run `26707093043` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `cd8bd5f`: CI run `26706926728` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `c1fd791`: CI run `26706771178` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `6b1c125`: CI run `26706616710` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `5b63d05`: CI run `26706418121` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `df0b161`: CI run `26706309637` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `7115d85`: CI run `26706091677` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `b001c10`: CI run `26705685141` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `82909cc`: CI run `26705470020` passed Unit Tests, Lint and Type Check, and Build Check.
- Recent pushed GitHub Actions check for PR #1 passed on commit `47441dd`: CI run `26704558053` passed Unit Tests, Lint and Type Check, and Build Check.
- Previous pushed GitHub Actions checks for PR #1 passed on commit `3d85add` with CI run `26704249051` and commit `e638418` with CI run `26679223794`.
- Prior completed pushed GitHub Actions baseline for the Android release E2E readiness change: CI run `26659012373` passed for commit `92a52ab`.
- iOS release simulator build command `npm run test:e2e:build:ios`: previously passed on 2026-05-29T15:22:59Z with built plist values `CFBundleDisplayName = Ryvro`, `CFBundleName = Ryvro`, and `CFBundleIdentifier = com.ryvro.shiftplanner`.
- Clean generated-iOS check on 2026-05-31 reports `CFBundleDisplayName = Ryvro`, `PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner`, and current archive docs use `RyvroShiftPlanner.xcworkspace` with `-scheme RyvroShiftPlanner`.
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
- Production Firebase deploy and smoke tests for both `ryvroBrain` and `parseShiftScheduleDescription`; the launch backend should not deploy or configure the retired `ellieBrain` compatibility endpoint. Parser evidence must include a valid-prompt `SHIFT_SCHEDULE_PARSER_URL` `200` draft response.

## Merge Readiness

The repo-side Ryvro rebrand is materially ready for review, but launch is not complete until the account-only and physical-device checks above are done. Treat the branch as merge-reviewable engineering work, not as fully launch-cleared production release evidence.
