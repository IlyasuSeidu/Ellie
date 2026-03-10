# Minimum Viable Deployment Plan (MVD)

Last updated: March 10, 2026  
Repository: `/Users/Shared/Ellie`

## 1. Goal

Ship Ellie to:

- Apple TestFlight, then App Store review
- Google Play Internal testing, then Production review

with the smallest safe scope that:

- does not break core onboarding + dashboard + profile flows
- has green CI quality gates
- uses production app IDs/signing
- has no known store-policy blockers

## 2. Launch Scope (MVD Scope Lock)

### 2.1 In scope for v1 deployment

- Full premium onboarding flow (rotating + FIFO)
- Dashboard (hero card, calendar, shift state/coloring)
- Profile + Shift Settings editing flows
- Voice assistant entry point (existing behavior)

### 2.2 Out of scope for v1 deployment

- Full Schedule feature (currently placeholder)
- Full Stats feature (currently placeholder)
- Full notification automation loop (service exists, runtime product wiring is partial)
- Multi-pattern advanced workflows

### 2.3 Product decision for placeholder tabs (required before submission)

- Keep tabs visible, but clearly mark both as beta placeholders and add in-screen feedback CTA.
- This avoids risky nav refactor before release and keeps UX explicit.

## 3. Release Exit Criteria (Definition of Done)

You can submit only when all items are true:

1. `npm run lint` passes.
2. `npm run type-check` passes.
3. `npm run release:check` passes with exit code 0.
4. iOS Release Archive succeeds with production bundle ID.
5. Android `bundleRelease` succeeds with production keystore signing.
6. No restricted/invalid Android permissions remain unless intentionally justified.
7. Manual smoke tests pass on 2 physical devices (iOS + Android minimum).
8. App Store Connect + Play Console metadata/privacy forms are fully completed.

## 4. Workstream A - Hard Technical Blockers

## A1) Replace placeholder app identifiers

Current blocker:

- `com.anonymous.ellie` still used in config/native.

Files to update:

- `/Users/Shared/Ellie/app.json`
- `/Users/Shared/Ellie/app.config.js` (if it overrides values)
- `/Users/Shared/Ellie/android/app/build.gradle`
- `/Users/Shared/Ellie/android/app/src/main/AndroidManifest.xml` (scheme entries if needed)
- iOS target bundle identifier in Xcode project settings

Implementation steps:

1. Pick production reverse-DNS ID (example only): `com.<yourcompany>.ellie`.
2. Update:
   - `expo.ios.bundleIdentifier`
   - `expo.android.package`
3. Update Android:
   - `namespace`
   - `applicationId`
4. Update deep-link schemes only if they still reference old identifier.
5. Clean build caches and rebuild:
   ```bash
   cd /Users/Shared/Ellie
   rm -rf android/.gradle
   rm -rf ios/build
   ```

Acceptance criteria:

- Built binaries report new IDs on both platforms.

## A2) Configure production Android signing (must not use debug signing)

Current blocker:

- Release build currently signs with debug keystore.

Implementation steps:

1. Generate upload keystore once:
   ```bash
   cd /Users/Shared/Ellie/android/app
   keytool -genkeypair -v \
     -keystore ellie-upload-key.keystore \
     -alias ellie-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Move keystore to safe location (not committed). Example:
   - `/Users/Shared/Ellie/android/keystores/ellie-upload-key.keystore`
3. Add secrets to `/Users/Shared/Ellie/android/gradle.properties` (local) and CI secrets:
   ```properties
   ELLIE_UPLOAD_STORE_FILE=../keystores/ellie-upload-key.keystore
   ELLIE_UPLOAD_STORE_PASSWORD=*****
   ELLIE_UPLOAD_KEY_ALIAS=ellie-upload
   ELLIE_UPLOAD_KEY_PASSWORD=*****
   ```
4. Update `android/app/build.gradle`:
   - Add `signingConfigs.release` using above properties.
   - Set `buildTypes.release.signingConfig signingConfigs.release`.
   - Remove debug signing from release.
5. Build and verify:
   ```bash
   cd /Users/Shared/Ellie/android
   ./gradlew bundleRelease
   ```
6. Keep this first upload key permanently for Play updates.

Acceptance criteria:

- `app-release.aab` is signed with upload key (not debug key).

## A3) Remove/justify high-risk Android permissions

Current blocker:

- Manifest contains `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.

Implementation steps:

1. Confirm functional need of each permission.
2. Remove unneeded ones from Expo config and regenerate native.
3. Ensure only required permissions remain (likely `INTERNET`, `RECORD_AUDIO`, optional notifications).
4. If any special permission is required, document policy justification before submission.

Recommended target for v1:

- Keep only what the app actively uses in production.

Acceptance criteria:

- Final merged manifest no longer contains unneeded dangerous/restricted permissions.

## A4) Fix CI failure in Jest teardown (release:check hard fail)

Current blocker:

- Jest reports import-after-teardown from haptics diagnostics path.

Files:

- `/Users/Shared/Ellie/src/utils/hapticsDiagnostics.ts`
- Tests impacted by async haptic calls

Implementation steps:

1. Make haptics utility test-safe and teardown-safe:
   - Do not touch lazy `Platform` import paths during late async callbacks.
   - Add defensive guard for test runtime and post-unmount async behavior.
