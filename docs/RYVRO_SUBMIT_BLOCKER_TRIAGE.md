# Ryvro Submit Blocker Triage

Last updated: 2026-06-15

Use this file when `npm run release:submit:check` fails. It groups the remaining blockers into the order that should unblock TestFlight, Play internal testing, and final store submission.

Do not store passwords, payment details, service account JSON, private keys, signing material, RevenueCat SDK keys, Firebase config file contents, legal privileged communications, reviewer passwords, or tester passwords in Git, docs, screenshots, or chat.

## Current Submit Gate

Run:

```bash
npm run release:submit:check
```

Expected current result: the command fails until the remaining owner evidence rows in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` are no longer `Pending owner evidence` and production EAS submit values are real.

The same command scans the owner evidence packet for high-risk secret material, including service-account private-key JSON fields, private-key blocks, Firebase API keys, RevenueCat SDK keys, and EAS access tokens. If it fails for a secret scan item, remove the secret from the tracked file, rotate the exposed key in the owning console, and replace the evidence with a non-secret screenshot reference or dashboard note.

Latest checked on 2026-06-15: `npm run release:check`, `npm run release:owner:check`, `npm run release:store:check`, and the focused Ryvro config guard passed after clarifying historical iOS build evidence and the current build `4` TestFlight candidate. GitHub Actions CI run `27545464804` on commit `0e0507a` passed Lint and Type Check, Unit Tests, Build Check, and Release Check; bounded E2E workflow run `27545606240` passed the E2E Configuration Check on commit `0e0507a`. The remaining submit blockers are still owner/account evidence rows, not repo CI failures. Google Play app creation, package reservation, Google Play Android Developer API enablement, Play Console service-account invite, and local ignored `./google-play-key.json` creation are recorded as passed. A logged-in Chrome recheck after the owner reported Play Console configuration complete still showed the Play subscriptions page blocked by `Missing requirements for accessing this page` and a required Google Payments merchant account. The Play payments profile flow opened, but did not expose a completed merchant account or subscription-product controls. A 2026-06-14 retry selected the existing payments profiles; the `Individual profile for Play` path stayed on `Setting up billing` then returned to the create-profile state, while the profile listing Play, AdSense, Cloud, and Google Pay failed with `OR-ICRA-02` and Google Payments Center showed a card-verification step for Visa ending `7053`. A direct Android Publisher API check using the ignored local service account key authenticated and reached `applications/com.ryvro.shiftplanner/subscriptions` with HTTP `204`, but `pricing:convertRegionPrices` for both intended subscription prices returned HTTP `400` / `FAILED_PRECONDITION`, so the monetization prerequisite blocker exists at API level too. App Store Connect API access is available, the App Store Connect in-app purchase key was generated, RevenueCat apps `appd8a95a73e0` and `appab0f4b628d` are saved for `com.ryvro.shiftplanner`, RevenueCat entitlement `pro` exists, offering `default` contains annual and monthly packages, App Store Connect App Privacy is published for app ID `6776994726`, and Play App content now shows no remaining `Need attention` declarations after saving privacy policy, ads, advertising ID, government apps, financial features, health apps, sign-in details, target audience, content ratings, and Data safety. The ignored local `.env` has real iOS and Android RevenueCat SDK key mirrors, `npm run release:env:check` passed, `npm run release:env:push -- --force` passed, and `npm run release:env:files -- --force` created the Firebase file variables. Android production AAB `/Users/Shared/Ellie/build-1781452667575.aab` was built locally with EAS CLI 20 after moving production runtime version policy to `appVersion`, and EAS Submit completed Google Play internal-track submission `cb58e3e5-a4c9-4935-af29-88065f7c3f28`. Android Publisher API readback on 2026-06-14 at 18:00 UTC confirmed the Play `internal` track has release name `1.0.0`, status `completed`, and versionCode `8`, while production, beta, and alpha tracks had no releases. `npm run release:submit:check` still fails because other owner evidence rows remain pending, including App Store subscription products, Google Play subscription products, sandbox purchase QA, and device QA. `npm run release:clearance` still requires manual legal/social evidence; public checks show `getryvro.com` is registered and resolves, but formal trademark clearance and logged-in social-handle reservation remain owner-side proof items.

Later App Store Connect Chrome work on 2026-06-14 filled the safe iOS version metadata and reviewer fields from the repo source copy, selected manual release, and entered the reviewer password only in the App Store Connect password field. Saving the iOS version page is still blocked because App Store Connect requires the App Review contact phone in international `+` format; the phone number is private owner/account data and must not be invented or recorded in Git. A separate subscription-product readback showed the monthly product still has no review screenshot uploaded, so the App Store products remain `Missing Metadata` until a real TestFlight or production-equivalent paywall screenshot is uploaded.

Previously cleared submit-gate items: `Domain control for getryvro.com`, `Support page/mailbox`, App Store privacy form, Google Play Data safety form, and Android service account key path `./google-play-key.json` no longer appear in submit-gate failures after owner purchase confirmation, DNS proof, Firebase custom-domain activation, certificate activation, live HTTPS checks, Google Play Console email-delivery proof to `support@getryvro.com`, Play service-account invitation, App Store Connect App Privacy publication, Play Data safety completion, and local ignored key-file presence were recorded as passed.

The remaining checked blocker families are:

- Formal trademark/legal clearance for `Ryvro`
- Social handle reservation
- Firebase Auth email templates
- App Store subscription product metadata and real review screenshot
- Google Play subscription products after the Google Payments hold clears
- Sandbox purchase QA across App Store, Google Play, and RevenueCat entitlement behavior
- Privacy and terms owner content review plus store-console use of the live `getryvro.com` URLs
- App Store content rating, export compliance, EU trader status, reviewer account, screenshots, TestFlight iPhone QA, and final App Store submission
- Google Play internal testing opt-in visibility, physical Android QA, store screenshots, and final production access after the closed-testing requirement

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
- EAS Submit completed Google Play internal-track submission `cb58e3e5-a4c9-4935-af29-88065f7c3f28` from local AAB `/Users/Shared/Ellie/build-1781452667575.aab`.
- Confirm the internal tester list and opt-in link in Play Console before physical Android QA. API readback already proves the internal track contains release `1.0.0` with status `completed` and versionCode `8`.
- Play Console production access currently requires a closed testing release, at least 12 opted-in testers, and at least 14 days of closed testing before applying for production.
- The Play subscriptions page currently shows `Missing requirements for accessing this page` and says a Google Payments merchant account is required.
- A logged-in Chrome recheck after the owner reported Play Console configuration complete still showed the same merchant-account blocker. The payments-profile setup page loaded, but no completed merchant account or subscription product controls were visible.
- A later retry selected both visible existing payments profiles. The profile labeled `Individual profile for Play` did not attach after the `Setting up billing` spinner, and the other existing profile failed with `OR-ICRA-02`: `Contact us to remove the hold on your account`.
- Google Payments Center shows a `Verify your payment information` alert and a card-verification flow for Visa ending `7053`. The owner must complete this private verification or contact Google to remove the hold before Google Play subscription products can be created.
- Play App content declarations are saved and the Need attention tab is clear; when the Android release is ready, send these saved declarations for review from Publishing overview with the release.
- Confirm the local ignored `./google-play-key.json` is present before Android EAS submit retries or resubmissions.
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
- Finish the App Store version-page contact phone save blocker by entering the owner's real international phone number directly in App Store Connect, without recording it in the repo.
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
- Historical 2026-06-14 Android retries: remote Android `versionCode` was set from `1` to `2`, then remote EAS upload attempts consumed `versionCode` values `3` and `4` but stalled before creating fresh build records.
- A local Android production retry with `npx eas-cli@20 build --platform android --profile production --local --non-interactive` bypassed the remote upload stage and auto-incremented Android versionCode from `4` to `5`, but failed in the isolated EAS local build before Gradle because `npm ci --include=dev` ended with `network read ETIMEDOUT`.
- A later local Android retry raised npm retry timeouts and got past dependency install, then exposed two fixable local build issues: `expo doctor` required Expo SDK 54 patch updates, and prebuild could not copy the ignored root `google-services.json` into the isolated build archive. After updating the Expo SDK 54 patch packages and retrying with absolute ignored Firebase service-file paths, dependency install, `expo doctor`, and prebuild passed. That attempt auto-incremented Android versionCode from `6` to `7`, then failed in `Configure expo-updates` because the fingerprint runtime version calculated before the local build did not match the runtime version calculated inside the local build; the fingerprint-info fetch also returned Expo API `401` even though `npx eas-cli@20 whoami` showed account `ilyasu`.
- Production runtime version policy was changed to `appVersion`, and the next local EAS Android production build consumed remote Android `versionCode` `8`, passed Gradle release bundle generation, and wrote `/Users/Shared/Ellie/build-1781452667575.aab`. EAS Submit then uploaded that AAB to the Google Play internal track through submission `cb58e3e5-a4c9-4935-af29-88065f7c3f28`.
- iOS production build `601af1ee-5192-442f-9caa-deef5b9b6120` finished, and IPA inspection confirmed `Ryvro`, `com.ryvro.shiftplanner`, version `1.0.0`, build `4`, production Google iOS URL scheme, and no retired Ellie/ShiftSync text-readable bundle strings.
- Rebuild Android production AAB only if a later launch-critical config, native dependency, or store-product change requires a new binary.
- EAS Submit uploaded iOS build `4` to App Store Connect through submission `cd86140b-6b5f-4707-9fa1-fde6beda10fa`; TestFlight processing is complete and build `4` is attached to internal group `Ryvro iPhone QA`; install it on a real iPhone and capture QA.
- Install and test on a real iPhone.
- Confirm the Google Play internal testing tester list and opt-in link, then share the opt-in link with testers.
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
