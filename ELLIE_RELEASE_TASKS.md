# Ellie — Release Task List

Source: `ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md`
Last updated: March 10, 2026 (subscription plan added — Ellie Pro)

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

## Phase 3 — Subscription: Ellie Pro (Code — must be done before any store setup)

> Source: `ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md` — PART 3, Steps A–D
> **Must be complete before Phase 4.** Apple does not allow retroactively paywalling a feature that shipped free. The subscription binary must be in the first submitted version.

| #   | Task                                                                                                                                                                                 | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 31  | Install RevenueCat SDK: `npx expo install react-native-purchases`                                                                                                                    | 🔧 Todo |
| 32  | Create `src/contexts/SubscriptionContext.tsx` — RevenueCat init, `isPro` state, `openPaywall`, `restorePurchases`                                                                    | 🔧 Todo |
| 33  | Create `src/hooks/useSubscription.ts` — convenience re-export of `useSubscription`                                                                                                   | 🔧 Todo |
| 34  | Create `src/components/subscription/PadlockOverlay.tsx` — absolute overlay rendered over locked calendar weeks                                                                       | 🔧 Todo |
| 35  | Create `src/screens/subscription/PaywallScreen.tsx` — full-screen paywall: gold mic hero, 5 benefit lines, annual pre-selected, "Start 7-Day Free Trial" CTA, Restore Purchases link | 🔧 Todo |
| 36  | Edit `App.tsx` — wrap app with `<SubscriptionProvider>`, render `<PaywallScreen>` as full-screen overlay when `paywallVisible` is true                                               | 🔧 Todo |
| 37  | Edit `CustomTabBar.tsx` — gate center mic button: `isPro` → `openModal()`, not Pro → `openPaywall()`                                                                                 | 🔧 Todo |
| 38  | Edit `MonthlyCalendarCard.tsx` — current week renders free; all other weeks get `<PadlockOverlay>` at 35% opacity when not Pro                                                       | 🔧 Todo |
| 39  | Edit `ProfileScreen.tsx` — add "Ellie Pro — Active ✓" / "Upgrade to Ellie Pro" row after Work Stats section                                                                          | 🔧 Todo |
| 40  | Add `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY` placeholders to `.env` (fill values after Task 42)                                                                             | 🔧 Todo |
| 41  | Re-run full quality gate after subscription code is added: `lint` + `type-check` + `test` + `release:check` — all must pass                                                          | 🔧 Todo |

---

## Phase 4 — Subscription: RevenueCat + Store Products (Manual — you do these)

> Source: `ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md` — PART 3, Step D
> Do these in parallel with Phase 5 (Apple Developer enrollment). RevenueCat is free to set up now; product IDs must exist before building the production binary.

| #   | Task                                                                                                                                                                                                              | Status  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 42  | 👤 Create RevenueCat account at revenuecat.com → add iOS app (bundle ID: `com.ellie.minershiftassistant`) → copy iOS SDK key → paste into `.env` as `REVENUECAT_IOS_KEY`                                          | 👤 Todo |
| 43  | 👤 Add Android app to RevenueCat → copy Android SDK key → paste into `.env` as `REVENUECAT_ANDROID_KEY`                                                                                                           | 👤 Todo |
| 44  | 👤 RevenueCat → Entitlements → Add entitlement: ID = `pro`, Display name = `Ellie Pro`                                                                                                                            | 👤 Todo |
| 45  | 👤 App Store Connect → your app → Subscriptions → create subscription group "Ellie Pro" → add two products: `ellie_pro_monthly` ($6.99/mo, 7-day free trial) and `ellie_pro_annual` ($49.99/yr, 7-day free trial) | 👤 Todo |
| 46  | 👤 Google Play Console → Monetize → Subscriptions → create `ellie_pro_monthly` and `ellie_pro_annual` with matching pricing and 7-day free trial base plans                                                       | 👤 Todo |
| 47  | 👤 RevenueCat → Products → add both product IDs → attach both to the `pro` entitlement                                                                                                                            | 👤 Todo |
| 48  | 👤 RevenueCat → Offerings → create offering named `default` → add Annual package + Monthly package                                                                                                                | 👤 Todo |
| 49  | 👤 Test full subscription flow in RevenueCat sandbox: start trial → `isPro` = true → mic works + calendar unlocks → cancel → locks re-appear → Restore Purchases works                                            | 👤 Todo |

---

## Phase 5 — Accounts + External Setup (Manual — you do these)

| #   | Task                                                                                                                                                                                        | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 11  | 👤 Enroll Apple Developer account at developer.apple.com ($99/year) — takes 24-48h to approve — **start immediately, runs in parallel with Phase 3**                                        | 👤 Todo |
| 12  | 👤 Register App ID on Apple Developer Portal with bundle ID `com.ellie.minershiftassistant` + Push Notifications capability                                                                 | 👤 Todo |
| 13  | 👤 Create app in App Store Connect (name: `Ellie: Miner Shift Assistant`, language: English AU, SKU: `ellie-shift-001`)                                                                     | 👤 Todo |
| 14  | 👤 Create app in Google Play Console ($25 one-time fee) with matching name                                                                                                                  | 👤 Todo |
| 15  | 👤 Run `eas login` then `eas init` in `/Users/Shared/Ellie` — copy the EAS Project ID UUID                                                                                                  | 👤 Todo |
| 16  | 👤 Update `.env`: set `APP_ENV=production`, paste `EAS_PROJECT_ID`, paste `GOOGLE_WEB_CLIENT_ID` from Firebase Console, fill `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY` from Phase 4 | 👤 Todo |
| 17  | 👤 Set up iOS signing: run `eas credentials --platform ios` → add distribution cert + provisioning profile                                                                                  | 👤 Todo |

