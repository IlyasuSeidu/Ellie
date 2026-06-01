# Ryvro Owner Launch Runbook

Last updated: 2026-05-31

This is the account-owner sequence for taking the repo-ready Ryvro build to the App Store and Google Play. It intentionally separates owner-only account work from repo-proven work so a release cannot be treated as live before console, domain, payment, backend, and physical-device evidence exists.

Use these source docs while completing the runbook:

- `RYVRO_RELEASE_TASKS.md` for the canonical task list and go/no-go gate.
- `docs/RYVRO_RELEASE_READINESS_REPORT.md` for repo-proven evidence and known blockers.
- `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md` for Firebase, OAuth, Apple, RevenueCat, EAS, domain, social, analytics, and support console values.
- `docs/RYVRO_STORE_LISTING.md` for App Store, Google Play, social profile, and launch landing-page copy.
- `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md` for required App Store and Google Play screenshot frames, file names, and capture evidence.
- `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md` for privacy, terms, support, account deletion, and Firebase Auth email templates.
- `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md` for App Store privacy answers, Google Play Data safety answers, content rating, export compliance, and reviewer notes.
- `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` for recording non-secret owner evidence before go/no-go.

## Stop Gates

Do not submit to App Store review or Google Play production until all of these are true:

- Formal trademark/legal clearance for `Ryvro` is complete in launch markets.
- The owner has reserved or created App Store Connect app name `Ryvro Shift Planner`.
- The owner has reserved or created Google Play app title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`.
- The launch domain is purchased, controlled, and serving privacy, terms, support, and `https://getryvro.com/delete-account` account-deletion instructions.
- Firebase, Google OAuth, Apple Sign-In, RevenueCat, and EAS secrets are created for `com.ryvro.shiftplanner`.
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
- Reserve or create App Store Connect app name `Ryvro Shift Planner`.
- Reserve or create Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`.
- Purchase or reserve the launch domain, with `getryvro.com` as the current preferred candidate.
- Reserve social handles while logged in, starting with `@ryvro`, then `@getryvro` or `@tryryvro` if needed.

Evidence to record:

- Counsel or trademark-search result summary.
- App Store Connect app ID / Apple ID.
- Google Play package reservation confirmation.
- Registrar receipt and DNS control proof.
- Reserved social handle list.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 2. Account And Console Setup

Owner-only steps:

- Enroll or confirm Apple Developer access.
- Register the Apple App ID for `com.ryvro.shiftplanner` with Sign in with Apple and Push Notifications enabled.
- Create the App Store Connect app with SKU `ryvro-shift-001`.
- Create the Google Play Console app.
- Run `eas login` and `eas init` in the repo root, then copy the EAS project UUID into production env values.
- Set up iOS distribution credentials and Android release upload key or EAS-managed credentials.

Evidence to record:

- Apple Team ID.
- App Store Connect app ID.
- Google Play app/package dashboard link.
- EAS project ID.
- Signing/provisioning status.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 3. Firebase, OAuth, Backend, And Secrets

Owner-only steps:

- Create or rename the production Firebase project to a Ryvro-visible name.
- Add iOS app `com.ryvro.shiftplanner` and Android app `com.ryvro.shiftplanner`.
- Download fresh `GoogleService-Info.plist` and `google-services.json`.
- Place the real root-level Firebase native service files at the repo root as `GoogleService-Info.plist` and `google-services.json`; do not point production `.env` at generated `ios/` or `android/` paths because clean prebuild deletes them.
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

- Push secrets to EAS only after the preflight passes:

```bash
eas secret:push --scope project --env-file .env
```

Evidence to record:

- Firebase project ID and app IDs.
- OAuth client IDs.
- `npm run release:native:check` output.
- `npm run release:env:check` output.
- EAS secret push confirmation.
- `curl` smoke-test output for `RYVRO_BRAIN_URL`.
- `curl` smoke-test output for `SHIFT_SCHEDULE_PARSER_URL` with a minimal schedule prompt.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 4. RevenueCat And Store Products

Owner-only steps:

- Create Ryvro iOS and Android apps in RevenueCat.
- Configure entitlement `pro` with display name `Ryvro Pro`.
- Create App Store subscription group `Ryvro Pro`.
- Create products `ryvro_pro_monthly` and `ryvro_pro_annual` in App Store Connect and Google Play Console.
- Attach both products to the RevenueCat `pro` entitlement.
- Create RevenueCat offering `default` with Monthly and Annual packages.
- Use production/sandbox SDK keys in `.env`; do not use RevenueCat `test_` keys for release QA.

Evidence to record:

- RevenueCat project/app IDs.
- iOS and Android SDK keys copied into `.env`.
- App Store and Play product status.
- Sandbox purchase, cancel, and restore results.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 5. Legal, Support, And Store Forms

Owner-only steps:

- Publish privacy policy, terms, support, and the `https://getryvro.com/delete-account` account-deletion page on the controlled launch domain.
- Publish the launch landing page using the source copy in `docs/RYVRO_STORE_LISTING.md`.
- Apply the reserved social handle bios, display names, and links from `docs/RYVRO_STORE_LISTING.md` after account reservation.
- Configure Firebase Auth verification and password-reset email templates with Ryvro copy.
- Fill App Store privacy answers from `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.
- Fill Google Play Data safety and account deletion answers from `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.
- Complete content rating, age rating, export compliance, app access, and reviewer notes.

Evidence to record:

- Live privacy, terms, support, and `https://getryvro.com/delete-account` account-deletion URLs.
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
eas build --platform ios --profile production
```

- Build Android production AAB:

```bash
eas build --platform android --profile production
```

- Submit only after physical-device QA passes.

Evidence to record:

- EAS iOS build URL and build number.
- EAS Android build URL and versionCode.
- Installed bundle/package identity proof.
- Any build warnings and resolutions.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

### 7. Device QA

Run the full smoke matrix in `RYVRO_RELEASE_TASKS.md` on:

- TestFlight iPhone.
- Physical Android device or Play internal testing install.

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
- Submit Android to internal testing first after `eas submit --platform android --latest`.
- Promote Android from internal testing to production only after internal track smoke passes.

Evidence to record:

- App Store submission ID and status.
- Google Play release ID and track status.
- Review feedback and resolutions.
- Final production release date/time.
- Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret evidence references.

## Current Repo Evidence

- Latest local gate: `npm run release:check` passed on 2026-06-01 with 110 Jest suites, 1,779 tests, 4 snapshots, the Ryvro native scaffold preflight, the store readiness preflight, the owner handoff preflight, and backend build.
- Current local release gate includes `npm run release:owner:check`, which fails if the account-only launch blockers, physical-device QA requirements, and not-yet-live stop gates disappear from the tracked handoff docs.
- Final submit readiness is guarded by `npm run release:submit:check`, which must fail until EAS submit placeholders are replaced and every required non-secret row in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` is `Passed` or explicitly `Not applicable`.
- Store screenshot capture is now tracked in `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`, and `npm run release:store:check` / `npm run release:owner:check` fail if the checklist or evidence-log handoff disappears.
- Recent pushed PR gate evidence includes GitHub Actions CI run `26728238458` on commit `d7f8f0e`, CI run `26728115119` on commit `50bc770`, and CI run `26727972848` on commit `5bee483`, which passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Recent pushed PR gates also include CI run `26726876514` on commit `f72f885` and CI run `26726707448` on commit `0290dc2`; both passed Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job running `npm run release:check` with the owner handoff preflight.
- Current repo branch: `codex/ryvro-rebrand-rollout`.

Keep this section current whenever a new launch-readiness commit is pushed and CI passes.
