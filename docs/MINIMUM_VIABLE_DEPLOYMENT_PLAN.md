# Minimum Viable Deployment Plan (MVD)

Last updated: May 31, 2026
Repository: repo root

## 1. Goal

Ship Ryvro to:

- Apple TestFlight, then App Store review
- Google Play Internal testing, then Production review

with the smallest safe scope that:

- does not break core onboarding + dashboard + profile flows
- has green CI quality gates
- uses production app IDs/signing
- has no known store-policy blockers

## 2. Launch Scope (MVD Scope Lock)

### 2.1 In scope for v1 deployment

- Full premium onboarding flow using the Universal Shift Builder
- Dashboard (hero card, calendar, shift state/coloring, icons, exceptions)
- Profile + Shift Settings editing flows
- Ryvro voice assistant entry point
- Ryvro Pro subscription gating, paywall, restore purchases, and RevenueCat product loading in the first submitted binary

### 2.2 Out of scope for v1 deployment

- Full notification automation loop (service exists, runtime product wiring is partial)
- Multi-pattern advanced workflows

### 2.3 Product decision for secondary tabs

- Hide Schedule and Stats tabs for v1.
- This keeps the launch surface focused on onboarding, dashboard, profile/settings, Ryvro voice, reminders, and import/export paths that are ready to smoke test.
- Reintroduce Schedule and Stats only after they are feature-complete enough for store review.

## 3. Release Exit Criteria (Definition of Done)

You can submit only when all items are true:

1. `npm run lint` passes.
2. `npm run type-check` passes.
3. `npm run release:check` passes with exit code 0.
4. iOS Release Archive succeeds with production bundle ID.
5. Android `bundleRelease` succeeds with production keystore signing.
6. No restricted/invalid Android permissions remain unless intentionally justified.
7. RevenueCat `pro` entitlement, `ryvro_pro_monthly`, `ryvro_pro_annual`, and `default` offering are configured for both stores.
8. Sandbox subscription smoke passes: purchase activates Ryvro Pro, voice/full calendar unlock, cancel/expiration re-locks, and Restore Purchases works.
9. Manual smoke tests pass on 2 physical devices (iOS + Android minimum).
10. App Store Connect + Play Console metadata/privacy/forms, screenshots, and in-app purchase declarations are fully completed.

## 4. Workstream A - Hard Technical Blockers

## A1) Replace placeholder app identifiers

Current status:

- Repo-side app identifiers now use `com.ryvro.shiftplanner`.
- Account-side Firebase, OAuth, Apple, Google Play, and App Store records still need to be created or updated for this ID.

Files to update:

- `app.json`
- `app.config.js` (if it overrides values)
- `android/app/build.gradle`
- `android/app/src/main/AndroidManifest.xml` (scheme entries if needed)
- iOS target bundle identifier in Xcode project settings

Implementation steps:

1. Use production reverse-DNS ID: `com.ryvro.shiftplanner`.
2. Update:
   - `expo.ios.bundleIdentifier`
   - `expo.android.package`
3. Update Android:
   - `namespace`
   - `applicationId`
4. Update deep-link schemes only if they still reference old identifier.
5. Clean build caches and rebuild:
   ```bash
   cd <repo-root>
   rm -rf android/.gradle
   rm -rf ios/build
   ```

Acceptance criteria:

- Built binaries report new IDs on both platforms.

## A2) Configure production Android signing (must not use debug signing)

Current status:

- The tracked native Android Gradle config reads `RYVRO_UPLOAD_*` signing values, with legacy `ANDROID_UPLOAD_*` aliases accepted only as migration fallbacks.
- Non-E2E release tasks now fail fast when upload-key credentials are missing, so production release builds cannot silently fall back to debug signing.
- E2E release-style Detox builds may use the debug keystore only when `E2E_TEST_MODE` is enabled, keeping emulator smoke tests reproducible without weakening store-build signing.
- The upload keystore itself still has to be generated outside git and installed in EAS/local/CI secrets.

Implementation steps:

