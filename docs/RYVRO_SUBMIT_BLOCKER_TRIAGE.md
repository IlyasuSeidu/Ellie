# Ryvro Submit Blocker Triage

Last updated: 2026-06-14

Use this file when `npm run release:submit:check` fails. It groups the remaining blockers into the order that should unblock TestFlight, Play internal testing, and final store submission.

Do not store passwords, payment details, service account JSON, private keys, signing material, RevenueCat SDK keys, Firebase config file contents, legal privileged communications, reviewer passwords, or tester passwords in Git, docs, screenshots, or chat.

## Current Submit Gate

Run:

```bash
npm run release:submit:check
```

Expected current result: the command fails until the remaining owner evidence rows in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` are no longer `Pending owner evidence` and production EAS submit values are real.

The same command scans the owner evidence packet for high-risk secret material, including service-account private-key JSON fields, private-key blocks, Firebase API keys, RevenueCat SDK keys, and EAS access tokens. If it fails for a secret scan item, remove the secret from the tracked file, rotate the exposed key in the owning console, and replace the evidence with a non-secret screenshot reference or dashboard note.

Latest checked on 2026-06-14: `npm run release:native:check`, `npm run release:store:check`, and `npm run release:owner:check` passed. Google Play app creation, package reservation, Google Play Android Developer API enablement, Play Console service-account invite, and local ignored `./google-play-key.json` creation are now recorded as passed. `npm run release:submit:check` still fails because other owner evidence rows remain pending. `npm run release:env:check` still fails because this checkout does not have real production `.env` values or ignored production Firebase config files. The local retired `ELLIE_BRAIN_URL` and `ELLIE_BRAIN_TIMEOUT` keys were removed from the ignored `.env` on 2026-06-14 and no longer appear in the env preflight failures. `npm run release:clearance` still requires manual legal/social evidence; public checks show `getryvro.com` is registered and resolves, but formal trademark clearance and logged-in social-handle reservation remain owner-side proof items.

Previously cleared submit-gate items: `Domain control for getryvro.com`, `Support page/mailbox`, and Android service account key path `./google-play-key.json` no longer appear in submit-gate failures after owner purchase confirmation, DNS proof, Firebase custom-domain activation, certificate activation, live HTTPS checks, Google Play Console email-delivery proof to `support@getryvro.com`, Play service-account invitation, and local ignored key-file presence were recorded as passed.

The remaining checked blocker families are:

- Formal trademark/legal clearance for `Ryvro`
- Google Play internal testing, Android QA, and Play submission
- Social handle reservation
- Privacy and terms owner content review plus store-console use of the live `getryvro.com` URLs
- Firebase Auth email templates, production env preflight, and EAS production environment push
- Production `.env`, `npm run release:env:check`, removal of retired Ellie env keys, and EAS production environment push
- RevenueCat apps, entitlement `pro`, store products, offering `default`, and sandbox purchase QA
- App Store privacy, content rating, export compliance, EU trader status, reviewer account, screenshots, TestFlight iPhone QA, and store submission

## Recommended Order

### 1. Clear The Name And Public Ownership

Complete these before spending more time on store metadata:

- Formal trademark/legal clearance for `Ryvro`
- Keep the passed support mailbox evidence current: `support@getryvro.com` received a Google Play Console verification email on 2026-06-07, and the one-time code was not recorded in the repo.
- Publish owner-reviewed privacy, terms, support, and account deletion pages at `getryvro.com`
- Reserve social handles or approved fallbacks

Evidence source: `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md`.

### 2. Finish Google Play Verification And App Setup

Google Play blocks Android submission and RevenueCat Android product linkage.

- Finish the remaining Google account verification tasks now shown on the Play Console dashboard. Identity verification now shows `Your identity has been verified successfully`; Android mobile device access verification and contact phone verification are still required before app creation is enabled.
- Complete Android mobile device access verification on a physical Android 10 or newer device signed into the owner Google account; the emulator is not accepted for this Play Console verification step.
- Return to Play Console after verification and confirm `Create app` is enabled.
- Create the `Ryvro Shift Planner` app.
- Confirm package `com.ryvro.shiftplanner`.
- Create a least-privilege service account.
- Confirm the local ignored `./google-play-key.json` is present before Android EAS submit.
- Confirm `.gitignore` keeps `google-play-key.json` out of Git.
- Keep Android track as `internal` until internal-track QA passes.

Evidence source: `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md`.

### 3. Finish Firebase Email Templates And Production Env

Do this before rebuilding production binaries.

- Ryvro Firebase project `ryvro-shift-planner` is created.
- Firebase iOS app `Ryvro iOS` is active for `com.ryvro.shiftplanner`, and root-level `GoogleService-Info.plist` is refreshed as an ignored local file after Google and Apple sign-in provider changes.
- Firebase Android app `Ryvro Android` is active for `com.ryvro.shiftplanner`, and root-level `google-services.json` is refreshed as an ignored local file after Google and Apple sign-in provider changes.
- Web, iOS, and Android OAuth clients are created.
- Firebase Auth Email/Password, Google, and Apple providers are enabled, and `getryvro.com` is confirmed as a Firebase Auth authorized domain.
- `OPENAI_API_KEY` is stored in Firebase Secret Manager, both `ryvroBrain` and `parseShiftScheduleDescription` are deployed, and backend provider smoke tests have passed.
- Finish Firebase Auth email-template evidence for the custom action URL or action domain. The remaining problem is that the console save produced an error and the API patch returned `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, so this still needs owner-console or support resolution evidence before submission.
- Fill real production `.env` values.
- Run `npm run release:env:check`.
- Push checked production values to EAS with `npm run release:env:push`.

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

Do this only after real RevenueCat, legal URLs, backend URLs, and EAS production environment values exist.

- Run `npm run release:versions:get` and confirm the current EAS remote values.
- App Store Connect already has version `1.0.0`, build `2`, from EAS build `71fde2ff-aa36-4741-aa69-e4f11ba30acd`, and TestFlight visual inspection showed build `2` as `Ready to Submit`.
- Do not reuse iOS build number `2` for the next production-auth-ready binary. If EAS still reports iOS build number `2`, run `eas build:version:set --platform ios --profile production` before rebuilding so the next upload uses a later build number.
- Check Android `versionCode`; if it is still `1` or otherwise already used for a Play upload, run `eas build:version:set --platform android --profile production` before rebuilding.
- Rebuild iOS production binary after real Firebase, OAuth, RevenueCat, backend, and legal URL values have been pushed to the EAS production environment.
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
