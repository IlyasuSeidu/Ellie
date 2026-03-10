# Ellie — Release Task List

Source: `ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md`
Last updated: March 10, 2026 (execution pass, app identity locked)

Legend: ✅ Done · 🔧 Code task (can be implemented) · 👤 Manual step (you do this)

---

## Phase 1 — Code Cleanup (No user input needed)

| #   | Task                                                                                                                   | Status  |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Hide Schedule + Stats tabs from nav (MainTabNavigator + CustomTabBar)                                                  | ✅ Done |
| 2   | Audit and remove unsafe Android permissions (`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`) | ✅ Done |
| 3   | Identify and fix any dead/unimplemented quick-action buttons in visible screens                                        | ✅ Done |
| 4   | Fix `release:check` Jest teardown warning (haptics async path) so it exits with code 0                                 | ✅ Done |
| 5   | Run full quality gate: `lint` + `type-check` + `test` + `backend:build` + `release:check` — all must pass              | ✅ Done |

---

## Phase 2 — Config + Identifiers (Needs your bundle ID decision first)

| #   | Task                                                                                        | Status                                    |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 6   | Decide your bundle identifier (permanent — cannot change after Google Play submission)      | ✅ Done (`com.ellie.minershiftassistant`) |
| 7   | Update bundle ID in `app.json` (iOS + Android), add `buildNumber: "1"` and `versionCode: 1` | ✅ Done                                   |
| 8   | Update bundle ID in `android/app/build.gradle` (namespace + applicationId, lines 90+92)     | ✅ Done                                   |
| 9   | Update bundle ID in `ios/Ellie.xcodeproj/project.pbxproj` (both occurrences)                | ✅ Done                                   |
| 10  | Create `eas.json` with development / preview / production build profiles                    | ✅ Done                                   |

---

## Phase 3 — Accounts + External Setup (Manual — you do these)

| #   | Task                                                                                                                    | Status  |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| 11  | 👤 Enroll Apple Developer account at developer.apple.com ($99/year) — takes 24-48h to approve                           | 👤 Todo |
| 12  | 👤 Register App ID on Apple Developer Portal with your bundle ID + Push Notifications capability                        | 👤 Todo |
| 13  | 👤 Create app in App Store Connect (name: `Ellie: Miner Shift Assistant`, language: English AU, SKU: `ellie-shift-001`) | 👤 Todo |
| 14  | 👤 Create app in Google Play Console ($25 one-time fee) with matching name                                              | 👤 Todo |
| 15  | 👤 Run `eas login` then `eas init` in `/Users/Shared/Ellie` — copy the EAS Project ID UUID                              | 👤 Todo |
| 16  | 👤 Update `.env`: set `APP_ENV=production`, paste `EAS_PROJECT_ID`, paste `GOOGLE_WEB_CLIENT_ID` from Firebase Console  | 👤 Todo |
| 17  | 👤 Set up iOS signing: run `eas credentials --platform ios` → add distribution cert + provisioning profile              | 👤 Todo |

---

## Phase 4 — Backend + Privacy (Mix of code + manual)

| #   | Task                                                                                                | Status  |
| --- | --------------------------------------------------------------------------------------------------- | ------- |
| 18  | Verify Firebase Cloud Function is deployed: `curl` the ellieBrain endpoint (returns 200/400 = live) | ✅ Done |
| 19  | 👤 Create and publish Privacy Policy (Notion page or GitHub Pages) — required before submission     | 👤 Todo |

---

## Phase 5 — Build + Test

| #   | Task                                                                                | Status                                                            |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 20  | Push `.env` secrets to EAS: `eas secret:push --scope project --env-file .env`       | 🔧 Blocked (requires `eas login` + real production `.env` values) |
| 21  | Build production iOS binary: `eas build --platform ios --profile production`        | 🔧 Blocked (signing/provisioning not configured yet)              |
| 22  | Build production Android AAB: `eas build --platform android --profile production`   | 🔧 Partial (local AAB built via Gradle; EAS build pending login)  |
| 23  | 👤 Install TestFlight build on real iPhone — run full smoke test matrix (see below) | 👤 Todo                                                           |
| 24  | 👤 Install .apk on Android device — repeat smoke tests                              | 👤 Todo                                                           |

---

## Phase 6 — Store Submission (Manual)

| #   | Task                                                                                                                     | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| 25  | 👤 Take screenshots: 3× iOS 6.7" (1290×2796), 3× iPad 12.9" (2048×2732), 2× Android (1080×1920)                          | 👤 Todo |
| 26  | 👤 Upload screenshots + fill App Store metadata, privacy nutrition label, age rating                                     | 👤 Todo |
| 27  | 👤 Complete Google Play data safety + content rating forms                                                               | 👤 Todo |
| 28  | 👤 Submit iOS: `eas submit --platform ios --latest` → Submit for Review in App Store Connect                             | 👤 Todo |
| 29  | 👤 Submit Android: set up Google Play Service Account key, run `eas submit --platform android --latest` → internal track | 👤 Todo |
| 30  | 👤 Promote Android from internal track → production in Play Console when ready                                           | 👤 Todo |

---

## Smoke Test Matrix (Tasks 23 + 24 — must all pass)

1. Fresh install → complete onboarding via rotating roster path
2. Fresh install → complete onboarding via FIFO path
3. Profile shift edits reflect immediately on dashboard
4. Hero/status/tab accent colors switch correctly per active shift
5. App relaunch preserves all onboarding data (AsyncStorage)
6. Voice assistant opens, handles microphone permission flow, and responds
7. Schedule and Stats tabs are not visible anywhere in the nav
8. No dead/broken tap targets in any visible screen

---

## Quality Gate Commands (Task 5 — run in order, all must pass)

```bash
cd /Users/Shared/Ellie
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm run backend:build
npm run release:check
```

---

## RC Build Validation Commands (Tasks 21 + 22)

```bash
# iOS archive
npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace Ellie.xcworkspace \
  -scheme Ellie -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /tmp/Ellie.xcarchive archive

# Android AAB
cd /Users/Shared/Ellie
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease
```

---

## Go/No-Go Gate — Do Not Submit Until All True

- [x] `npm run lint` passes
- [x] `npm run type-check` passes
- [x] `npm test -- --runInBand --silent` passes cleanly
- [x] `npm run backend:build` passes
- [x] `npm run release:check` exits with code 0
- [ ] iOS archive built with production bundle ID
- [ ] Android AAB built with production ID + valid release signing
- [ ] Manual smoke tests pass on physical iOS + Android devices
- [ ] App Store Connect metadata + privacy form completed
- [ ] Play Console data safety + content forms completed