1. Generate upload keystore once:
   ```bash
   cd <repo-root>/android/app
   keytool -genkeypair -v \
     -keystore ryvro-upload-key.keystore \
     -alias ryvro-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Move keystore to safe location (not committed). Example:
   - `<repo-root>/android/keystores/ryvro-upload-key.keystore`
3. Add secrets to `<repo-root>/android/gradle.properties` (local) and CI secrets:
   ```properties
   RYVRO_UPLOAD_STORE_FILE=../keystores/ryvro-upload-key.keystore
   RYVRO_UPLOAD_STORE_PASSWORD=*****
   RYVRO_UPLOAD_KEY_ALIAS=ryvro-upload
   RYVRO_UPLOAD_KEY_PASSWORD=*****
   ```
4. Configure release signing through EAS credentials or local/CI Gradle properties using the `RYVRO_UPLOAD_*` values already enforced by `android/app/build.gradle`.
5. Build and verify:
   ```bash
   cd <repo-root>/android
   ./gradlew bundleRelease
   ```
6. Keep this first upload key permanently for Play updates.

Acceptance criteria:

- `app-release.aab` is signed with upload key (not debug key).
- Running a non-E2E release Gradle task without `RYVRO_UPLOAD_*` credentials fails before producing a release artifact.

## A3) Remove/justify high-risk Android permissions

Current status:

- Active Expo/Android config contains `RECORD_AUDIO` for the voice assistant plus standard app/runtime permissions.
- `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, and `WRITE_EXTERNAL_STORAGE` are not present in active app config.

Implementation steps:

1. Reconfirm functional need of each permission before final store upload.
2. Keep only required permissions, currently `INTERNET`, `RECORD_AUDIO`, and runtime-generated app permissions such as vibration/notifications where used.
3. If any special permission is added later, document policy justification before submission.

Recommended target for v1:

- Keep only what the app actively uses in production.

Acceptance criteria:

- Final merged manifest no longer contains unneeded dangerous/restricted permissions.

## A4) Keep release checks green

Current status:

- `npm run release:check` is green on the Ryvro branch.
- Keep it mandatory before each release candidate.

Files:

- `src/utils/hapticsDiagnostics.ts`
- Tests impacted by async haptic calls

Implementation steps:

1. Re-run:
   ```bash
   cd <repo-root>
   npm run release:native:check
   npm run release:check
   ```

Acceptance criteria:

- `release:native:check` exits with code 0 and reports the tracked Ryvro native identity source of truth.
- `release:check` exits with code 0 consistently.

## A5) Versioning + build numbers for stores

Current status:

- Initial v1 store versions are pinned across tracked config: Expo `version` is `1.0.0`, iOS `buildNumber` / `CURRENT_PROJECT_VERSION` is `1`, Android `versionCode` is `1`, and Android `versionName` is `1.0.0`.
- The dynamic Expo config also falls back to the same version/build values when static config is not inherited.
- Future store submissions must increment iOS build number and Android versionCode after each uploaded binary.

Implementation steps:

1. For the first store build, keep semantic app version aligned in `app.json`, `app.config.js`, `package.json`, Android `versionName`, and generated iOS `MARKETING_VERSION`.
2. For every later uploaded binary, increment:
   - iOS build number (CFBundleVersion)
   - Android versionCode
3. Keep release log in `CHANGELOG.md` once public release notes begin.

Acceptance criteria:

- iOS and Android builds are uniquely incremented and accepted by consoles.

## 5. Workstream B - Product UX Completeness for MVD

## B1) Keep secondary tabs out of the v1 navigation

Files:

- `src/navigation/MainTabNavigator.tsx`
- `src/navigation/CustomTabBar.tsx`

Implementation steps:

1. Confirm Schedule and Stats are not present in the bottom tab navigation.
2. Confirm no visible launch CTA routes users into incomplete Schedule or Stats surfaces.
3. Keep hidden screens as post-v1 implementation backlog only.

Acceptance criteria:

- Users cannot enter incomplete secondary tabs during v1 smoke testing.

## B2) Wire dashboard quick actions or remove temporarily

Files:

- `src/screens/main/MainDashboardScreen.tsx`
- `src/components/dashboard/QuickActionsBar.tsx`

Implementation steps:

1. Implement `handleActionPress` routes for each action key.
2. If action cannot be implemented now, hide that action from list.
3. Ensure no dead tap targets remain.

Acceptance criteria:

- Every visible quick-action button does something predictable.

## B3) Update documentation to match current reality

Current status:

- README now includes a Ryvro release status snapshot with repo-proven launch state, latest local/CI gates, and the owner/account/device work still required before the app is live.

Files:

