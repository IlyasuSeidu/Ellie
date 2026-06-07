# Ryvro App Store Connect And TestFlight Handoff

Last updated: 2026-06-07

Use this checklist for the remaining iOS owner-account path after the App Store Connect app exists and before App Store review submission. It turns the current TestFlight and App Store Connect blockers into one non-secret evidence packet.

Do not store Apple ID passwords, two-factor codes, App Store Connect API private keys, `.p8` key files, signing certificates, provisioning profiles, reviewer passwords, payment details, tester personal data, or transaction receipts in Git, docs, screenshots, or chat.

Apple's current App Store Connect help says an app version needs required metadata and the correct uploaded build selected before App Review submission, and that the final action is `Submit for Review`. Apple's build-status reference says `Ready to Submit` means a build can be distributed to internal testers or submitted to App Review.

References checked on 2026-06-05:

- App Store Connect submit flow: `https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/`
- App Store Connect build selection: `https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit`
- App Store Connect build statuses: `https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-build-statuses/`
- App Store Connect app information and Digital Services Act fields: `https://developer.apple.com/help/app-store-connect/reference/app-information/app-information`

## Required Console Values

- App name: `Ryvro Shift Planner`
- Native display name: `Ryvro`
- Bundle ID: `com.ryvro.shiftplanner`
- SKU: `ryvro-shift-001`
- Primary language: English (Australia)
- Apple app ID / ASC app ID: `6776994726`
- Owner Apple ID email: `seiduilyasu94@gmail.com`
- Apple Team ID: `BZ798WZJCB`
- App type: iOS app
- Category: Productivity
- First iOS release version: `1.0.0`
- First iOS build number: `1`
- EAS submit command: `eas submit --platform ios --latest`
- Reviewer account email: `reviewer@getryvro.com`

## Current Non-Secret Console State

Known owner-console evidence from 2026-06-05:

- App Store Connect app was created with name `Ryvro Shift Planner`, SKU `ryvro-shift-001`, primary language English (Australia), and bundle ID `com.ryvro.shiftplanner`.
- ASC app ID is `6776994726`.
- Apple Developer Team ID is `BZ798WZJCB`.
- Apple Developer Program membership is active through March 11, 2027.
- Apple Developer Program License Agreement blocker was cleared.
- EAS iOS signing reused distribution certificate serial `301E6C7873C7CB794FF62784DA03A26D`, expiring Thu, 11 Mar 2027 10:35:07 UTC.
- EAS created provisioning profile Developer Portal ID `8SPN7X8WKH`, expiring Thu, 11 Mar 2027 10:35:07 UTC.
- EAS iOS production build `c99b0e0a-829c-4ab7-bd93-164586ade68a` uploaded to App Store Connect through EAS Submit `c17b593c-7909-42db-96f6-a81f095f7479`.
- Latest EAS iOS production build evidence from `npx eas-cli build:list --platform ios --limit 5 --json` is build `782b6dec-1cf1-4cf2-9159-69ef1ab4078a`, status `FINISHED`, project `@ilyasu/ryvro`, version `1.0.0`, build number `1`, completed `2026-06-05T10:05:30.038Z`, and application archive `https://expo.dev/artifacts/eas/fQEAHqM7cPm7B5yEpFosVy.ipa`.
- EAS remote version check with `npm run release:versions:get` on 2026-06-05 returned iOS build number `1` and Android versionCode `1`.
- Do not submit build `782b6dec-1cf1-4cf2-9159-69ef1ab4078a` as-is because App Store Connect already has version `1.0.0`, build `1` from the earlier TestFlight upload. The next TestFlight upload should use real production Firebase/OAuth/RevenueCat values and an incremented iOS build number.
- Fresh EAS iOS build attempts on 2026-06-06 from commit `8338318` reached `Uploading to EAS Build (0 / 223 MB)` and did not create a new remote build record. The `.easignore` cleanup in commit `8338318` reduced the upload archive from `244 MB` to `223 MB` by excluding local-only files, but the upload still stalled from the Codex environment. A local Terminal retry with `npx eas-cli@14` proved that EAS CLI 14 does not support `--verbose-logs`, so the supported retry command is `cd /Users/Shared/Ellie && npx eas-cli@14 build --profile production --platform ios --non-interactive --no-wait --message "Ryvro TestFlight candidate 63972d5"`.
- The local Terminal retry created EAS iOS production build `3243cfd5-2a92-42ad-b19b-471ae9a085aa` on 2026-06-06 for project `@ilyasu/ryvro`, bundle `com.ryvro.shiftplanner`, commit `35e010e0cf7e73ce9085847863654851979708b6`, message `Ryvro TestFlight candidate 63972d5`, and final status `FINISHED` at `2026-06-06T08:59:07.070Z` with application archive `https://expo.dev/artifacts/eas/7d169i6X9ZpAJm9twMYE29.ipa`. EAS CLI 14 printed a Metro warning, but `metro.config.js` already extends Expo's default config through `expo/metro-config` and `getDefaultConfig(__dirname)`. Do not submit this build because it is still iOS build number `1`.
- Remote EAS iOS build number was bumped from `1` to `2` on 2026-06-06 with `npx eas-cli build:version:set --platform ios --profile production`. `npm run release:versions:get` then returned Android versionCode `1` and iOS buildNumber `2`. A Codex-side attempt to start build `2` stalled at `Uploading to EAS Build (0 / 140 MB)`, so run the next build from the local Terminal with `cd /Users/Shared/Ellie && npx eas-cli@14 build --profile production --platform ios --non-interactive --no-wait --message "Ryvro TestFlight candidate build 2"`.
- The local Terminal build-number-2 retry created EAS iOS production build `71fde2ff-aa36-4741-aa69-e4f11ba30acd` on 2026-06-06 for project `@ilyasu/ryvro`, bundle `com.ryvro.shiftplanner`, version `1.0.0`, iOS build number `2`, commit `6b8ddb9c1343b4d36ebe5cf965cbf71041163456`, message `Ryvro TestFlight candidate build 2`, and final status `FINISHED` at `2026-06-06T09:26:45.414Z` with application archive `https://expo.dev/artifacts/eas/f5qhVQot1CDyn9zD4bzSfR.ipa`. This is still not final production-auth-ready evidence until the EAS production environment has real Firebase, OAuth, RevenueCat, legal URL, and backend values pushed.
- EAS Submit found App Store Connect API key `BQG8N6UP7Y` on EAS servers for ASC app ID `6776994726`. The first build `2` submit attempt with `--what-to-test` failed because changelog submission requires an Enterprise plan. The retry without changelog succeeded and uploaded build `71fde2ff-aa36-4741-aa69-e4f11ba30acd` / iOS build number `2` to App Store Connect through EAS Submit `b53825db-0f5c-4f56-b19e-c5af5f1999f3`; Apple was processing the binary after upload. Submission details: `https://expo.dev/accounts/ilyasu/projects/ryvro/submissions/b53825db-0f5c-4f56-b19e-c5af5f1999f3`. App Store Connect TestFlight URL: `https://appstoreconnect.apple.com/apps/6776994726/testflight/ios`.
- Repeat EAS submit attempts for the same build on 2026-06-06 created submission records `df935b60-4ef5-40b0-aaac-c5e7d25462d1` and `50d7057e-ca33-4395-a6e6-6c207b520860`, then failed with the generic CLI message `Something went wrong when submitting your app to Apple App Store Connect`. EAS CLI did not expose a more specific Apple error, so use the earlier successful submission `b53825db-0f5c-4f56-b19e-c5af5f1999f3` and inspect App Store Connect directly for the build processing status instead of treating the duplicate retries as fresh TestFlight evidence.
- TestFlight previously showed version `1.0.0`, build `1`, status `Ready to Submit`.
- App Store Connect TestFlight visual inspection on 2026-06-06 showed version `1.0.0` with builds `2` and `1`; both rows had status `Ready to Submit`. Build `2` is attached to group badge `RI`, expires in 90 days, and showed no installs or crashes yet. Build `2` is now through Apple processing and ready for TestFlight distribution/testing, but TestFlight install QA evidence is still pending.
- Spaceship Email forwarding now has `reviewer@getryvro.com` forwarding to `seiduilyasu94@gmail.com`, so the reviewer mailbox address has a destination before store review. On 2026-06-07, Firebase Auth confirmed `reviewer@getryvro.com` already existed; its password was rotated through the Identity Toolkit Admin API and copied to the local clipboard only, without writing it to Git, docs, screenshots, or chat. Store the password only in App Store Connect and Google Play Console reviewer-access fields.
- Internal TestFlight group `Ryvro iPhone QA` shows `Internal Group ∙ 1 Tester ∙ 1 Build`.
- Tester `seiduilyasu94@gmail.com` / `Ilyasu Seidu` is currently `Invited`.
- Expo App Store Connect connection check now shows EAS server-side App Store Connect API key `BQG8N6UP7Y` for submit use.
- App Store Connect showed the EU trader-status warning.
- The uploaded iOS build still contains local placeholder Firebase/OAuth URL schemes, so it is not production-auth-ready until real Firebase/OAuth env evidence is complete and a fresh production build is made.

## App Store Connect App Record

Complete or verify in App Store Connect while signed in as the owner.

