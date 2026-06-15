# Ryvro Owner Launch Runbook

Last updated: 2026-06-15

This is the account-owner sequence for taking the repo-ready Ryvro build to the App Store and Google Play. It intentionally separates owner-only account work from repo-proven work so a release cannot be treated as live before console, domain, payment, backend, and physical-device evidence exists.

Use these source docs while completing the runbook:

- `RYVRO_RELEASE_TASKS.md` for the canonical task list and go/no-go gate.
- `docs/RYVRO_RELEASE_READINESS_REPORT.md` for repo-proven evidence and known blockers.
- `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md` for Firebase, OAuth, Apple, RevenueCat, EAS, domain, social, analytics, and support console values.
- `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md` for formal clearance, domain purchase, DNS/HTTPS proof, support mailbox, legal page publication, and social handle reservation evidence.
- `docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md` for the ordered owner workflow when `npm run release:submit:check` reports the remaining blockers.
- `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` for App Store Connect metadata, TestFlight internal testing, App Store privacy/forms, reviewer account, iOS subscriptions, EAS submit, and App Review evidence.
- `docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md` for Firebase project creation, native service files, OAuth clients, Auth domains, backend deploys, smoke tests, production env preflight, and EAS secret evidence.
- `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md` for Ryvro Pro entitlement, store products, RevenueCat offering, SDK key copying, env preflight, and sandbox purchase QA evidence.
- `docs/RYVRO_STORE_LISTING.md` for App Store, Google Play, social profile, and launch landing-page copy.
- `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md` for Play Console verification, app creation, service account JSON handling, internal testing, and Android device QA evidence.
- `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md` for required App Store and Google Play screenshot frames, file names, and capture evidence.
- `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md` for privacy, terms, support, account deletion, and Firebase Auth email templates.
- `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md` for App Store privacy answers, Google Play Data safety answers, content rating, export compliance, and reviewer notes.
- `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` for recording non-secret owner evidence before go/no-go.
- `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` for TestFlight iPhone, Android physical/internal-track QA, sandbox purchase, and store screenshot evidence capture.

## Stop Gates

Do not submit to App Store review or Google Play production until all of these are true:

- Formal trademark/legal clearance for `Ryvro` is complete in launch markets.
- The Apple Developer Program License Agreement remains accepted by the Account Holder in Apple Developer.
- The owner has reserved or created App Store Connect app name `Ryvro Shift Planner`; current ASC app ID is `6776994726`, and the verified owner Apple ID email in EAS submit config is `seiduilyasu94@gmail.com`.
- App Store Connect EU trader status is complete if the app will be submitted for EU distribution.
- The owner has reserved or created Google Play app title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`.
- The launch domain is purchased, controlled, and serving privacy, terms, support, and `https://getryvro.com/delete-account` account-deletion instructions.
- Firebase, Google OAuth, Apple Sign-In, RevenueCat, and EAS production environment values are created for `com.ryvro.shiftplanner`.
- `npm run release:env:check` passes with the real production `.env`.
- Production `ryvroBrain` and `parseShiftScheduleDescription` endpoints are deployed and smoke-tested.
- RevenueCat products, entitlement `pro`, and offering `default` are connected to App Store and Play subscription products.
- Physical iOS and Android smoke tests pass with real auth, purchases, reminders, calendar import/export, and assistant flows.
- Store screenshots, app privacy, data safety, content rating, in-app purchase declarations, and reviewer notes are complete.
- `npm run release:submit:check` passes after the evidence log is completed and EAS submit values are real.

## Sequence

### 1. Clearance And Reservations

Owner-only steps:

- Complete formal trademark/legal clearance for `Ryvro`.
- Use `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md` as the fill-in evidence packet for formal clearance, domain purchase, DNS/HTTPS proof, support mailbox, legal page publication, and social handle reservation.
- Sign in as the Apple Developer Account Holder at `developer.apple.com/account` and confirm the Apple Developer Program License Agreement is accepted.
- Reserve or create App Store Connect app name `Ryvro Shift Planner`. Completed 2026-06-05 with ASC app ID `6776994726`.
- Complete App Store Connect EU trader status if Ryvro will be distributed in the European Union.
- Use `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` for the App Store Connect app-record, EU trader, TestFlight, reviewer-account, and App Review evidence packet.
- Reserve or create Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`.
- Purchase or reserve the launch domain, with `getryvro.com` as the current preferred candidate.
- Reserve social handles while logged in, starting with `@ryvro`, then `@getryvro` or `@tryryvro` if needed.

Evidence to record:

- Counsel or trademark-search result summary.
- Completed `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md` packet or equivalent non-secret clearance/domain/social evidence.
- Apple Developer Program License Agreement accepted status.
- App Store Connect app ID / Apple ID. Current ASC app ID: `6776994726`; owner Apple ID email: `seiduilyasu94@gmail.com`.
- Completed `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` packet or equivalent non-secret App Store/TestFlight evidence.
- EU trader status completion note, if applicable.
- Google Play package reservation confirmation.
- Registrar receipt and DNS control proof.
- Reserved social handle list.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 2. Account And Console Setup

Owner-only steps:

- Enroll or confirm Apple Developer access.
- Register the Apple App ID for `com.ryvro.shiftplanner` with Sign in with Apple and Push Notifications enabled. Completed 2026-06-05.
- Create the App Store Connect app with SKU `ryvro-shift-001`. Completed 2026-06-05 with ASC app ID `6776994726`.
- Create the Google Play Console app. Completed 2026-06-14: Play Console app `Ryvro Shift Planner`, package `com.ryvro.shiftplanner`, app ID `4974146267407561805`, app type App, pricing Free, and status Draft. Earlier enrollment evidence covered the personal account path, public developer name `Ryvro`, public email `support@getryvro.com`, website `https://getryvro.com`, developer registration, Android device access verification, and contact phone verification. Do not store the private payments-profile values in the repo.
- Use `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md` for the Play Console app, `com.ryvro.shiftplanner` package confirmation, Google Play service account, ignored local key path, completed Android internal-track upload evidence, tester-list/opt-in confirmation, and physical Android QA.
- Use `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` for App Store Connect metadata, TestFlight internal group/build evidence, reviewer account, and App Review submission gates.
- Run `eas login` and create or link a Ryvro EAS project whose project slug matches `ryvro`, then copy the new EAS project UUID into production env values. Completed 2026-06-05: `@ilyasu/ryvro`, project ID `b306643e-1688-448e-8acd-f72bf74312c3`.
- In the Expo dashboard, confirm the project display name is `Ryvro Shift Planner`. Completed 2026-06-05.
- Upload an App Store Connect API key in Expo/EAS before connecting the project to the App Store Connect app. The dashboard showed no saved ASC API keys on 2026-06-05.
- Set up iOS distribution credentials and Android release upload key or EAS-managed credentials. iOS signing was completed on 2026-06-05 for `@ilyasu/ryvro` / `com.ryvro.shiftplanner`; Android release signing was completed on 2026-06-05 with an EAS-managed keystore.

Evidence to record:

- Apple Team ID.
- App Store Connect app ID `6776994726`.
- Owner Apple ID email `seiduilyasu94@gmail.com`.
- Google Play app/package dashboard link.
- Google Play developer enrollment account type and verification status.
- Google Play service account email, permission summary, and local key path `./google-play-key.json`; do not record the JSON contents.
- Play Console developer enrollment status. Enrollment and app creation are complete for the current personal developer account; retain only non-secret status notes and do not store payment-profile details.
- EAS project ID `b306643e-1688-448e-8acd-f72bf74312c3`; `eas project:info` output verifies `@ilyasu/ryvro`.
- Expo/EAS App Store Connect app connection note after the ASC API key is uploaded.
- Signing/provisioning status. For iOS, record only non-secret certificate/profile identifiers and expiry dates; do not record password, certificate, private key, push key material, or provisioning-profile contents.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 3. Firebase, OAuth, Backend, And Secrets

Owner-only steps:

- Create or rename the production Firebase project to a Ryvro-visible name.
- Use `docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md` as the fill-in evidence packet for Firebase, OAuth, Auth domains, backend deploys, smoke tests, production env preflight, and EAS production environment values.
- Refresh Firebase CLI auth with `firebase login --reauth`, then verify access with `firebase projects:list`.
- When Google shows `Firebase CLI wants to access your Google Account`, approve it only if you are ready for Firebase CLI to administer Firebase settings and access Google Cloud data for the owner account.
- Firebase project creation was completed on 2026-06-05 as `Ryvro Shift Planner` / `ryvro-shift-planner`; `firebase projects:list --json` confirmed state `ACTIVE`, project number `1002666052675`, and hosting site `ryvro-shift-planner`. The tracked `.firebaserc` default now points to `ryvro-shift-planner`.
- Local Firebase CLI caveat: if `firebase use` still prints `ellie-20260220135308` because Firebase Tools cannot access `/Users/user/.config`, repair the local Firebase Tools config-store permission before deploying or pass `--project ryvro-shift-planner` explicitly on Firebase deploy/functions commands.
- Firebase native app creation was completed on 2026-06-05. `firebase apps:list --project ryvro-shift-planner --json` confirmed `Ryvro iOS` app ID `1:1002666052675:ios:bf72c1cc611308a76b98f6` and `Ryvro Android` app ID `1:1002666052675:android:735fd0ef9443ddf76b98f6`, both active with namespace `com.ryvro.shiftplanner`.
- Fresh root-level Firebase native service files were downloaded as ignored local files at `GoogleService-Info.plist` and `google-services.json`; metadata-only verification confirmed both target `ryvro-shift-planner` and `com.ryvro.shiftplanner`.
- Keep the real root-level Firebase native service files at the repo root as `GoogleService-Info.plist` and `google-services.json`; do not point production `.env` at generated `ios/` or `android/` paths because clean prebuild deletes them.
- Create or refresh EAS production file variables from those ignored root files before cloud builds because `.easignore` excludes the raw files from the build archive:

```bash
npm run release:env:files
```

That helper validates `.env` first, then runs the equivalent EAS file-variable commands:

```bash
npx eas-cli env:create --environment production --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist
npx eas-cli env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

- Create Google OAuth web, iOS, and Android clients in the same project.
- Deploy backend functions to the Ryvro Firebase project.
- Configure `.env` from `.env.production.example` with real values.
- Confirm both backend URLs point at the Ryvro Firebase project:

```bash
RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain
SHIFT_SCHEDULE_PARSER_URL=https://<region>-<project-id>.cloudfunctions.net/parseShiftScheduleDescription
```

- Run the repo preflights:

```bash
npm run release:native:check
npm run release:env:check
```

- Smoke-test both deployed functions:

```bash
curl -i -X POST "$RYVRO_BRAIN_URL" \
  -H "Content-Type: application/json" \
  -d "{}"

curl -i -X POST "$SHIFT_SCHEDULE_PARSER_URL" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"I work 2 days, 2 nights, then 4 off.","timezone":"UTC","locale":"en-US","today":"2026-05-31"}'
```

The parser smoke test must return `200` with a draft schedule before launch. A `400` from an intentionally invalid parser body proves reachability only; missing secret, provider, Firebase project, auth, or network errors are not launch-ready.

- Push checked production values to EAS only after the preflight passes:

```bash
npm run release:env:push
```

Evidence to record:

- Firebase project ID and app IDs.
- Completed `docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md` packet or equivalent non-secret Firebase/OAuth/backend evidence.
- OAuth client IDs.
- `npm run release:native:check` output.
- `npm run release:env:check` output.
- EAS production environment push confirmation.
- `npm run release:env:files` confirmation.
- EAS file-variable confirmation for `GOOGLE_SERVICES_PLIST` and `GOOGLE_SERVICES_JSON`, without recording file contents.
- `curl` smoke-test output for `RYVRO_BRAIN_URL`.
- `curl` smoke-test output for `SHIFT_SCHEDULE_PARSER_URL` with a minimal schedule prompt.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 4. RevenueCat And Store Products

Owner-only steps:

- Create Ryvro iOS and Android apps in RevenueCat.
- Use `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md` as the fill-in evidence packet for Ryvro Pro store products, entitlement, offering, SDK key copying, env preflight, and sandbox purchase QA.
- Configure entitlement `pro` with display name `Ryvro Pro`.
- Create App Store subscription group `Ryvro Pro`.
- Create products `ryvro_pro_monthly` and `ryvro_pro_annual` in App Store Connect and Google Play Console.
- Attach both products to the RevenueCat `pro` entitlement.
- Create RevenueCat offering `default` with Monthly and Annual packages.
- Use production/sandbox SDK keys in `.env`; do not use RevenueCat `test_` keys for release QA.

Evidence to record:

- RevenueCat project/app IDs.
- Completed `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md` packet or equivalent non-secret subscription evidence.
- iOS and Android SDK keys copied into `.env`.
- App Store and Play product status.
- Sandbox purchase, cancel, and restore results.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 5. Legal, Support, And Store Forms

Owner-only steps:

- Review the live privacy policy, terms, support, and `https://getryvro.com/delete-account` account-deletion page on the controlled launch domain.
- Use `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md` for live domain, DNS/HTTPS, support mailbox, static launch page, and social profile evidence.
- Confirm the repo static launch pages in `web/launch` still match the owner-approved legal/support copy now that final effective dates and `getryvro.com` links are live.
- Publish the launch landing page using the source copy in `docs/RYVRO_STORE_LISTING.md`.
- Apply the reserved social handle bios, display names, and links from `docs/RYVRO_STORE_LISTING.md` after account reservation.
- Configure Firebase Auth verification and password-reset email templates with Ryvro copy.
- Fill App Store privacy answers from `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.
- Use `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` for App Store privacy, export compliance, content rating, EU trader status, reviewer account, and App Review evidence.
- Fill Google Play Data safety and account deletion answers from `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.
- Complete content rating, age rating, export compliance, app access, and reviewer notes.