- `README.md`

Implementation steps:

1. Mark completed features correctly.
2. Move unshipped features to clear "post-v1" section.
3. Add release status snapshot.

Acceptance criteria:

- README no longer conflicts with actual shipped app behavior.

## B4) Keep Ryvro Pro in the first-store-build scope

Current status:

- The repo-side subscription implementation is present and guarded by tests.
- Production RevenueCat apps, store products, entitlements, and sandbox receipt checks still require owner console access.
- Ryvro must not ship a first public binary with future-paid functionality exposed as free if the launch plan is to gate it behind Ryvro Pro.

Implementation steps:

1. Keep the center voice button and non-current calendar weeks behind Ryvro Pro for non-subscribed users.
2. Confirm the paywall shows the annual and monthly options from RevenueCat, the free-trial CTA, restore purchases, and store processing copy.
3. Create the App Store and Google Play subscription products before production build submission.
4. Connect both product IDs to the RevenueCat `pro` entitlement and `default` offering.
5. Smoke-test purchase, cancellation/expiration, and restore on iOS and Android sandbox accounts.

Acceptance criteria:

- The first submitted binary includes subscription gating and can complete a sandbox purchase/restore path using Ryvro store products.

## 6. Workstream C - Build, QA, and Runtime Validation

## C1) Local quality gates

Run exactly:

```bash
cd <repo-root>
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm run backend:build
npm run release:check
```

## C2) iOS release build flow

```bash
cd <repo-root>
npx expo prebuild --platform ios --clean
cd ios
xcodebuild -workspace Ellie.xcworkspace \
  -scheme Ellie \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /tmp/Ryvro.xcarchive archive
```

Then:

1. Validate archive in Xcode Organizer.
2. Upload to TestFlight.
3. Add internal testers first.

## C3) Android release build flow

```bash
cd <repo-root>
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
```

Output:

- `<repo-root>/android/app/build/outputs/bundle/release/app-release.aab`

Then upload to Play Internal testing track.

Release signing guard:

- Non-E2E release builds require `RYVRO_UPLOAD_STORE_FILE`, `RYVRO_UPLOAD_STORE_PASSWORD`, `RYVRO_UPLOAD_KEY_ALIAS`, and `RYVRO_UPLOAD_KEY_PASSWORD`.
- Release-style Detox builds can continue to pass with debug signing only when `E2E_TEST_MODE=1`, because those artifacts are emulator-only QA builds and must not be uploaded to Play.

## C4) Manual runtime smoke test matrix (required)

Devices:

- 1 iPhone physical device (minimum)
- 1 Android physical device (minimum)
- Preferred: 2 iOS + 2 Android

Core must-pass flows:

1. Fresh install -> complete onboarding via Universal Shift Builder template start with a non-mining template such as healthcare, security, emergency services, manufacturing, transport, hospitality, aviation, or rail.
2. Fresh install -> complete onboarding via Universal Shift Builder AI description with a FIFO/mining or rotating-shift prompt, then review and save the generated schedule.
3. Fresh install -> complete onboarding via Universal Shift Builder manual setup with custom shift names, colors, icons, reminders, exceptions, and calendar export enabled.
4. Edit shift settings from profile and confirm dashboard updates immediately.
5. Verify shift color and icon updates at boundary transitions.
6. Verify holiday exceptions and one-off irregular exceptions render correctly.
7. Verify calendar import/export paths.
8. App relaunch persistence check for onboarding data.
9. Schedule and Stats tabs are not visible anywhere in the bottom navigation.

Subscription must-pass flows:

1. Tap center mic while not subscribed -> PaywallScreen appears; annual plan is pre-selected; "Start 7-Day Free Trial" is visible.
2. Tap a locked calendar week while not subscribed -> PaywallScreen appears.
3. Start the sandbox 7-day free trial -> `isPro` becomes true, the center mic opens the voice assistant, and the full year calendar unlocks.
4. Cancel or let the sandbox subscription expire -> locked weeks and the paywall gate return.
5. Restore Purchases reactivates Ryvro Pro for the same sandbox account.
6. Profile shows "Ryvro Pro - Active" when subscribed and an upgrade row with live product pricing when not subscribed.

## 7. Workstream D - Store Submission Readiness

## D1) iOS App Store Connect requirements

Prepare:

