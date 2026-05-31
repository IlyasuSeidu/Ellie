# Ryvro — Release Task List

Source: `SHIFT_WORKER_APP_REBRAND_AUDIT.md`
Last updated: May 31, 2026 (Ryvro rebrand, universal builder rollout, broad launch personas, research-funnel docs, research sequence persona hooks, production Firebase service-file preflight, screenshot capture checklist, final submit evidence guard, Firebase-project-derived backend function defaults, retired Ellie voice endpoint fallback removal, FIFO work-block language cleanup, work-location icon source guidance, localized FIFO helper copy cleanup, localized mining-only launch-proof cleanup, mining FIFO template work-location cleanup, voice rest-block tool copy cleanup, deployment-guide EAS/app-config cleanup, storage-key symbol cleanup, native-scaffold verifier cleanup, wake-word filename cleanup, latest public clearance evidence at 20:33Z, and latest pushed PR #1 CI pass `26727184078` on `35a453c`)

Legend: ✅ Done · 🔧 Code task (can be implemented) · 👤 Manual step (you do this)

---

## Phase 0 — External Clearance And Reservation

| #   | Task                                                                                                                                                                              | Status                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 0a  | Run repeatable public clearance preflight with `npm run release:clearance` and keep evidence in `docs/RYVRO_RELEASE_READINESS_REPORT.md` / `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md` | ✅ Done (latest public evidence: 2026-05-31 20:33Z) |
| 0b  | 👤 Complete formal trademark/legal clearance for `Ryvro` in launch markets                                                                                                        | 👤 Todo                                             |
| 0c  | 👤 Reserve or create App Store Connect app name `Ryvro Shift Planner`                                                                                                             | 👤 Todo                                             |
| 0d  | 👤 Reserve or create Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`                                                                                 | 👤 Todo                                             |
| 0e  | 👤 Purchase/reserve the launch domain, with `getryvro.com` as the current cleanest public candidate                                                                               | 👤 Todo                                             |
| 0f  | 👤 Reserve social handles directly while logged in, starting with `@ryvro` and falling back to `@getryvro` or `@tryryvro` if needed                                               | 👤 Todo                                             |

---

## Phase 1 — Code Cleanup (No user input needed)

| #   | Task                                                                                                                                                                                          | Status  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Hide Schedule + Stats tabs from nav (MainTabNavigator + CustomTabBar)                                                                                                                         | ✅ Done |
| 2   | Audit and remove unsafe Android permissions (`SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`)                                                                        | ✅ Done |
| 3   | Identify and fix any dead/unimplemented quick-action buttons in visible screens                                                                                                               | ✅ Done |
| 4   | Fix `release:check` Jest teardown warning (haptics async path) so it exits with code 0                                                                                                        | ✅ Done |
| 5   | Run full quality gate: `lint` + `type-check` + `test` + `backend:build` + `release:check` — all must pass, with CI also running the dedicated `Release Check` job and owner-handoff preflight | ✅ Done |
| 5a  | Remove visible launch placeholder copy from hidden/helper Schedule and Stats entry points                                                                                                     | ✅ Done |
| 5b  | Add app-level offline/pending-sync status visibility for queued local writes                                                                                                                  | ✅ Done |
| 5c  | Centralize runtime cache TTL policy for launch offline caches and recovery windows                                                                                                            | ✅ Done |

---

## Phase 2 — Config + Identifiers

| #   | Task                                                                                                                                                                                                                                                         | Status                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 6   | Decide your bundle identifier (permanent — cannot change after Google Play submission)                                                                                                                                                                       | ✅ Done (`com.ryvro.shiftplanner`) |
| 7   | Update bundle ID in `app.json` (iOS + Android), add `buildNumber: "1"` and `versionCode: 1`                                                                                                                                                                  | ✅ Done                            |
| 8   | Update bundle ID in `android/app/build.gradle` (namespace + applicationId, lines 90+92)                                                                                                                                                                      | ✅ Done                            |
| 9   | Verify clean generated iOS scaffolding uses `CFBundleDisplayName = Ryvro`, the Ryvro bundle/package source of truth, and archive commands use `RyvroShiftPlanner.xcworkspace` with `-scheme RyvroShiftPlanner`                                               | ✅ Done                            |
| 10  | Create `eas.json` with development / preview / production build profiles                                                                                                                                                                                     | ✅ Done                            |
| 10a | Add store listing copy, privacy/support templates, and external service handoff docs                                                                                                                                                                         | ✅ Done                            |
| 10b | Align research-funnel runtime personas, docs, scoring, and automation prompts with Ryvro's broad launch audience across mining/FIFO, healthcare, security/emergency services, transport/logistics, hospitality/manufacturing, and other rotating-shift teams | ✅ Done                            |
| 10c | Derive the Google Sign-In iOS URL scheme from `GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` at Expo config build time so production OAuth cannot keep a stale static client scheme                                                             | ✅ Done                            |
| 10d | Pin dynamic Expo config fallbacks for Apple Sign-In, iOS privacy strings, Android microphone permission, and required native config plugins so generated Ryvro builds keep launch capabilities even if static config inheritance changes                     | ✅ Done                            |
| 10e | Reject retired Ellie/ShiftSync Firebase project IDs and Cloud Function hosts in the Ryvro production env preflight before release builds                                                                                                                     | ✅ Done                            |
| 10f | Require the Ryvro production env preflight to validate real root-level Firebase native service files for `com.ryvro.shiftplanner`, rejecting tracked local placeholders and generated native-folder paths before release builds                              | ✅ Done                            |

---

## Phase 3 — Subscription: Ryvro Pro (Code — must be done before any store setup)

> Source: current Ryvro subscription implementation and release-blocker audit.
> **Must be complete before Phase 4.** Apple does not allow retroactively paywalling a feature that shipped free. The subscription binary must be in the first submitted version.

| #   | Task                                                                                                                                                                                                    | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 31  | Install RevenueCat SDK: `npx expo install react-native-purchases` + `react-native-purchases-ui`                                                                                                         | ✅ Done |
| 32  | Create `src/contexts/SubscriptionContext.tsx` — RevenueCat init, `isPro` state, `openPaywall`, `restorePurchases`                                                                                       | ✅ Done |
| 33  | Create `src/hooks/useSubscription.ts` — convenience re-export of `useSubscription`                                                                                                                      | ✅ Done |
| 34  | Create `src/components/subscription/PadlockOverlay.tsx` — absolute overlay rendered over locked calendar weeks                                                                                          | ✅ Done |
| 35  | Create `src/screens/subscription/PaywallScreen.tsx` — full-screen paywall: gold mic hero, 5 benefit lines, annual pre-selected, "Start 7-Day Free Trial" CTA, Restore Purchases link                    | ✅ Done |
| 36  | Edit `App.tsx` — wrap app with `<SubscriptionProvider>`, render `<PaywallScreen>` as full-screen overlay when `paywallVisible` is true                                                                  | ✅ Done |
| 37  | Edit `CustomTabBar.tsx` — gate center mic button: `isPro` → `openModal()`, not Pro → `openPaywall()`                                                                                                    | ✅ Done |
| 38  | Edit `MonthlyCalendarCard.tsx` + dashboard wiring — current week renders free; all other weeks get `<PadlockOverlay>` at 35% opacity when not Pro                                                       | ✅ Done |
| 39  | Edit `ProfileScreen.tsx` — add "Ryvro Pro — Active ✓" / "Upgrade to Ryvro Pro" row after Work Stats section                                                                                             | ✅ Done |
| 40  | Add RevenueCat native/public key and entitlement placeholders to `.env.example`, `.env.production.example`, runtime config, and `npm run release:env:check` (fill real `.env` values after Tasks 42–48) | ✅ Done |
| 41  | Re-run full quality gate after subscription code is added: `lint` + `type-check` + `test` + `release:check` — all must pass                                                                             | ✅ Done |

---

## Phase 4 — Subscription: RevenueCat + Store Products (Manual — you do these)

> Source: current Ryvro subscription implementation and release-blocker audit.
> Do these in parallel with Phase 5 (Apple Developer enrollment). RevenueCat is free to set up now; product IDs must exist before building the production binary.
> Console setup source of truth: `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md`.

| #   | Task                                                                                                                                                                                                              | Status  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 42  | 👤 Create RevenueCat account at revenuecat.com → add iOS app (bundle ID: `com.ryvro.shiftplanner`) → copy iOS SDK key → paste into `.env` as `REVENUECAT_IOS_KEY`                                                 | 👤 Todo |
| 43  | 👤 Add Android app to RevenueCat → copy Android SDK key → paste into `.env` as `REVENUECAT_ANDROID_KEY`                                                                                                           | 👤 Todo |
| 44  | 👤 RevenueCat → Entitlements → Add entitlement: ID = `pro`, Display name = `Ryvro Pro`                                                                                                                            | 👤 Todo |
| 45  | 👤 App Store Connect → your app → Subscriptions → create subscription group "Ryvro Pro" → add two products: `ryvro_pro_monthly` ($6.99/mo, 7-day free trial) and `ryvro_pro_annual` ($49.99/yr, 7-day free trial) | 👤 Todo |
| 46  | 👤 Google Play Console → Monetize → Subscriptions → create `ryvro_pro_monthly` and `ryvro_pro_annual` with matching pricing and 7-day free trial base plans                                                       | 👤 Todo |
| 47  | 👤 RevenueCat → Products → add both product IDs → attach both to the `pro` entitlement                                                                                                                            | 👤 Todo |
| 48  | 👤 RevenueCat → Offerings → create offering named `default` → add Annual package + Monthly package                                                                                                                | 👤 Todo |
| 49  | 👤 Test full subscription flow in RevenueCat sandbox: start trial → `isPro` = true → mic works + calendar unlocks → cancel → locks re-appear → Restore Purchases works                                            | 👤 Todo |

---

## Phase 5 — Accounts + External Setup (Manual — you do these)

| #   | Task                                                                                                                                                                                                                                                                                                                                                      | Status  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 11  | 👤 Enroll Apple Developer account at developer.apple.com ($99/year) — takes 24-48h to approve — **start immediately, runs in parallel with Phase 3**                                                                                                                                                                                                      | 👤 Todo |
| 12  | 👤 Register App ID on Apple Developer Portal with bundle ID `com.ryvro.shiftplanner` + Push Notifications capability                                                                                                                                                                                                                                      | 👤 Todo |
| 13  | 👤 Create app in App Store Connect (name: `Ryvro Shift Planner`, language: English AU, SKU: `ryvro-shift-001`)                                                                                                                                                                                                                                            | 👤 Todo |
| 14  | 👤 Create app in Google Play Console ($25 one-time fee) with matching name                                                                                                                                                                                                                                                                                | 👤 Todo |
| 15  | 👤 Run `eas login` then `eas init` in the repo root — copy the EAS Project ID UUID                                                                                                                                                                                                                                                                        | 👤 Todo |
| 16  | 👤 Copy `.env.production.example` to `.env`, paste `EAS_PROJECT_ID`, Firebase/Google OAuth values, `REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, live HTTPS Ryvro-owned legal/support/account deletion URLs, and deployed function URLs, then run `npm run release:env:check` | 👤 Todo |
| 17  | 👤 Set up iOS signing: run `eas credentials --platform ios` → add distribution cert + provisioning profile                                                                                                                                                                                                                                                | 👤 Todo |
| 17a | Use `docs/RYVRO_STORE_LISTING.md` for App Store and Google Play copy                                                                                                                                                                                                                                                                                      | ✅ Done |
| 17b | Use `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md` for privacy, terms, support, account deletion, and Firebase Auth email templates                                                                                                                                                                                                                            | ✅ Done |
| 17c | Use `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md` for App Store privacy answers, Google Play Data safety answers, content rating, export compliance, and reviewer notes                                                                                                                                                                                     | ✅ Done |
| 17d | Use `docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md` as the sequenced owner checklist and `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` as the non-secret evidence ledger for clearance, accounts, Firebase/OAuth, RevenueCat, legal/support, production builds, device QA, and store submission                                                                                | ✅ Done |
| 17e | Guard owner-only launch blockers with `npm run release:owner:check` so release verification fails if the account/device handoff stops documenting the app as not yet live                                                                                                                                                                                 | ✅ Done |
| 17f | Guard final EAS submit readiness with `npm run release:submit:check`; it must fail until EAS submit values are real and all required non-secret evidence rows are `Passed` or explicitly `Not applicable`                                                                                                                                                 | ✅ Done |

---

## Phase 6 — Backend + Privacy (Mix of code + manual)

| #   | Task                                                                                                                                                                                                             | Status  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 18  | Verify Firebase Cloud Functions are deployed: `curl` the configured `RYVRO_BRAIN_URL` endpoint and `SHIFT_SCHEDULE_PARSER_URL` endpoint; parser launch evidence must include a valid-prompt `200` draft response | 👤 Todo |
| 19  | 👤 Create and publish Privacy Policy — must mention microphone, Firebase, OpenAI, RevenueCat, and subscription terms (Notion page or GitHub Pages) — required before submission                                  | 👤 Todo |
| 19a | Repo-side Ryvro privacy, terms, support, and email template drafts are ready in `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`                                                                                        | ✅ Done |

---

## Phase 7 — Build + Test

| #   | Task                                                                                                                                           | Status                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 20  | Run `npm run release:env:check`, then push `.env` secrets to EAS: `eas secret:push --scope project --env-file .env` (includes RevenueCat keys) | 🔧 Blocked (requires `eas login` + real production `.env` values) |
| 21  | Build production iOS binary: `eas build --platform ios --profile production`                                                                   | 🔧 Blocked (signing/provisioning not configured yet)              |
| 22  | Build production Android AAB: `eas build --platform android --profile production`                                                              | 🔧 Partial (local AAB built via Gradle; EAS build pending login)  |
| 23  | 👤 Install TestFlight build on real iPhone — run full smoke test matrix (see below)                                                            | 👤 Todo                                                           |
| 24  | 👤 Install .apk on Android device — repeat smoke tests                                                                                         | 👤 Todo                                                           |

Repo-side offline basics are now covered by NetInfo-aware sync state, pending-sync visibility, and centralized cache TTL policy. Physical-device QA still has to prove the same behavior on production builds with real account credentials.

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

1. Fresh install → complete onboarding via Universal Shift Builder template start with a non-mining template such as healthcare, security, emergency services, manufacturing, oil/gas offshore, transport, warehouse logistics, hospitality, aviation, or rail
2. Fresh install → complete onboarding via Universal Shift Builder AI description with a FIFO/block-roster or rotating-shift prompt, then review and save the generated schedule
3. Fresh install → complete onboarding via Universal Shift Builder manual setup with custom shift names, colors, icons, reminders, exceptions, and calendar export enabled
4. Profile shift edits reflect immediately on dashboard
5. Hero/status/tab accent colors switch correctly per active shift
6. App relaunch preserves all onboarding data (AsyncStorage)
7. Schedule and Stats tabs are not visible anywhere in the nav
8. No dead/broken tap targets in any visible screen

**Subscription (Ryvro Pro):**

9. Tap center mic (not subscribed) → PaywallScreen appears; annual plan pre-selected; "Start 7-Day Free Trial" button visible
10. Tap any locked calendar week (not subscribed) → PaywallScreen appears
11. Start 7-day free trial (RevenueCat sandbox) → `isPro` = true → mic opens voice assistant; full year calendar unlocks
12. Profile screen shows "Ryvro Pro — Active ✓" when subscribed; shows "Upgrade to Ryvro Pro" row with price when not subscribed
13. Tap "Restore Purchases" on paywall → purchases restore correctly
14. Voice assistant opens (subscribed), handles microphone permission flow, and responds

---

## Quality Gate Commands (Tasks 5 + 41 — run in order, all must pass)

```bash
cd <repo-root>
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm run release:native:check
npm run release:store:check
npm run release:owner:check
npm run backend:build
npm run release:check
# Final owner-only submission gate after all evidence rows are complete:
npm run release:submit:check
```

---

## RC Build Validation Commands (Tasks 21 + 22)

```bash
# iOS archive
npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace RyvroShiftPlanner.xcworkspace \
  -scheme RyvroShiftPlanner -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /tmp/Ryvro.xcarchive archive

# Android AAB
cd <repo-root>
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease
```

---

## Go/No-Go Gate — Do Not Submit Until All True

**Code quality:**

- [x] `npm run lint` passes
- [x] `npm run type-check` passes
- [x] `npm test -- --runInBand --silent` passes cleanly
- [x] `npm run release:native:check` exits with code 0
- [x] `npm run release:store:check` exits with code 0
- [x] `npm run release:owner:check` exits with code 0
- [x] `npm run backend:build` passes
- [x] `npm run release:check` exits with code 0

**Subscription readiness:**

- [x] `react-native-purchases` installed and all subscription files created (Tasks 31–40)
- [x] Quality gate re-run passes after subscription code is added (Task 41)
- [ ] RevenueCat entitlement `pro` configured with both product IDs (Tasks 42–48)
- [ ] App Store Connect subscription products `ryvro_pro_monthly` + `ryvro_pro_annual` created (Task 45)
- [ ] Google Play subscription products created with matching IDs (Task 46)
- [ ] Full subscription sandbox smoke test passes on device (Task 49 + smoke test items 8–13)

**Build and store:**

- [ ] iOS archive built with production bundle ID
- [ ] Android AAB built with production ID + valid release signing
- [ ] Manual smoke tests pass on physical iOS + Android devices (all smoke matrix items)
- [ ] Privacy Policy published and URL live — mentions RevenueCat + subscription terms (Task 19)
- [ ] App Store Connect metadata + privacy form + in-app purchase section completed from `docs/RYVRO_STORE_LISTING.md`, `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`, and `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`
- [ ] Play Console data safety + content forms + in-app products declared completed from `docs/RYVRO_STORE_LISTING.md`, `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`, and `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`
