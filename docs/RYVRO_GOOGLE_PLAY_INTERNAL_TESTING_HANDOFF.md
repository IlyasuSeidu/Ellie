# Ryvro Google Play Internal Testing Handoff

Last updated: 2026-06-14

Use this checklist after the Play Console developer account exists and before any Android production rollout. It covers the Android owner/account path that cannot be completed from the repo alone.

Do not store the Google Play service account JSON, upload key material, passwords, payment details, or private tester passwords in Git, docs, screenshots, or chat.

## Required Console Values

- App name: `Ryvro Shift Planner`
- Package name: `com.ryvro.shiftplanner`
- Default language: English
- App type: App
- Pricing: Free with optional subscription
- First release track: Internal testing
- EAS submit command: `eas submit --platform android --latest`
- EAS submit service account key path: `./google-play-key.json`

## Developer Account Enrollment

Complete this in Play Console while signed in as the owner.

- Choose the correct account type: `Yourself` or `An organization`.
- Complete identity, payment, contact, and verification steps.
- Confirm the owner understands that Google warns the developer-account owner cannot be changed after account creation.
- Record only non-secret evidence: chosen account type, enrollment status, payment completion note without payment details, and verification status.

Current non-secret progress from logged-in Chrome on 2026-06-07:

- Account path selected: `Yourself`.
- Google account shown as the owner account: `seiduilyasu94@gmail.com`.
- Public developer name entered: `Ryvro`.
- The owner created and linked the intended payments profile.
- Google says the payments profile is used to collect and verify legal name and address.
- The public developer profile step used public email `support@getryvro.com`; Google sent a six-digit code to that mailbox and the code was verified.
- The `About you` step now has the Ryvro Android/Play Console experience text filled and website `https://getryvro.com` entered.
- The developer registration fee was completed and Play Console now shows `Developer account created`.
- The Play Console dashboard is reachable for developer account `Ryvro`.
- Latest Chrome progress on 2026-06-14 shows Play Console still reaches developer account `Ryvro`, account ID `8980566822183056641`, under owner account `seiduilyasu94@gmail.com`.
- Earlier Chrome progress on 2026-06-09 showed Play Console says `Your identity has been verified successfully` for developer account `Ryvro`.
- The Google Play app was created in Play Console on 2026-06-14 with app name `Ryvro Shift Planner`, package `com.ryvro.shiftplanner`, app type App, pricing Free, app ID `4974146267407561805`, and status Draft.
- The Play Console app list shows `Ryvro Shift Planner` / `com.ryvro.shiftplanner` and the account page says all apps are registered for Android developer verification requirements.
- The Android mobile device verification details page was rechecked before completion on 2026-06-14. It said only the account owner can complete it from the Google Play Console app on a real Android mobile device signed in as `seiduilyasu94@gmail.com`.
- The earlier contact phone verification blocker is now recorded as owner-resolved by the 2026-06-14 Play Console configuration confirmation.
- Android emulator attempt on 2026-06-07 used the Play Console Android app on `Pixel_9_Pro` / Android API 36, selected `Ryvro`, and tapped `Verify`. Google rejected the emulator with `You can't verify using this device. To verify, use a device running Android 10 (SDK 29) or newer.` Treat this as requiring a physical Android 10 or newer device signed into the owner Google account.
- Do not record the payments profile address, payment details, or full profile contents.
- Next owner action: finish the internal testing tester list, remove the Google payments hold, set up the Google Payments merchant account for subscriptions, install the internal-testing build on a physical Android device, then complete physical Android QA.
- Later Chrome recheck on 2026-06-14 after the owner reported Play Console configuration complete still showed Play subscriptions blocked by `Missing requirements for accessing this page`. The `Set up a merchant account` entry opened the Play payments profile area, but no completed merchant account or subscription-product controls were visible.
- Fresh logged-in Chrome work on 2026-06-14 opened Play Console → Payments profile, selected the existing payments profile labeled `Individual profile for Play`, and Play stayed on `Setting up billing` until refresh returned to the create-profile state. Selecting the existing profile that listed Play, AdSense, Cloud, and Google Pay produced the error `Uh oh, something went wrong` with `Contact us to remove the hold on your account. [OR-ICRA-02]`. Google Payments Center then showed an alert to verify payment information and a card-verification screen for Visa ending `7053`. Do not trigger or record the temporary card charge or verification code in Git, screenshots, or chat. This is now the concrete blocker before Play subscription products can be created.

