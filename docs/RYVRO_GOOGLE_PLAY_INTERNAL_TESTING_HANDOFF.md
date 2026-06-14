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
- Owner confirmation on 2026-06-14: the remaining Play Console account configuration and app setup are done.
- The Google Play app is configured for `Ryvro Shift Planner` with package `com.ryvro.shiftplanner`.
- The Android mobile device verification details page was rechecked before completion on 2026-06-14. It said only the account owner can complete it from the Google Play Console app on a real Android mobile device signed in as `seiduilyasu94@gmail.com`.
- The earlier contact phone verification blocker is now recorded as owner-resolved by the 2026-06-14 Play Console configuration confirmation.
- Android emulator attempt on 2026-06-07 used the Play Console Android app on `Pixel_9_Pro` / Android API 36, selected `Ryvro`, and tapped `Verify`. Google rejected the emulator with `You can't verify using this device. To verify, use a device running Android 10 (SDK 29) or newer.` Treat this as requiring a physical Android 10 or newer device signed into the owner Google account.
- Do not record the payments profile address, payment details, or full profile contents.
- Next owner action: create or confirm the least-privilege Google Play service account for EAS Submit and RevenueCat, save the ignored JSON key locally as `./google-play-key.json`, then submit the latest Android build to internal testing.

## App Creation

Create the app before uploading the AAB.

- App name: `Ryvro Shift Planner`
- Package name: `com.ryvro.shiftplanner`
- App or game: App
- Free or paid: Free
- Declarations: complete accurately in Play Console; do not accept declarations on behalf of the owner.
- Record the Play Console app dashboard link or package dashboard note in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md`.

## Service Account And API Access

Create a Google Play service account for EAS Submit and RevenueCat. Keep the JSON file local and ignored by Git.

- In Play Console, open API access and link or confirm the Google Cloud project.
- Create a least-privilege Google Play service account named `Ryvro EAS Submit` or equivalent.
- Grant only the permissions needed to upload and manage releases for `com.ryvro.shiftplanner`.
- Save the downloaded JSON key locally as `google-play-key.json` at the repo root.
- Confirm `.gitignore` keeps `google-play-key.json` out of Git.
- Do not paste the JSON contents anywhere.
- Record only the service account email, permission summary, and local file path `./google-play-key.json` in the evidence log.

Local verification before Android submit:

```bash
test -f ./google-play-key.json
npm run release:submit:check
```

The submit check should still fail until all other owner evidence rows are complete, but the Android service-account file-path error should be gone once the real local JSON exists.

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