- Confirm app name `Ryvro Shift Planner`.
- Confirm SKU `ryvro-shift-001`.
- Confirm bundle ID `com.ryvro.shiftplanner`.
- Confirm primary language English (Australia).
- Confirm category Productivity.
- Add privacy policy URL `https://getryvro.com/privacy`.
- Add support URL `https://getryvro.com/support`.
- Add marketing URL only after the launch landing page is live.
- Complete content rights accurately.
- Complete age rating using `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.
- Complete Digital Services Act / EU trader status if the app will be available in the EU.

Record:

- ASC app ID `6776994726`
- App status
- Privacy policy URL status
- Support URL status
- Category status
- Age rating status
- EU trader status completion note

## TestFlight Internal Testing

Use TestFlight before public App Store review.

- Verify the internal group is named `Ryvro iPhone QA`.
- Verify the group has at least one owner/tester Apple ID.
- Verify the build is available to the internal group.
- Accept the TestFlight invitation on a real iPhone.
- Install through TestFlight, not Expo Go and not a local debug build.
- Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` for the smoke matrix.
- Keep the current build pending until it is rebuilt with real Firebase/OAuth/RevenueCat production values.
- Run `npm run release:versions:get`, then use `eas build:version:set --platform ios --profile production` to increment the remote iOS build number before uploading the next production-auth-ready TestFlight build.

Record:

- TestFlight group URL or dashboard note
- Build version and build number
- Build status
- Tester invite status
- Device model
- iOS version
- Installed bundle ID proof for `com.ryvro.shiftplanner`
- Smoke matrix pass or failure result
- Any blocker screenshots or logs without passwords or personal data

## App Store Privacy, Review Forms, And Reviewer Access

Complete before pressing `Submit for Review`.

- Fill App Store privacy answers from `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.
- Confirm the live privacy policy matches Firebase, RevenueCat, app-store billing, AI provider, voice, analytics, diagnostics, and account deletion behavior.
- Complete export compliance; current Expo config says `ITSAppUsesNonExemptEncryption` is `false`.
- Complete content rating and age rating.
- Complete app access notes.
- Create reviewer account `reviewer@getryvro.com` only after production Firebase Auth exists.
- Store the reviewer password only in App Store Connect, not in Git, docs, screenshots, or chat.
- Confirm the reviewer account can complete onboarding and reach the paywall.
- Add review notes from `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`.

Record:

- App Store privacy form completion note
- Export compliance completion note
- Content rating completion note
- Reviewer account exists note
- Reviewer notes pasted note
- Privacy/support/account deletion live URL checks

## Subscription And In-App Purchase Review

Complete with RevenueCat and App Store Connect products before final review.

- Create subscription group `Ryvro Pro`.
- Create products `ryvro_pro_monthly` and `ryvro_pro_annual`.
- Add product metadata, pricing, localization, and 7-day trial if approved for launch.
- Upload required subscription review metadata and paywall screenshot if App Store Connect asks for it.
- Create or upload the App Store Connect in-app purchase `.p8` key for RevenueCat.
- Copy only the App Store Connect in-app purchase Key ID and Issuer ID into RevenueCat.
- Keep the `.p8` private key out of the repo.
- Use `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md` for the matching RevenueCat evidence packet.

Record:

- Subscription group status
- `ryvro_pro_monthly` status
- `ryvro_pro_annual` status
- Trial configuration note
- RevenueCat iOS app save status
- RevenueCat entitlement `pro` attachment status

## EAS Submit And App Review

Submit only after `npm run release:submit:check` passes.

```bash
eas submit --platform ios --latest
```

After upload:

- Verify the submitted build appears in App Store Connect.
- Select the correct build for version `1.0.0`.
- Confirm app metadata, screenshots, privacy, ratings, reviewer notes, subscriptions, and EU trader status are complete.
- Add the app version and subscription products to the same App Review submission if App Store Connect requires them to be reviewed together.
- Click `Submit for Review` only after the owner approves.

Record:

- EAS submit URL or submission ID
- App Store Connect build number selected for version `1.0.0`
- App Review submission ID or dashboard note
- Submission status
- Any rejection or missing-metadata notes

## Production App Store Gate

Do not treat iOS as launch-ready until all of these are true:

- Real Firebase/OAuth/RevenueCat values pass `npm run release:env:check`.
- Fresh iOS production build is created after real production env evidence exists.
- TestFlight install passes on a real iPhone.
- App Store privacy form, export compliance, content rating, EU trader status, screenshots, and reviewer notes are complete.
- RevenueCat iOS products and sandbox purchase or restore pass.
- `npm run release:submit:check` passes.
- The owner has clicked `Submit for Review` and App Store Connect shows the submitted status.

After App Review status changes, update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with the non-secret status, submission ID or dashboard note, and any reviewer feedback.