## App Creation

The app is already created. Use these values for Android submission and Play Console setup.

- App name: `Ryvro Shift Planner`
- Package name: `com.ryvro.shiftplanner`
- App or game: App
- Free or paid: Free
- Play app dashboard ID: `4974146267407561805`
- App status after creation: Draft
- Declarations: accepted during app creation for Developer Program Policies, Play App Signing Terms of Service, and US export laws.
- Record the Play Console app dashboard link or package dashboard note in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md`.

## Service Account And API Access

The Google Play service account has been created and invited. Keep the JSON file local and ignored by Git.

- Google Cloud project: `ryvro-shift-planner`
- Google Play Android Developer API: enabled on 2026-06-14.
- Service account email: `ryvro-eas-submit@ryvro-shift-planner.iam.gserviceaccount.com`
- Play Console user status: Active, never expires.
- Local ignored key path: `./google-play-key.json`
- Local key permissions: file mode `600`
- `.gitignore` keeps `google-play-key.json` out of Git.
- App-level permissions granted for `Ryvro Shift Planner` / `com.ryvro.shiftplanner`: view app information, edit and delete draft apps, view financial data, manage orders and subscriptions, release apps to testing tracks, manage testing tracks and edit tester lists, manage store presence, and Play-managed dependent policy access.
- App admin and production release permissions were not granted.
- Do not paste the JSON contents anywhere.
- Record only the service account email, permission summary, and local file path `./google-play-key.json` in the evidence log.

## Play Billing Notifications

Google Play real-time developer notifications are configured for the Ryvro Firebase/Google Cloud project.

- Pub/Sub topic: `projects/ryvro-shift-planner/topics/play-billing-notifications`
- Publisher service account: `google-play-developer-notifications@system.gserviceaccount.com`
- IAM role on topic: `roles/pubsub.publisher`
- Play Console monetization setup saved this topic on 2026-06-14.
- Verification: a temporary pull subscription received a Play test notification for package `com.ryvro.shiftplanner` on 2026-06-14, then the temporary subscription was deleted. Do not record Pub/Sub ack IDs or raw message payloads in Git.

Local verification before Android submit:

```bash
test -f ./google-play-key.json
npm run release:submit:check
```

The submit check should still fail until all other owner evidence rows are complete, but the Android service-account file-path and Google Play service-account evidence errors should be gone while the real local JSON exists.

## App Content Declarations

Logged-in Play Console work on 2026-06-14 cleared every item on the App content `Need attention` tab for Play app ID `4974146267407561805`. Play Console then showed `You're all caught up. See completed declarations on the Actioned tab.`

Completed declarations:

- Privacy policy URL: `https://getryvro.com/privacy`.
- Ads: `No, my app does not contain ads`.
- Advertising ID: `No`, Ryvro does not use the advertising ID.
- Government apps: `No`.
- Financial features: `My app doesn't provide any financial features`; store subscriptions are handled by Play billing and are not a financial-service feature.
- Health apps: `My app does not have any health features`.
- Sign in details: restricted app access answered `Yes`; reviewer access record `Reviewer account` was added for `reviewer@getryvro.com` with the password entered only in Play Console, full-access instructions, and the checkbox confirming access to premium or paid content. Do not record the password.
- Target audience and content: target age `18 and over`.
- Content ratings: IARC questionnaire completed with contact email `support@getryvro.com`, category `All Other App Types`, generated AI/online content disclosed, digital goods disclosed for subscriptions, no random/chance purchases, no precise-location sharing, no web browser/search engine, no primary news or education product, no age-restricted products, no user-to-user content sharing, and no violence, sexuality, offensive language, or controlled-substance content. Saved ratings shown: Brazil `14+`, ESRB `Everyone`, PEGI `3`, USK `All ages`, and IARC/Google Play `3+`, with interactive element `In-App Purchases`.
- Data safety: saved with data collection/sharing, encrypted in transit, email/password and OAuth account creation, account deletion URL `https://getryvro.com/delete-account`, privacy policy `https://getryvro.com/privacy`, and selected launch data types for personal info, purchase history, voice recordings, calendar events, files/docs, app activity, app info/performance, and device IDs.

