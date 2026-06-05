# Ryvro Submit Blocker Triage

Last updated: 2026-06-05

Use this file when `npm run release:submit:check` fails. It groups the remaining blockers into the order that should unblock TestFlight, Play internal testing, and final store submission.

Do not store passwords, payment details, service account JSON, private keys, signing material, RevenueCat SDK keys, Firebase config file contents, legal privileged communications, reviewer passwords, or tester passwords in Git, docs, screenshots, or chat.

## Current Submit Gate

Run:

```bash
npm run release:submit:check
```

Expected current result: the command fails until the owner evidence rows in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` are no longer `Pending owner evidence`, the Android service account key exists locally at `./google-play-key.json`, and production EAS submit values are real.

The latest checked blocker families are:

- Android service account key path `./google-play-key.json`
- Formal trademark/legal clearance for `Ryvro`
- Google Play title, package, app creation, service account, internal testing, Android QA, and Play submission
- Domain control for `getryvro.com`, DNS, HTTPS, live privacy, terms, support, and account deletion pages
- Social handle reservation
- Firebase project, native apps, OAuth clients, Auth domains, Auth email templates, backend deploys, and backend smoke tests
- Production `.env`, `npm run release:env:check`, and EAS secret push
- RevenueCat apps, entitlement `pro`, store products, offering `default`, and sandbox purchase QA
- App Store privacy, content rating, export compliance, EU trader status, reviewer account, screenshots, TestFlight iPhone QA, and store submission

## Recommended Order

### 1. Clear The Name And Public Ownership

Complete these before spending more time on store metadata:

- Formal trademark/legal clearance for `Ryvro`
- Purchase or reserve `getryvro.com`
- Configure DNS and HTTPS
- Create `support@getryvro.com`
- Publish reviewed privacy, terms, support, and account deletion pages
- Reserve social handles or approved fallbacks

Evidence source: `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md`.

### 2. Finish Google Play Enrollment

Google Play blocks Android submission and RevenueCat Android product linkage.

- Finish Play Console developer-account enrollment.
- Create the `Ryvro Shift Planner` app.
- Confirm package `com.ryvro.shiftplanner`.
- Create a least-privilege service account.
- Save the downloaded JSON locally as `./google-play-key.json`.
- Confirm `.gitignore` keeps `google-play-key.json` out of Git.
- Keep Android track as `internal` until internal-track QA passes.

Evidence source: `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md`.

### 3. Create Production Firebase And OAuth

Do this before rebuilding production binaries.

- Ryvro Firebase project `ryvro-shift-planner` is created.
- Firebase iOS app `Ryvro iOS` is active for `com.ryvro.shiftplanner`, and root-level `GoogleService-Info.plist` is downloaded as an ignored local file.
- Firebase Android app `Ryvro Android` is active for `com.ryvro.shiftplanner`, and root-level `google-services.json` is downloaded as an ignored local file.
- Create web, iOS, and Android OAuth clients.
- Add `getryvro.com` as a Firebase Auth authorized domain.
- Configure Firebase Auth email templates with `Ryvro Support`, `support@getryvro.com`, and `getryvro.com`.
- Deploy `ryvroBrain` and `parseShiftScheduleDescription`.
- Smoke-test both deployed functions.
- Fill real production `.env` values.
- Run `npm run release:env:check`.
- Push project secrets with `eas secret:push --scope project --env-file .env`.

Evidence source: `docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md`.

### 4. Finish RevenueCat And Store Products

Do this before purchase QA and store review.

- Confirm Ryvro iOS and Android apps in RevenueCat.
- Configure entitlement ID `pro` with display name `Ryvro Pro`.
- Create App Store products `ryvro_pro_monthly` and `ryvro_pro_annual`.
- Create Google Play products `ryvro_pro_monthly` and `ryvro_pro_annual`.
- Attach both products to entitlement `pro`.
- Create offering ID `default` with monthly and annual packages.
- Run sandbox purchase, cancel, relock, and restore tests.

Evidence source: `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md`.

### 5. Rebuild, Test, Screenshot, Then Submit

Do this only after real Firebase, OAuth, RevenueCat, legal URLs, backend URLs, and EAS secrets exist.

- Run `npm run release:versions:get` and confirm the current EAS remote values.
- If iOS `buildNumber` is still `1` or Android `versionCode` is still `1`, run `eas build:version:set --platform ios --profile production` and `eas build:version:set --platform android --profile production` before rebuilding. The current checked EAS remote values are iOS build number `1` and Android versionCode `1`.
- Rebuild iOS production binary.
- Rebuild Android production AAB.
- Submit iOS build to TestFlight.
- Install and test on a real iPhone.
- Submit Android build to Play internal testing.
- Install and test on a physical Android device.
- Capture required store screenshots from production-equivalent builds.
- Complete App Store privacy, content rating, export compliance, EU trader status, reviewer access, and subscription review fields.
- Complete Google Play Data safety, content rating, app access, account deletion, internal testing, and subscription fields.
- Run `npm run release:submit:check`.
- Submit to App Store review and Google Play production only after the guard passes.

Evidence sources:

- `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md`
- `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md`
- `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`
- `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`
- `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md`

## Evidence Log Rule

Only mark a row in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` as `Passed` when the required evidence exists and is non-secret. Keep rows as `Pending owner evidence` when the work is not complete, even if public preflight checks look promising.
