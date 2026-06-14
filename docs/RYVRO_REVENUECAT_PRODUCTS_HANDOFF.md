# Ryvro RevenueCat And Store Products Handoff

Last updated: 2026-06-14

Use this checklist after App Store Connect, Google Play Console, and RevenueCat owner access are available. It turns the Ryvro Pro subscription blockers into one non-secret evidence packet.

Do not store RevenueCat SDK keys, App Store Connect `.p8` private keys, Google Play service account JSON, sandbox tester passwords, reviewer passwords, payment details, transaction receipts, or customer personal data in Git, docs, screenshots, or chat.

## Required Product Model

- Entitlement ID: `pro`
- Entitlement display name: `Ryvro Pro`
- Offering ID: `default`
- Offering display name: `Ryvro Pro`
- Monthly product ID: `ryvro_pro_monthly`
- Annual product ID: `ryvro_pro_annual`
- Monthly display name: `Ryvro Pro Monthly`
- Annual display name: `Ryvro Pro Annual`
- Intro offer: 7-day free trial if approved in both stores
- First-release requirement: Ryvro Pro must be configured before the first store-submitted binary

## Current Non-Secret Dashboard State

Known owner-console evidence from 2026-06-05 through 2026-06-14:

- RevenueCat project: `Ryvro`
- Project URL path: `https://app.revenuecat.com/projects/42dccd7e/overview`
- Category: `Productivity`
- Starting platforms: `Native Apple` and `Native Android`
- Dashboard setup now shows Ryvro project setup in progress.
- Android app exists as `Ryvro (Play Store)` with REST API identifier `appab0f4b628d`.
- Android package: `com.ryvro.shiftplanner`
- Android app URL: `https://app.revenuecat.com/projects/42dccd7e/apps/appab0f4b628d`
- iOS app form was filled as `Ryvro (App Store)` with bundle `com.ryvro.shiftplanner`, but save was blocked until App Store Connect in-app purchase Key ID and Issuer ID are provided.
- Latest logged-in RevenueCat check on 2026-06-14 found the App Store app form requires a p8 in-app purchase key file, Key ID, and Issuer ID before saving the iOS app. The iOS RevenueCat app remains pending.
- Entitlement `pro` now exists with display name `Ryvro Pro`.
- RevenueCat Play Store product record `Ryvro Pro Monthly` now exists with identifier `ryvro_pro_monthly:monthly`, subscription ID `ryvro_pro_monthly`, base plan ID `monthly`, and store status `Could not check`.
- RevenueCat Play Store product record `Ryvro Pro Annual` now exists with identifier `ryvro_pro_annual:annual`, subscription ID `ryvro_pro_annual`, base plan ID `annual`, and store status `Could not check`.
- Entitlement `pro` shows `2 products` attached in the RevenueCat entitlement list.
- Offering `default` now exists with display name `Default`, REST API identifier `ofrngfbba49b733`, package `$rc_monthly` pointing at `ryvro_pro_monthly:monthly`, and package `$rc_annual` pointing at `ryvro_pro_annual:annual`.
- RevenueCat product records and offering packages are not proof of working store purchases yet. The Google Play app and service account now exist, but Google Play subscription products, Play-side base plans, RevenueCat Play service-account connection verification, the App Store RevenueCat app, the App Store Connect in-app purchase key, and sandbox purchase QA are still pending.

## App Store Connect Subscription Setup

Complete in App Store Connect as the owner.

- Create subscription group: `Ryvro Pro`
- Create monthly product ID: `ryvro_pro_monthly`
- Create annual product ID: `ryvro_pro_annual`
- Use display names `Ryvro Pro Monthly` and `Ryvro Pro Annual`.
- Configure pricing and 7-day free trial if approved for launch.
- Complete required subscription localizations.
- Complete in-app purchase review metadata and screenshots if App Store Connect asks for them.
- Create or upload the App Store Connect in-app purchase `.p8` key for RevenueCat.
- Copy only the Key ID and Issuer ID into RevenueCat; do not store the `.p8` key in the repo.

Record:

- Subscription group name
- Product IDs
- Product statuses
- Trial configuration note
- RevenueCat iOS app save status
- Key ID and Issuer ID presence only, not the `.p8` key

## Google Play Subscription Setup

Complete in Google Play Console after the Play app and service account exist.