Evidence to record:

- Live privacy, terms, support, and `https://getryvro.com/delete-account` account-deletion URLs.
- Deployment note for the reviewed `web/launch` static pages or the equivalent owner-approved hosted policy pages.
- Live launch landing-page URL and social profile links.
- Firebase Auth template screenshots or confirmation.
- App Store privacy form completion.
- Google Play Data safety form completion.
- Reviewer account credentials stored only in the store consoles.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 6. Production Builds

Owner-only steps:

- Build iOS production binary:

```bash
npm run release:versions:get
eas build:version:set --platform ios --profile production
eas build --platform ios --profile production
```

- Build Android production AAB:

```bash
eas build:version:set --platform android --profile production
eas build --platform android --profile production
```

- Submit only after physical-device QA passes.

Evidence to record:

- EAS iOS build URL and build number.
- App Store Connect build selection and TestFlight availability note from `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md`.
- EAS Android build URL, version code, AAB archive URL when finished, and package ID proof.
- Installed bundle/package identity proof.
- Any build warnings and resolutions.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 7. Device QA

Run the full smoke matrix in `RYVRO_RELEASE_TASKS.md` on:

- TestFlight iPhone.
- Physical Android device or Play internal testing install.

Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` as the fill-in QA packet for each platform.
Use `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` for the matching TestFlight group, tester invite, installed bundle ID, and App Store submission evidence.

Must-pass coverage:

- Fresh install and onboarding through non-mining template start.
- Fresh install and onboarding through FIFO/block-roster or rotating-shift AI description.
- Fresh install and onboarding through manual custom setup.
- Email auth, Google Sign-In, and Apple Sign-In where platform-available.
- Dashboard colors/icons, settings edits, reminders, exceptions, import/export, and app relaunch persistence.
- Paywall, sandbox trial, entitlement activation, locked calendar behavior, center mic unlock, and restore purchases.
- Voice assistant permission flow and basic response path.
- Offline saved-schedule visibility and pending-sync indicator.

Evidence to record:

- Device model, OS version, app build number/versionCode, tester account, date/time, and pass/fail notes.
- Completed `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` packet or equivalent non-secret QA evidence.
- Screenshots or screen recordings for failed cases.
- Store-ready screenshots listed in `docs/RYVRO_STORE_LISTING.md`.
- Store-ready screenshot file names and capture metadata from `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 8. Submission And Release

Owner-only steps:

- Run the final submit readiness guard:

```bash
npm run release:submit:check
```

- Upload screenshots, metadata, privacy/data forms, content rating, and subscription details.
- Submit iOS through App Store Connect after `eas submit --platform ios --latest`.
- Android internal-track submission is already complete for versionCode `8`; use `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md` to confirm tester-list and opt-in-link evidence before physical Android QA.
- Use `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md` before any Android resubmission with `eas submit --platform android --latest` or production promotion.
- Promote Android from internal testing to production only after internal track smoke passes.

Evidence to record:

- App Store submission ID and status.
- Google Play release ID and track status.
- Review feedback and resolutions.
- Final production release date/time.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

## Current Repo Evidence

- Latest local gate: `npm run release:check` passed on 2026-06-15 after aligning Ryvro EAS update guidance, with TypeScript, 113 Jest suites, 1,813 tests, 4 snapshots, the Ryvro native scaffold preflight, the store readiness preflight, the owner handoff preflight, and backend build.
- Current local release gate includes `npm run release:owner:check`, which fails if the account-only launch blockers, physical-device QA requirements, and not-yet-live stop gates disappear from the tracked handoff docs.
- Final submit readiness is guarded by `npm run release:submit:check`, which must fail until every required non-secret row in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` is `Passed` or explicitly `Not applicable`.
- Store screenshot capture is now tracked in `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`, and `npm run release:store:check` / `npm run release:owner:check` fail if the checklist or evidence-log handoff disappears.
- Recent verified pushed PR gate evidence is GitHub Actions CI run `27526037831` on commit `ccc491c`; it passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent verified E2E workflow evidence is GitHub Actions run `27525894828` on commit `0cd4a7d`; it passed the bounded E2E Configuration Check, with native simulator/emulator Detox jobs available through the manual `run_native` workflow input.
- Current repo branch: `codex/ryvro-rebrand-rollout`.

Keep this section current whenever a new launch-readiness commit is pushed and CI passes.