These declarations are saved in Play Console and must still be sent for review through Publishing overview when a release is submitted. Update the declarations before submission if the shipped app adds location, contacts, health data, ads/tracking SDKs, direct payment-card collection, public social sharing, public content feeds, regulated-duty claims, or other new data/features.

## Internal Testing Track

Submit Android to internal testing first.

```bash
eas submit --platform android --latest
```

Required internal-track setup:

- Track: Internal testing
- Tester list: owner/tester Gmail accounts only
- Release name: `Ryvro 1.0.0 internal`
- AAB package proof: `com.ryvro.shiftplanner`
- Version code: current production Android version code
- Release notes: concise testing note based on `docs/RYVRO_STORE_LISTING.md`
- Rollout target: internal testing only, not production

Current Play Console state on 2026-06-14:

- EAS local Android production build succeeded after switching tracked production runtime version policy to `appVersion` to avoid local fingerprint drift during store builds.
- Local Android artifact: `/Users/Shared/Ellie/build-1781452667575.aab`, size 150 MB, package proof `com.ryvro.shiftplanner`.
- The build consumed EAS remote Android `versionCode` `8` during auto-increment. The embedded Expo config still reports tracked `android.versionCode` `1` because remote versioning ignores the static config value for store builds.
- EAS Submit uploaded that AAB to the Google Play internal track on 2026-06-14 and completed successfully.
- EAS submission ID: `cb58e3e5-a4c9-4935-af29-88065f7c3f28`.
- EAS submission details: `https://expo.dev/accounts/ilyasu/projects/ryvro/submissions/cb58e3e5-a4c9-4935-af29-88065f7c3f28`.
- Release track: `internal`; release status requested through EAS Submit: `COMPLETED`; rollout target: internal testing only.
- Android Publisher API readback on 2026-06-14 at 18:00 UTC created a temporary edit, read tracks, then discarded the edit. It confirmed package `com.ryvro.shiftplanner` has internal track release name `1.0.0`, status `completed`, and versionCode `8`; production, beta, and alpha tracks had no releases.
- The tester setup page says up to 100 testers can join internal tests and requires an email list before saving tester access.
- The join link will appear after the app is published to the test.
- Production access requires a closed testing release, at least 12 opted-in testers, and at least 14 days of closed testing before applying for production.
- The Play subscriptions page says `Missing requirements for accessing this page` and requires setting up a Google Payments merchant account before subscription products can be created.
- A later owner-session recheck opened the payments profile area from that blocker, but the page did not show a completed merchant account or any controls for creating `ryvro_pro_monthly` or `ryvro_pro_annual`.
- A 2026-06-14 payments-profile retry exposed the current root blocker: existing profile selection fails with `OR-ICRA-02` and Google Payments Center requires card verification for Visa ending `7053` before the hold can be removed. Keep Google Play products pending until the owner completes that private verification outside the repo and the Play subscriptions page allows product creation.
- A fresh 2026-06-14 Android Publisher API check with the ignored local service account key authenticated successfully and reached the subscriptions endpoint for `com.ryvro.shiftplanner`, which returned HTTP `204` with no listed subscriptions. The same API session called `pricing:convertRegionPrices` for the intended USD `$6.99` monthly and `$49.99` annual prices, and both calls failed with HTTP `400` / `FAILED_PRECONDITION`. This confirms the blocker is not just a console UI issue; Play monetization prerequisites still prevent subscription product setup through the API too.
- Historical Android build retries on 2026-06-14: remote Android `versionCode` started at `1`, was set to `2`, and two remote EAS upload attempts consumed `versionCode` values `3` and `4` but stalled before creating fresh build records. These are superseded by the successful local AAB and internal-track submission recorded above.
- A local Android production build attempt with `npx eas-cli@20 build --platform android --profile production --local --non-interactive` on 2026-06-14 bypassed the remote EAS upload stall and auto-incremented Android `versionCode` from `4` to `5`, but failed before Gradle during the EAS local `npm ci --include=dev` phase with `network read ETIMEDOUT`. This is historical context for the later successful local build.
- A follow-up local Android attempt with npm retry timeouts raised got through dependency install and auto-incremented Android `versionCode` from `5` to `6`, then failed before Gradle because `expo doctor` required SDK 54 patch updates and prebuild could not copy the ignored root `google-services.json` into the isolated local EAS build archive.
- After updating the Expo SDK 54 patch packages and retrying local Android with absolute ignored Firebase service-file paths, `npm ci`, `expo doctor`, and `expo prebuild` passed, and Android `versionCode` auto-incremented from `6` to `7`. The build then failed in the `Configure expo-updates` phase because the fingerprint runtime version calculated before the local build did not match the runtime version calculated inside the local EAS build, and the fingerprint-info fetch returned Expo API `401`. `npx eas-cli@20 whoami` still showed account `ilyasu` / `seiduilyasu94@gmail.com`. This is historical context for the `appVersion` runtime-policy change that unblocked the next build.
- After changing production runtime version policy to `appVersion`, the next local Android build passed dependency install, `expo doctor`, `expo prebuild`, Expo Updates configuration, JS bundling, and `gradlew :app:bundleRelease`; it wrote the local AAB to `/Users/Shared/Ellie/build-1781452667575.aab`. `npx eas-cli@20 submit --platform android --profile production --path /Users/Shared/Ellie/build-1781452667575.aab --non-interactive --wait` then submitted the AAB to Google Play internal testing successfully.

