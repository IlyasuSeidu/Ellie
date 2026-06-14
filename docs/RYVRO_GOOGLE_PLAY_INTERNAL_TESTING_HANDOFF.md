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
- Next owner action: finish the internal testing tester list, remove the Google payments hold, set up the Google Payments merchant account for subscriptions, rebuild after the final production environment passes, submit the latest Android build to internal testing, then complete physical Android QA.
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

- Internal testing is available but inactive, with no releases.
- The tester setup page says up to 100 testers can join internal tests and requires an email list before saving tester access.
- The join link will appear after the app is published to the test.
- Production access requires a closed testing release, at least 12 opted-in testers, and at least 14 days of closed testing before applying for production.
- The Play subscriptions page says `Missing requirements for accessing this page` and requires setting up a Google Payments merchant account before subscription products can be created.
- A later owner-session recheck opened the payments profile area from that blocker, but the page did not show a completed merchant account or any controls for creating `ryvro_pro_monthly` or `ryvro_pro_annual`.
- A 2026-06-14 payments-profile retry exposed the current root blocker: existing profile selection fails with `OR-ICRA-02` and Google Payments Center requires card verification for Visa ending `7053` before the hold can be removed. Keep Google Play products pending until the owner completes that private verification outside the repo and the Play subscriptions page allows product creation.

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