---

## Phase 6 — Backend + Privacy (Mix of code + manual)

| #   | Task                                                                                                                                                                            | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 18  | Verify Firebase Cloud Function is deployed: `curl` the ellieBrain endpoint (returns 200/400 = live)                                                                             | ✅ Done |
| 19  | 👤 Create and publish Privacy Policy — must mention microphone, Firebase, OpenAI, RevenueCat, and subscription terms (Notion page or GitHub Pages) — required before submission | 👤 Todo |

---

## Phase 7 — Build + Test

| #   | Task                                                                                                     | Status                                                            |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 20  | Push `.env` secrets to EAS: `eas secret:push --scope project --env-file .env` (includes RevenueCat keys) | 🔧 Blocked (requires `eas login` + real production `.env` values) |
| 21  | Build production iOS binary: `eas build --platform ios --profile production`                             | 🔧 Blocked (signing/provisioning not configured yet)              |
| 22  | Build production Android AAB: `eas build --platform android --profile production`                        | 🔧 Partial (local AAB built via Gradle; EAS build pending login)  |
| 23  | 👤 Install TestFlight build on real iPhone — run full smoke test matrix (see below)                      | 👤 Todo                                                           |
| 24  | 👤 Install .apk on Android device — repeat smoke tests                                                   | 👤 Todo                                                           |

---

## Phase 8 — Store Submission (Manual)

| #   | Task                                                                                                                                       | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 25  | 👤 Take screenshots: 3× iOS 6.7" (1290×2796), 3× iPad 12.9" (2048×2732), 2× Android (1080×1920) — include paywall screen as one screenshot | 👤 Todo |
| 26  | 👤 Upload screenshots + fill App Store metadata, privacy nutrition label, age rating                                                       | 👤 Todo |
| 27  | 👤 Complete Google Play data safety + content rating forms — declare in-app purchases                                                      | 👤 Todo |
| 28  | 👤 Submit iOS: `eas submit --platform ios --latest` → Submit for Review in App Store Connect                                               | 👤 Todo |
| 29  | 👤 Submit Android: set up Google Play Service Account key, run `eas submit --platform android --latest` → internal track                   | 👤 Todo |
| 30  | 👤 Promote Android from internal track → production in Play Console when ready                                                             | 👤 Todo |

---

## Smoke Test Matrix (Tasks 23 + 24 — must all pass)

**Core app:**

1. Fresh install → complete onboarding via rotating roster path
2. Fresh install → complete onboarding via FIFO path
3. Profile shift edits reflect immediately on dashboard
4. Hero/status/tab accent colors switch correctly per active shift
5. App relaunch preserves all onboarding data (AsyncStorage)
6. Schedule and Stats tabs are not visible anywhere in the nav
7. No dead/broken tap targets in any visible screen

**Subscription (Ellie Pro):** 8. Tap center mic (not subscribed) → PaywallScreen appears; annual plan pre-selected; "Start 7-Day Free Trial" button visible 9. Tap any locked calendar week (not subscribed) → PaywallScreen appears 10. Start 7-day free trial (RevenueCat sandbox) → `isPro` = true → mic opens voice assistant; full year calendar unlocks 11. Profile screen shows "Ellie Pro — Active ✓" when subscribed; shows "Upgrade to Ellie Pro" row with price when not subscribed 12. Tap "Restore Purchases" on paywall → purchases restore correctly 13. Voice assistant opens (subscribed), handles microphone permission flow, and responds

---

## Quality Gate Commands (Tasks 5 + 41 — run in order, all must pass)

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

**Code quality:**

- [x] `npm run lint` passes
- [x] `npm run type-check` passes
- [x] `npm test -- --runInBand --silent` passes cleanly
- [x] `npm run backend:build` passes
- [x] `npm run release:check` exits with code 0

**Subscription readiness:**

- [ ] `react-native-purchases` installed and all subscription files created (Tasks 31–40)
- [ ] Quality gate re-run passes after subscription code is added (Task 41)
- [ ] RevenueCat entitlement `pro` configured with both product IDs (Tasks 42–48)
- [ ] App Store Connect subscription products `ellie_pro_monthly` + `ellie_pro_annual` created (Task 45)
- [ ] Google Play subscription products created with matching IDs (Task 46)
- [ ] Full subscription sandbox smoke test passes on device (Task 49 + smoke test items 8–13)

**Build and store:**

- [ ] iOS archive built with production bundle ID
- [ ] Android AAB built with production ID + valid release signing
- [ ] Manual smoke tests pass on physical iOS + Android devices (all 13 items)
- [ ] Privacy Policy published and URL live — mentions RevenueCat + subscription terms (Task 19)
- [ ] App Store Connect metadata + privacy form + in-app purchase section completed
- [ ] Play Console data safety + content forms + in-app products declared completed
