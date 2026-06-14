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

Latest checked on 2026-06-14: `npm run release:native:check`, `npm run release:store:check`, and `npm run release:owner:check` passed. Google Play app creation, package reservation, Google Play Android Developer API enablement, Play Console service-account invite, and local ignored `./google-play-key.json` creation are now recorded as passed. A later logged-in Chrome recheck after the owner reported Play Console configuration complete still showed the Play subscriptions page blocked by `Missing requirements for accessing this page` and a required Google Payments merchant account. The Play payments profile flow opened, but did not expose a completed merchant account or subscription-product controls. App Store Connect API access is available, the App Store Connect in-app purchase key was generated, RevenueCat apps `appd8a95a73e0` and `appab0f4b628d` are saved for `com.ryvro.shiftplanner`, RevenueCat entitlement `pro` exists, offering `default` contains annual and monthly packages, the ignored local `.env` has real iOS and Android RevenueCat SDK key mirrors, `npm run release:env:check` passed, `npm run release:env:push -- --force` passed, and `npm run release:env:files -- --force` created the Firebase file variables. `npm run release:submit:check` still fails because other owner evidence rows remain pending, including App Store subscription products, Google Play subscription products, sandbox purchase QA, and device QA. `npm run release:clearance` still requires manual legal/social evidence; public checks show `getryvro.com` is registered and resolves, but formal trademark clearance and logged-in social-handle reservation remain owner-side proof items.

Previously cleared submit-gate items: `Domain control for getryvro.com`, `Support page/mailbox`, and Android service account key path `./google-play-key.json` no longer appear in submit-gate failures after owner purchase confirmation, DNS proof, Firebase custom-domain activation, certificate activation, live HTTPS checks, Google Play Console email-delivery proof to `support@getryvro.com`, Play service-account invitation, and local ignored key-file presence were recorded as passed.

The remaining checked blocker families are:

- Formal trademark/legal clearance for `Ryvro`
- Google Play internal testing, Android QA, and Play submission
- Social handle reservation
- Privacy and terms owner content review plus store-console use of the live `getryvro.com` URLs
- Firebase Auth email templates
- Fresh production builds after the now-pushed EAS production environment
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

### 2. Finish Google Play Internal Testing And Merchant Setup

Google Play app creation and service-account setup are complete. Google Play now blocks subscription product creation until a Google Payments merchant account is set up, and blocks production access until Play's closed-test requirement is satisfied.

- Play app dashboard now shows `Ryvro Shift Planner` as draft app ID `4974146267407561805`.
- Internal testing is available but inactive. The track needs an email tester list and a release.
- Do not create the internal testing release from an old placeholder-auth build. Rebuild after the final production env passes.
- Play Console production access currently requires a closed testing release, at least 12 opted-in testers, and at least 14 days of closed testing before applying for production.
- The Play subscriptions page currently shows `Missing requirements for accessing this page` and says a Google Payments merchant account is required.
- A logged-in Chrome recheck after the owner reported Play Console configuration complete still showed the same merchant-account blocker. The payments-profile setup page loaded, but no completed merchant account or subscription product controls were visible.
- Set up the merchant account before creating Google Play subscription products.
- Confirm the local ignored `./google-play-key.json` is present before Android EAS submit.
- Physical Android QA still requires Android mobile device access verification on a physical Android 10 or newer device; the emulator is not accepted as final Play QA evidence.
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
- Fill real production `.env` values. Current local ignored `.env` already passes Ryvro Firebase, Google OAuth, backend URL, legal/support URL, RevenueCat Android key, and entitlement checks.
- Production `.env` now passes `npm run release:env:check` with real RevenueCat iOS and Android SDK key mirrors.
- Checked production values were pushed to EAS with `npm run release:env:push -- --force`.
- Firebase native service files were pushed to EAS as file variables with `npm run release:env:files -- --force`.
- Rebuild production binaries after any remaining Firebase email-template decision and store-product setup work that affects launch behavior.

Evidence source: `docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md`.

### 4. Finish RevenueCat And Store Products

Do this before purchase QA and store review.

- Ryvro iOS and Android apps are confirmed in RevenueCat.
- App Store Connect In-App Purchase key is generated and configured in RevenueCat. Keep only non-secret Key ID and Issuer ID in tracked evidence.
- RevenueCat's separate App Store Connect API key upload is still pending. The 2026-06-14 `Ryvro RevenueCat API` key with Key ID `VMFGH4BNTL` and second `Ryvro RevenueCat API 2` key with Key ID `G842654HWJ` were revoked after their one-time `.p8` downloads could not be verified locally.
- Configure entitlement ID `pro` with display name `Ryvro Pro`.
- App Store Connect product shells now exist: subscription group `Ryvro Pro` ID `22156776`, monthly product `ryvro_pro_monthly` Apple ID `6780186030`, and annual product `ryvro_pro_annual` Apple ID `6780186069`; both products still show `Missing Metadata`.
- English (Australia) localizations and review notes are saved for both App Store products.
- App Store all-country availability and base pricing are saved for both products: monthly from Ghana (USD) `$6.99`, and annual 1 Year Upfront from Ghana (USD) `$49.99`.
- Finish App Store trial decision, review screenshot or paywall image metadata, RevenueCat App Store mapping, and sandbox purchase QA.
- Google Play RTDN is configured with Pub/Sub topic `projects/ryvro-shift-planner/topics/play-billing-notifications`, publisher service account `google-play-developer-notifications@system.gserviceaccount.com`, and a received Play test notification for package `com.ryvro.shiftplanner`.
- Create Google Play products `ryvro_pro_monthly` and `ryvro_pro_annual` after the Google Payments merchant-account blocker clears.
- Attach both products to entitlement `pro`.
- Offering ID `default` exists with monthly and annual packages from the current RevenueCat product records.
- Run sandbox purchase, cancel, relock, and restore tests.

Evidence source: `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md`.

### 5. Rebuild, Test, Screenshot, Then Submit

Do this only after real RevenueCat, legal URLs, backend URLs, and EAS production environment values exist.

- Run `npm run release:versions:get` and confirm the current EAS remote values.
- App Store Connect already has version `1.0.0`, build `2`, from EAS build `71fde2ff-aa36-4741-aa69-e4f11ba30acd`, and TestFlight visual inspection showed build `2` as `Ready to Submit`.
- Do not reuse iOS build number `2` for the next production-auth-ready binary. Production EAS builds now use `autoIncrement: true`; the first stopped Codex upload consumed remote build number `3` without creating a build record, and the current production-auth-ready EAS build `601af1ee-5192-442f-9caa-deef5b9b6120` uses iOS build number `4`.
- Check Android `versionCode`; if it is still `1` or otherwise already used for a Play upload, run `eas build:version:set --platform android --profile production` before rebuilding.
- iOS production build `601af1ee-5192-442f-9caa-deef5b9b6120` finished, and IPA inspection confirmed `Ryvro`, `com.ryvro.shiftplanner`, version `1.0.0`, build `4`, production Google iOS URL scheme, and no retired Ellie/ShiftSync text-readable bundle strings.
- Rebuild Android production AAB.
- EAS Submit uploaded iOS build `4` to App Store Connect through submission `cd86140b-6b5f-4707-9fa1-fde6beda10fa`; TestFlight processing is complete and build `4` is attached to internal group `Ryvro iPhone QA`; install it on a real iPhone and capture QA.
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
