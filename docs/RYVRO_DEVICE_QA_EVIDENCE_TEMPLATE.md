# Ryvro Device QA Evidence Template

Last updated: 2026-06-05

Use this template when testing the production-equivalent Ryvro build on TestFlight iPhone and Android physical device or Play internal testing. Store only non-secret evidence here or in a copied QA packet. Do not record passwords, private keys, service-account JSON, signing material, full Firebase config contents, RevenueCat SDK keys, or private payment details.

This template supports the launch evidence rows:

- TestFlight iPhone QA
- Physical Android QA
- Store screenshots
- Sandbox purchase QA
- iOS production build installed bundle proof
- Android production or store-signed build installed package proof

## QA Packet Header

Copy this section once per platform and fill it during the test.

```text
Platform:
Test type: TestFlight iPhone / Play internal testing / store-signed Android QA
Tester name:
Tester account:
Device model:
OS version:
App version:
iOS build number or Android versionCode:
Install source:
Installed bundle/package proof:
Test date and time:
Network conditions tested:
Overall result: Pass / Fail / Blocked
Evidence folder or notes:
```

Installed identity proof should show:

- iOS: `CFBundleIdentifier` or device-management/TestFlight proof for `com.ryvro.shiftplanner`, display name `Ryvro`, version `1.0.0`, and build number.
- Android: package proof for `com.ryvro.shiftplanner`, display name `Ryvro`, version `1.0.0`, and versionCode.

## Must-Pass Smoke Matrix

| Area                | Scenario                                                                                                               | Expected result                                                                 | Result | Evidence note |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ | ------------- |
| Install             | Fresh install from TestFlight or Play/internal store channel                                                           | App installs as `Ryvro` with bundle/package `com.ryvro.shiftplanner`            |        |               |
| Launch              | First open on a clean account                                                                                          | App opens without crash and shows Ryvro onboarding/auth flow                    |        |               |
| Email auth          | Sign in or create reviewer account using `reviewer@getryvro.com`                                                       | Auth completes in the Ryvro Firebase project                                    |        |               |
| Google Sign-In      | Sign in with Google where platform-available                                                                           | Account links to the Ryvro Firebase project                                     |        |               |
| Apple Sign-In       | Sign in with Apple on iPhone                                                                                           | Account links to the Ryvro Firebase project and hidden email handling works     |        |               |
| Template onboarding | Complete onboarding from a non-mining template such as healthcare, security, transport, hospitality, aviation, or rail | Schedule saves and dashboard opens                                              |        |               |
| AI onboarding       | Describe a FIFO/block-roster or rotating-shift schedule                                                                | Parser returns a valid draft and saved schedule matches the prompt              |        |               |
| Manual onboarding   | Build a custom sequence manually                                                                                       | Custom shift names, colors, icons, times, locations, and reminders save         |        |               |
| Dashboard           | Check current shift, next shift, and month calendar                                                                    | Colors, icons, overnight shifts, and locked future weeks render correctly       |        |               |
| Settings            | Edit schedule settings after onboarding                                                                                | Changes persist after app relaunch                                              |        |               |
| Exceptions          | Add a one-off exception or holiday override                                                                            | Dashboard and calendar reflect the override without corrupting the base pattern |        |               |
| Reminders           | Enable and edit reminder settings                                                                                      | Permission flow works and reminder profile is saved                             |        |               |
| Calendar export     | Export schedule to calendar file or share sheet                                                                        | Export includes correct shift names, dates, and times                           |        |               |
| Calendar import     | Import or parse a supported roster/calendar path if available                                                          | Imported schedule is reviewable before saving                                   |        |               |
| Paywall             | Open Ryvro Pro paywall                                                                                                 | Monthly and annual products load with current store metadata                    |        |               |
| Sandbox trial       | Start sandbox trial or test purchase                                                                                   | RevenueCat entitlement `pro` becomes active                                     |        |               |
| Entitlement gate    | Check locked calendar and center voice button before and after entitlement                                             | Locked features unlock only when `pro` is active                                |        |               |
| Restore purchases   | Restore purchase from Profile or paywall                                                                               | Restore succeeds for the same store account                                     |        |               |
| Cancel/relock       | Cancel sandbox subscription or expire entitlement where possible                                                       | Premium gates relock after entitlement is no longer active                      |        |               |
| Voice permission    | Start voice assistant                                                                                                  | Microphone/speech permission flow is clear and platform-appropriate             |        |               |
| Voice response      | Ask a basic schedule question                                                                                          | Assistant returns a relevant answer using the saved schedule                    |        |               |
| Offline visibility  | Relaunch app offline after saving a schedule                                                                           | Saved schedule remains visible                                                  |        |               |
| Pending sync        | Make an offline change where supported                                                                                 | Pending-sync status appears and clears after reconnect                          |        |               |
| Legal links         | Open privacy, terms, support, and account deletion from Profile/paywall                                                | Links open live HTTPS pages on the controlled Ryvro domain                      |        |               |
| Screenshots         | Capture required store frames                                                                                          | File names and sizes match `docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md`         |        |               |

## Store Screenshot Evidence

Record each final screenshot file after capture. Keep screenshot files out of Git unless the owner explicitly chooses to version final store artwork.

| File name                                     | Platform/device   | Size                  | Source build | Result | Notes |
| --------------------------------------------- | ----------------- | --------------------- | ------------ | ------ | ----- |
| `app-store-iphone-01-template-start.png`      | App Store iPhone  | 1290 x 2796           |              |        |       |
| `app-store-iphone-02-dashboard-calendar.png`  | App Store iPhone  | 1290 x 2796           |              |        |       |
| `app-store-iphone-03-paywall.png`             | App Store iPhone  | 1290 x 2796           |              |        |       |
| `app-store-ipad-01-template-start.png`        | App Store iPad    | 2048 x 2732           |              |        |       |
| `app-store-ipad-02-dashboard-calendar.png`    | App Store iPad    | 2048 x 2732           |              |        |       |
| `app-store-ipad-03-paywall.png`               | App Store iPad    | 2048 x 2732           |              |        |       |
| `google-play-phone-01-template-start.png`     | Google Play phone | 1080 x 1920 or higher |              |        |       |
| `google-play-phone-02-dashboard-calendar.png` | Google Play phone | 1080 x 1920 or higher |              |        |       |
| `google-play-phone-03-paywall.png`            | Google Play phone | 1080 x 1920 or higher |              |        |       |

## Failure Record

Use this block for each failed or blocked case.

```text
Scenario:
Platform:
Build:
Steps to reproduce:
Expected:
Actual:
Severity:
Screenshot or recording reference:
Log reference:
Owner/account dependency:
Fix owner:
Retest result:
```

## Evidence Log Update

After QA, update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md`:

- Mark `TestFlight iPhone QA` as `Passed` only after the iPhone smoke matrix passes.
- Mark `Physical Android QA` as `Passed` only after the Android physical/internal-track smoke matrix passes.
- Mark `Sandbox purchase QA` as `Passed` only after trial, entitlement activation, cancel/relock where possible, and restore are verified.
- Mark `Store screenshots` as `Passed` only after the required file list is captured at the required sizes.
- Keep failed or blocked rows as `Pending owner evidence` or `Failed - needs fix` until the issue is resolved and retested.
