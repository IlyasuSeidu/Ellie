# Ryvro Launch Evidence Log

Last updated: 2026-05-31

Use this log to record non-secret proof for the account-owner and physical-device launch work that cannot be completed from the repo alone. Do not paste passwords, private keys, signing certificates, service-account JSON, RevenueCat SDK keys, Firebase config file contents, or reviewer passwords here.

Status values:

- Pending owner evidence
- Passed
- Failed - needs fix
- Not applicable

## Clearance And Reservations

| Item                                                                         | Required evidence                                                                     | Status                 | Evidence location or notes |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| Formal trademark/legal clearance for `Ryvro`                                 | Counsel summary or trademark-search report reference for launch markets               | Pending owner evidence |                            |
| App Store Connect app name `Ryvro Shift Planner`                             | App Store Connect app ID / Apple ID and creation screenshot or dashboard note         | Pending owner evidence |                            |
| Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner` | Play Console app/package dashboard note                                               | Pending owner evidence |                            |
| Domain control for `getryvro.com`                                            | Registrar receipt, DNS control proof, and live HTTPS check                            | Pending owner evidence |                            |
| Social handles                                                               | Reserved handle list for X, Instagram, TikTok, YouTube, LinkedIn, or fallback handles | Pending owner evidence |                            |

## Account And Console Setup

| Item                    | Required evidence                                                                         | Status                 | Evidence location or notes |
| ----------------------- | ----------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| Apple Developer account | Team ID and membership status                                                             | Pending owner evidence |                            |
| Apple App ID            | Bundle ID `com.ryvro.shiftplanner` with Sign in with Apple and Push Notifications enabled | Pending owner evidence |                            |
| Google Play app         | Play Console app link or package dashboard note                                           | Pending owner evidence |                            |
| EAS project             | EAS project UUID, not the secret token or credentials                                     | Pending owner evidence |                            |
| iOS signing             | Distribution certificate/provisioning status, no certificate material                     | Pending owner evidence |                            |
| Android release signing | EAS-managed or upload-key status, no key material                                         | Pending owner evidence |                            |

## Firebase, OAuth, Backend, And Email

| Item                          | Required evidence                                                                        | Status                 | Evidence location or notes |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| Firebase project              | Ryvro project ID and visible project display name                                        | Pending owner evidence |                            |
| Firebase iOS app              | Fresh `GoogleService-Info.plist` downloaded for `com.ryvro.shiftplanner`; file path only | Pending owner evidence |                            |
| Firebase Android app          | Fresh `google-services.json` downloaded for `com.ryvro.shiftplanner`; file path only     | Pending owner evidence |                            |
| OAuth clients                 | Web, iOS, and Android client IDs created in the Ryvro Firebase/Google Cloud project      | Pending owner evidence |                            |
| Firebase Auth domains         | `getryvro.com` added as an authorized domain                                             | Pending owner evidence |                            |
| Firebase Auth email templates | Sender `Ryvro Support`, reply-to `support@getryvro.com`, action domain `getryvro.com`    | Pending owner evidence |                            |
| Backend deploy                | `ryvroBrain` and `parseShiftScheduleDescription` function deploy output                  | Pending owner evidence |                            |
| Backend smoke                 | `curl` result for configured `RYVRO_BRAIN_URL`; `200` or expected validation `400`       | Pending owner evidence |                            |
| Production env preflight      | `npm run release:env:check` output with real `.env` values                               | Pending owner evidence |                            |
| EAS secret push               | `eas secret:push --scope project --env-file .env` confirmation                           | Pending owner evidence |                            |

## RevenueCat And Store Products

| Item                 | Required evidence                                                      | Status                 | Evidence location or notes |
| -------------------- | ---------------------------------------------------------------------- | ---------------------- | -------------------------- |
| RevenueCat apps      | Ryvro iOS and Ryvro Android app IDs or dashboard notes                 | Pending owner evidence |                            |
| Entitlement          | Entitlement ID `pro`, display name `Ryvro Pro`                         | Pending owner evidence |                            |
| App Store products   | `ryvro_pro_monthly` and `ryvro_pro_annual` product status              | Pending owner evidence |                            |
| Google Play products | `ryvro_pro_monthly` and `ryvro_pro_annual` base-plan status            | Pending owner evidence |                            |
| Default offering     | Offering ID `default` with monthly and annual packages                 | Pending owner evidence |                            |
| Sandbox purchase QA  | Trial start, entitlement activation, cancel, relock, and restore notes | Pending owner evidence |                            |

## Legal, Support, And Store Forms

| Item                                 | Required evidence                                                                    | Status                 | Evidence location or notes |
| ------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------- | -------------------------- |
| Privacy page                         | Live `https://getryvro.com/privacy` URL and content review note                      | Pending owner evidence |                            |
| Terms page                           | Live `https://getryvro.com/terms` URL and content review note                        | Pending owner evidence |                            |
| Support page/mailbox                 | Live `https://getryvro.com/support` and working `support@getryvro.com` mailbox check | Pending owner evidence |                            |
| Account deletion page                | Live `https://getryvro.com/delete-account` URL and request-flow check                | Pending owner evidence |                            |
| App Store privacy form               | Completion note matching `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`                 | Pending owner evidence |                            |
| Google Play Data safety form         | Completion note matching `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`                 | Pending owner evidence |                            |
| Content rating and export compliance | App Store / Play Console completion notes                                            | Pending owner evidence |                            |
| Reviewer account                     | `reviewer@getryvro.com` exists; password stored only in the store consoles           | Pending owner evidence |                            |

## Production Builds And Device QA

| Item                   | Required evidence                                                                    | Status                 | Evidence location or notes |
| ---------------------- | ------------------------------------------------------------------------------------ | ---------------------- | -------------------------- |
| iOS production build   | EAS build URL, build number, and installed bundle ID proof                           | Pending owner evidence |                            |
| Android production AAB | EAS build URL, versionCode, and package ID proof                                     | Pending owner evidence |                            |
| TestFlight iPhone QA   | Device model, OS version, build number, tester account, smoke matrix result          | Pending owner evidence |                            |
| Physical Android QA    | Device model, OS version, versionCode, tester account, smoke matrix result           | Pending owner evidence |                            |
| Store screenshots      | File list for iPhone 6.7 inch, iPad 12.9 inch, Android phone, and paywall screenshot | Pending owner evidence |                            |
| Store submission       | App Store submission ID/status and Google Play release ID/track status               | Pending owner evidence |                            |

## Go/No-Go Summary

Before launch, every required row above should be `Passed` or explicitly `Not applicable`, and the full go/no-go gate in `RYVRO_RELEASE_TASKS.md` must also be satisfied. The current repository branch is still not proof that Ryvro is live in the App Store or Google Play.
