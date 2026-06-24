# Ryvro Device QA Evidence Template

Last updated: 2026-06-24

Use this template when testing the production-equivalent Ryvro build on TestFlight iPhone, Play internal testing, or a store-signed Android physical device. Store only non-secret evidence. Do not record passwords, private keys, service-account JSON, signing material, full Firebase config contents, RevenueCat SDK keys, or private payment details.

The QA target is the current Ryvro concept:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.

## QA Packet Header

```text
Platform:
Test type:
Tester name:
Tester account:
Device model:
OS version:
Android SDK level:
Physical device confirmation:
App version:
iOS build number or Android versionCode:
Install source:
Installed bundle/package proof:
Test date and time:
Network conditions tested:
Overall result:
Evidence folder or notes:
```

Installed identity proof should show:

- iOS: `CFBundleIdentifier` or TestFlight proof for `com.ryvro.shiftplanner`, display name `Ryvro`, version, and build number.
- Android: package proof for `com.ryvro.shiftplanner`, display name `Ryvro`, version, and versionCode.

## Must-Pass Smoke Matrix

| Area               | Scenario                                                         | Expected result                                                      | Result | Evidence note |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ------ | ------------- |
| Install            | Fresh install from TestFlight or Play/internal store channel     | App installs as `Ryvro` with bundle/package `com.ryvro.shiftplanner` |        |               |
| Launch             | First open on a clean account                                    | App opens without crash and shows Ryvro auth or onboarding           |        |               |
| Email auth         | Sign in or create reviewer account using `reviewer@getryvro.com` | Auth completes in the Ryvro Firebase project                         |        |               |
| Google Sign-In     | Sign in with Google where platform-available                     | Account links to the Ryvro Firebase project                          |        |               |
| Apple Sign-In      | Sign in with Apple on iPhone                                     | Account links to the Ryvro Firebase project                          |        |               |
| Setup              | Complete the simplified setup flow                               | Pattern, known date, exact phase, times, and reminders save          |        |               |
| Setup review       | Use a repair path from setup review                              | User returns to the correct setup point and can continue             |        |               |
| Ask trial          | Ask the first voice question                                     | Ryvro listens first, answers clearly, and shows one answer card      |        |               |
| Paywall            | Ask again after the trial while not Pro                          | Ryvro Pro paywall appears                                            |        |               |
| Sandbox purchase   | Start sandbox trial or test purchase                             | RevenueCat entitlement `pro` becomes active                          |        |               |
| Entitlement gate   | Tap the mic after purchase                                       | Paywall does not appear and voice works                              |        |               |
| Restore purchases  | Restore purchase from Settings or paywall                        | Restore succeeds for the same store account                          |        |               |
| Cancel/relock      | Cancel sandbox subscription or expire entitlement where possible | Premium gates relock after entitlement is inactive                   |        |               |
| Settings           | Open Settings from the Ask screen                                | Settings opens and back navigation returns to Ask                    |        |               |
| User details       | Edit and save user details                                       | Save completes and the new name is used in answers                   |        |               |
| Reminders          | Enable and edit reminder settings                                | Permission flow works and notifications schedule                     |        |               |
| Offline exact date | Ask an exact-date question offline                               | Offline answer is accurate                                           |        |               |
| Offline range      | Ask a supported range question offline                           | Offline answer is structured and accurate                            |        |               |
| Online backend     | Ask a broader date or range question online                      | Backend answer is accurate and user-friendly                         |        |               |
| Legal links        | Open privacy, terms, support, and account deletion               | Links open live HTTPS pages on `getryvro.com`                        |        |               |
| Screenshots        | Capture required store frames                                    | File names and sizes match the screenshot checklist                  |        |               |

## Required Voice Questions

Test these on at least one production-equivalent build:

- What shift am I on today?
- What shift am I on tomorrow?
- Am I working next Saturday?
- What shift do I have next week Saturday?
- When is my next day off?
- What do I work for the next 7 days?
- What do I work for the next 14 days?
- What am I working from June 12 to June 27?
- What did I work last week?
- What shift is the first Saturday in August?
- What do I work at the end of the month?

## Store Screenshot Evidence

Record each final screenshot file after capture. Keep screenshot files out of Git unless the owner explicitly chooses to version final store artwork.

| File name                          | Platform/device   | Size and bucket              | Source build | Result | Notes |
| ---------------------------------- | ----------------- | ---------------------------- | ------------ | ------ | ----- |
| `app-store-iphone-01-welcome.png`  | App Store iPhone  | 1290 x 2796, 6.9 inch bucket |              |        |       |
| `app-store-iphone-02-setup.png`    | App Store iPhone  | 1290 x 2796, 6.9 inch bucket |              |        |       |
| `app-store-iphone-03-ask.png`      | App Store iPhone  | 1290 x 2796, 6.9 inch bucket |              |        |       |
| `app-store-iphone-04-paywall.png`  | App Store iPhone  | 1290 x 2796, 6.9 inch bucket |              |        |       |
| `app-store-ipad-01-welcome.png`    | App Store iPad    | 2048 x 2732, 13 inch bucket  |              |        |       |
| `app-store-ipad-02-ask.png`        | App Store iPad    | 2048 x 2732, 13 inch bucket  |              |        |       |
| `app-store-ipad-03-paywall.png`    | App Store iPad    | 2048 x 2732, 13 inch bucket  |              |        |       |
| `google-play-phone-01-welcome.png` | Google Play phone | 1080 x 1920 or higher, 9:16  |              |        |       |
| `google-play-phone-02-setup.png`   | Google Play phone | 1080 x 1920 or higher, 9:16  |              |        |       |
| `google-play-phone-03-ask.png`     | Google Play phone | 1080 x 1920 or higher, 9:16  |              |        |       |
| `google-play-phone-04-paywall.png` | Google Play phone | 1080 x 1920 or higher, 9:16  |              |        |       |

## Failure Record

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
- Mark `Sandbox purchase QA` as `Passed` only after purchase, entitlement activation, relock where possible, and restore are verified.
- Mark `Store screenshots` as `Passed` only after the required file list is captured at the required sizes.