1. App name, subtitle, keywords, support URL, privacy policy URL.
2. Screenshots for required device sizes.
3. App Review notes:
   - explain onboarding purpose
   - explain microphone/speech usage
4. Subscription group and products:
   - group: Ryvro Pro
   - monthly product: `ryvro_pro_monthly`
   - annual product: `ryvro_pro_annual`
   - 7-day free trial on both products
5. Include a paywall screenshot and reviewer instructions for testing the subscription flow.
6. Fill App Privacy questionnaire accurately.
7. Ensure `Info.plist` permission strings are precise and user-facing.

## D2) Google Play Console requirements

Prepare:

1. Data safety form.
2. Content rating questionnaire.
3. Privacy policy URL.
4. App access/testing instructions if needed.
5. Subscriptions:
   - monthly product: `ryvro_pro_monthly`
   - annual product: `ryvro_pro_annual`
   - matching 7-day free trial base plans
6. Include paywall screenshots and declare in-app purchases in store metadata.
7. Verify target API level and policy compliance.

## 8. CI/CD Plan (Minimum)

1. Keep GitHub Actions as required gate for PR to `main`.
2. Branch protection:
   - require `lint-and-type-check`, `unit-tests`, `build-check`.
3. Add release checklist in PR template for:
   - IDs/signing/permissions/version bump.
4. Optional after v1:
   - add EAS config and automated store build lanes.

## 9. Rollout Strategy (Fast + Safe)

1. iOS TestFlight internal (24-48 hours).
2. Android Internal testing (same day).
3. Fix blocker bugs immediately.
4. Expand to closed beta (small external group).
5. Submit production once crash rate + major UX issues are acceptable.

## 10. 7-Day Execution Plan

Day 1:

- Scope lock decision
- App ID + signing + permissions implementation

Day 2:

- CI teardown bug fix (`release:check` must pass)
- Versioning + changelog

Day 3:

- Placeholder/beta UX cleanup + quick actions wiring
- QA build candidates

Day 4:

- Device smoke tests and bug fixes

Day 5:

- TestFlight + Play Internal upload

Day 6:

- Internal feedback triage + patch if needed

Day 7:

- Store submission to App Store + Play Production (or closed beta if major feedback remains)

## 11. Exact Task Checklist (copy/paste operational list)

- [x] Set production `bundleIdentifier` and `android.package` in repo config
- [x] Set Android `namespace` and `applicationId` in repo config
- [x] Add tracked Gradle release-signing guard so non-E2E release tasks require `RYVRO_UPLOAD_*`
- [ ] Generate/upload the real Android release keystore through EAS/local secrets before store upload
- [x] Remove unneeded Android permissions from active app config
- [x] Ensure `npm run release:check` exits 0
- [x] Pin first-store-build iOS build number + Android versionCode across tracked config
- [ ] Increment iOS build number + Android versionCode again after each uploaded binary
- [x] Verify every visible tab/action is complete or routed to an implemented launch surface
- [x] Update README release status snapshot
- [x] Add repo-side Ryvro Pro subscription gating, paywall, and RevenueCat runtime guards
- [ ] Create RevenueCat `pro` entitlement, `default` offering, and both Ryvro store products
- [ ] Pass sandbox purchase/cancel/restore smoke on iOS and Android
- [ ] Run full smoke test matrix on physical devices
- [ ] Upload TestFlight build
- [ ] Upload Play Internal build
- [ ] Complete App Store Connect metadata/privacy
- [ ] Complete Play Console data safety/content forms
- [ ] Submit production (or closed beta if risk remains)

## 12. Risks and Mitigations

Risk: More feature additions before launch create endless delay.  
Mitigation: Freeze scope to this MVD plan; only blocker fixes allowed.

Risk: Android policy rejection due to permissions.  
Mitigation: Remove risky permissions unless strictly required; document justification.

Risk: CI appears green but release check fails locally.  
Mitigation: Make `release:check` mandatory before every release candidate tag.

Risk: Secondary tabs or actions create poor first impression if they look unfinished.  
Mitigation: Keep Schedule and Stats hidden until their full launch surfaces are ready.

## 13. Post-Launch Iteration Backlog (Not part of MVD)

- Full Schedule tab implementation
- Full Stats/analytics surface
- Notification automation end-to-end runtime integration
- Expanded E2E suite for production UI
- Automated EAS/Fastlane release lanes