2. Ensure every async trigger path in onboarding components does not fire after unmount.
3. Add/adjust tests to prove no teardown error occurs.
4. Re-run:
   ```bash
   cd /Users/Shared/Ellie
   npm run release:check
   ```

Acceptance criteria:

- `release:check` exits with code 0 consistently.

## A5) Versioning + build numbers for stores

Implementation steps:

1. Set semantic app version in `app.json`, `package.json`:
   - Example: `1.0.0` -> `1.0.1` if you changed post-build.
2. Increment:
   - iOS build number (CFBundleVersion)
   - Android versionCode
3. Keep release log in `CHANGELOG.md`.

Acceptance criteria:

- iOS and Android builds are uniquely incremented and accepted by consoles.

## 5. Workstream B - Product UX Completeness for MVD

## B1) Make placeholder screens explicit beta surfaces

Files:

- `/Users/Shared/Ellie/src/screens/main/ScheduleScreen.tsx`
- `/Users/Shared/Ellie/src/screens/main/StatsScreen.tsx`

Implementation steps:

1. Replace generic "Coming Soon" text with:
   - `Schedule (Beta)` / `Stats (Beta)`
   - one clear sentence on what is available now and what is coming.
2. Add a `Send Feedback` button (mail deep link or in-app feedback endpoint if available).
3. Keep existing design language.

Acceptance criteria:

- Users understand these tabs are beta, not broken.

## B2) Wire dashboard quick actions or remove temporarily

Files:

- `/Users/Shared/Ellie/src/screens/main/MainDashboardScreen.tsx`
- `/Users/Shared/Ellie/src/components/dashboard/QuickActionsBar.tsx`

Implementation steps:

1. Implement `handleActionPress` routes for each action key.
2. If action cannot be implemented now, hide that action from list.
3. Ensure no dead tap targets remain.

Acceptance criteria:

- Every visible quick-action button does something predictable.

## B3) Update documentation to match current reality

Files:

- `/Users/Shared/Ellie/README.md`

Implementation steps:

1. Mark completed features correctly.
2. Move unshipped features to clear "post-v1" section.
3. Add release status snapshot.

Acceptance criteria:

- README no longer conflicts with actual shipped app behavior.

## 6. Workstream C - Build, QA, and Runtime Validation

## C1) Local quality gates

Run exactly:

```bash
cd /Users/Shared/Ellie
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm run backend:build
npm run release:check
```

## C2) iOS release build flow

```bash
cd /Users/Shared/Ellie
npx expo prebuild --platform ios --clean
cd ios
xcodebuild -workspace Ellie.xcworkspace \
  -scheme Ellie \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /tmp/Ellie.xcarchive archive
```

Then:

1. Validate archive in Xcode Organizer.
2. Upload to TestFlight.
3. Add internal testers first.

## C3) Android release build flow

```bash
cd /Users/Shared/Ellie
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
```

Output:

- `/Users/Shared/Ellie/android/app/build/outputs/bundle/release/app-release.aab`

Then upload to Play Internal testing track.

## C4) Manual runtime smoke test matrix (required)

Devices:

- 1 iPhone physical device (minimum)
- 1 Android physical device (minimum)
- Preferred: 2 iOS + 2 Android

Must-pass flows:

1. Fresh install -> complete onboarding (rotating path).
2. Fresh install -> complete onboarding (FIFO path).
3. Edit shift settings from profile and confirm dashboard updates immediately.
4. Verify shift color updates at boundary transitions.
5. App relaunch persistence check for onboarding data.
6. Voice assistant modal open/close and permission handling.
7. Placeholder tabs show beta messaging and feedback CTA.

## 7. Workstream D - Store Submission Readiness

## D1) iOS App Store Connect requirements

Prepare:

1. App name, subtitle, keywords, support URL, privacy policy URL.
2. Screenshots for required device sizes.
3. App Review notes:
   - explain onboarding purpose
   - explain microphone/speech usage
4. Fill App Privacy questionnaire accurately.
5. Ensure `Info.plist` permission strings are precise and user-facing.

## D2) Google Play Console requirements

Prepare:

1. Data safety form.
2. Content rating questionnaire.
3. Privacy policy URL.
4. App access/testing instructions if needed.
5. Verify target API level and policy compliance.

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

- [ ] Set production `bundleIdentifier` and `android.package`
- [ ] Set Android `namespace` and `applicationId`
- [ ] Configure release keystore signing
- [ ] Remove unneeded Android permissions
- [ ] Fix Jest teardown haptics error
- [ ] Ensure `npm run release:check` exits 0
- [ ] Increment iOS build number + Android versionCode
- [ ] Convert Schedule/Stats to explicit beta UX with feedback CTA
- [ ] Wire or hide dead dashboard quick actions
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

Risk: Placeholder tabs create poor first impression.  
Mitigation: Label as beta, provide feedback route, and set expectation clearly.

## 13. Post-Launch Iteration Backlog (Not part of MVD)

- Full Schedule tab implementation
- Full Stats/analytics surface
- Notification automation end-to-end runtime integration
- Expanded E2E suite for production UI
- Automated EAS/Fastlane release lanes