Record:

- EAS submit URL or submission ID
- Play internal release ID or dashboard note
- Track status
- Version code
- Tester list name, without private tester passwords
- Opt-in link if Play Console provides one

## Android Device QA

Install from the Play internal testing channel on a physical Android device. Do not use Expo Go or a debug build for final Android QA.

The Play Console account-verification emulator rejection is separate from release QA, but it sets the same owner-device expectation: use a real physical Android 10 / SDK 29 or newer phone or tablet signed into the owner or tester Google account. Do not use an Android emulator, even if the emulator reports SDK 29 or newer.

Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` and record:

- Device model
- Android version
- Android SDK level if the device reports it
- Installed package proof for `com.ryvro.shiftplanner`
- Version code
- Play internal release ID or opt-in link
- Tester account
- Install source
- Test date
- Smoke matrix result
- Sandbox purchase result
- Screenshot evidence from `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`
- Failed or retaken steps without passwords, private emails, or personal data

Only mark `Physical Android QA` as `Passed` after the Play/internal install passes the full smoke matrix.

## Production Promotion Gate

Do not promote the Android release beyond internal testing until all of these are true:

- `npm run release:submit:check` passes on the exact commit being submitted.
- GitHub CI is green for that commit.
- Google Play Data safety, content rating, target audience, app access, privacy policy, account deletion, and subscription declarations are complete.
- RevenueCat Android app, entitlement `pro`, products, and offering `default` are complete.
- Sandbox purchase and restore pass on Android.
- Physical Android QA passes from the internal testing install.
- Store screenshots are captured from production-equivalent builds.
- The Play release ID, track name, track status, Android versionCode, rollout percentage or internal-only note, submit date, and owner approval note are recorded.
- Any reviewer feedback, policy warning, or rejected release note is recorded without passwords, service-account JSON, private keys, payment details, or private tester passwords.
- The owner approves production rollout timing.

After promotion, update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the Play release ID, production track status, and rollout note.