- Create subscription product ID: `ryvro_pro_monthly`
- Create subscription product ID: `ryvro_pro_annual`
- Configure base plans with matching pricing and 7-day trial where approved.
- Activate the base plans in the internal testing or closed testing path before production.
- Connect the Google Play service account to RevenueCat.
- Configure Google developer notifications if RevenueCat requires them.

Record:

- Product IDs
- Base-plan IDs
- Base-plan statuses
- Trial configuration note
- Google Play service account connected status
- Google developer notifications status

## RevenueCat Configuration

Complete in RevenueCat after the store products exist.

- Save iOS app `Ryvro (App Store)` for bundle `com.ryvro.shiftplanner`.
- Save Android app `Ryvro (Play Store)` for package `com.ryvro.shiftplanner`.
- Copy the real iOS SDK key into `.env` as `REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
- Copy the real Android SDK key into `.env` as `REVENUECAT_ANDROID_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
- Create entitlement ID `pro` with display name `Ryvro Pro`.
- Add products `ryvro_pro_monthly` and `ryvro_pro_annual`.
- Attach both products to entitlement `pro`.
- Create offering ID `default`. Done in RevenueCat on 2026-06-14 with display name `Default`.
- Add Monthly and Annual packages to offering `default`. Done in RevenueCat on 2026-06-14 for the current Play Store product records.
- Confirm RevenueCat dashboard no longer shows Test Store only for launch products.

Record:

- RevenueCat iOS app ID or dashboard note
- RevenueCat Android app ID `appab0f4b628d` or current app ID if changed
- SDK keys copied into `.env` without recording their values
- Entitlement `pro` status
- Product attachment status
- Offering `default` package status
- Confirmation that RevenueCat is connected to real App Store Connect and Google Play products, not Test Store only
- Confirmation that `ryvro_pro_monthly` and `ryvro_pro_annual` are attached to entitlement `pro` for both App Store and Google Play
- Confirmation that offering `default` has Monthly and Annual packages with store product IDs, package identifiers, pricing metadata, and trial metadata matching the store dashboards

## Env And Preflight

After RevenueCat apps and products are configured, update `.env`:

```text
REVENUECAT_IOS_KEY=<real appl_ key>
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<same real appl_ key>
REVENUECAT_ANDROID_KEY=<real goog_ key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<same real goog_ key>
REVENUECAT_ENTITLEMENT_ID=pro
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

Run:

```bash
npm run release:env:check
```

The check must pass before EAS production environment values are pushed or production binaries are rebuilt.

The evidence is complete only when `npm run release:env:check` passes with the real `appl_...` and `goog_...` SDK keys mirrored into their Expo public values, entitlement ID `pro` mirrored into `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`, and the EAS production environment push has been completed without placeholder values.

## Sandbox Purchase QA

Run on production-equivalent builds after the products load from RevenueCat.

Required scenarios:

- Paywall loads monthly and annual products with current store metadata.
- Start 7-day free trial or approved sandbox purchase.
- RevenueCat entitlement `pro` becomes active.
- Locked future calendar weeks unlock.
- Center voice button opens the assistant.
- Profile shows Ryvro Pro active state.
- Restore Purchases works for the same store account.
- Cancel or expire the sandbox subscription where the store allows it.
- Premium gates relock after entitlement is no longer active.

Record:

- Platform
- Build number or versionCode
- Tester account
- Store sandbox account type
- Product ID tested
- Offering ID `default` and package identifier tested
- Entitlement activation result
- Cancel/expire/relock result
- Restore result
- Paywall metadata shown to the tester
- Store transaction or sandbox event status without receipt contents
- RevenueCat customer screen note without customer personal data or receipts

Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` for the device QA rows and update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` after passing.

Do not mark sandbox purchase QA as passed from web dashboards, RevenueCat Test Store, simulator-only testing, Expo Go, a local development client, or a build created before the final production environment values were pushed. Pass evidence must come from production-equivalent iOS and Android binaries that use bundle/package `com.ryvro.shiftplanner`, load RevenueCat offering `default`, activate entitlement `pro`, relock after cancellation or expiry, and restore purchases for the same sandbox store account.

## Evidence Log Updates

Mark rows `Passed` only when the matching evidence is complete:

- `RevenueCat apps`
- `Entitlement`
- `App Store products`
- `Google Play products`
- `Default offering`
- `Sandbox purchase QA`

Keep rows as `Pending owner evidence` or `Failed - needs fix` until RevenueCat, store products, env preflight, and sandbox purchase QA all match the first release binary.
