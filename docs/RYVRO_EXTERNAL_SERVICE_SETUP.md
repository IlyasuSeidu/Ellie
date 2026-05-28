# Ryvro External Service Setup

Last updated: 2026-05-28

This is the account-side setup checklist for services that cannot be fully changed from the repo. It translates the repo identity into exact console values.

## Final Identity Values

- App name: Ryvro Shift Planner
- Native display name: Ryvro
- iOS bundle ID: com.ryvro.shiftplanner
- Android package name: com.ryvro.shiftplanner
- URL scheme: ryvro
- Preferred domain: getryvro.com
- Preferred support email: support@getryvro.com
- Preferred voice endpoint: ryvroBrain
- Legacy voice endpoint kept during migration: ellieBrain

## Firebase

Create or update the Firebase project to use Ryvro-visible labels.

Recommended project display name:

- Ryvro

Required apps:

- iOS app nickname: Ryvro iOS
- iOS bundle ID: com.ryvro.shiftplanner
- Android app nickname: Ryvro Android
- Android package name: com.ryvro.shiftplanner

Download fresh config files:

- iOS: `GoogleService-Info.plist`
- Android: `google-services.json`

Repo placement:

- iOS current native path: `ios/Ellie/GoogleService-Info.plist`
- Android current native path: `android/app/google-services.json`

Important:

- Do not reuse config files from the old app identity.
- Confirm `REVERSED_CLIENT_ID` in `GoogleService-Info.plist` matches the new OAuth client.
- Confirm Firebase Auth authorized domains include the production website domain.
- Confirm Firestore rules and indexes are deployed after the project is selected.
- Confirm Analytics events appear under the Ryvro Firebase project.

Deploy backend functions:

```bash
firebase use <ryvro-project-id>
firebase deploy --only functions
```

Smoke-test endpoints after deploy:

```bash
curl -i -X POST "$RYVRO_BRAIN_URL" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Expected result:

- `400` means the HTTPS function is live and rejected the invalid body.
- `200` means the function is live and processed a valid test body.
- Network errors, `404`, or Firebase auth/project errors mean the endpoint is not ready.

## Google Sign-In

Create OAuth clients for the final app identity.

Required:

- Web client ID for Expo/Auth flows
- iOS client ID for com.ryvro.shiftplanner
- Android OAuth client for com.ryvro.shiftplanner and the release signing certificate SHA-1/SHA-256

Update env values:

```text
GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

Verification:

- Google sign-in works on iOS simulator or physical device.
- Google sign-in works on Android with the release/dev signing key used for the build being tested.
- Firebase Auth user appears in the Ryvro Firebase project.

## Apple Sign-In

Required:

- App ID with bundle ID `com.ryvro.shiftplanner`
- Sign in with Apple capability enabled
- Associated identifiers configured if using web or service IDs

Verification:

- Apple sign-in works on iPhone.
- The returned account is linked to the Ryvro Firebase project.
- The display name and email handling still work when Apple hides the email.

## RevenueCat

Create apps:

- iOS app bundle ID: com.ryvro.shiftplanner
- Android package: com.ryvro.shiftplanner

Entitlement:

- ID: pro
- Display name: Ryvro Pro

Products:

- `ryvro_pro_monthly`
- `ryvro_pro_annual`

Offering:

- ID: default
- Display name: Ryvro Pro
- Packages: Monthly and Annual

Recommended display copy:

- Monthly: Ryvro Pro Monthly
- Annual: Ryvro Pro Annual
- Entitlement: Ryvro Pro

Migration:

- Keep old entitlement aliases in the app until every tester/customer receipt has been confirmed on the Ryvro entitlement.
- Do not delete old RevenueCat project data until restore purchases has been tested on real sandbox accounts.

Env values:

```text
REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
REVENUECAT_ANDROID_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
REVENUECAT_ENTITLEMENT_ID=pro
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

Verification:

- Paywall loads.
- Monthly and annual products load.
- Purchase succeeds in sandbox.
- Restore purchases succeeds.
- Profile shows `Ryvro Pro - Active` after entitlement activation.
- Center voice button unlocks when Pro is active.

## App Store Connect

Create app:

- Name: Ryvro Shift Planner
- Bundle ID: com.ryvro.shiftplanner
- SKU: ryvro-shift-001
- Primary language: English

Metadata source:

- `docs/RYVRO_STORE_LISTING.md`
- `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`

Required before submit:

- Privacy policy URL
- Support URL
- Screenshots
- App privacy answers
- Subscription group and products
- Export compliance answer
- Test account or reviewer instructions

## Google Play Console

Create app:

- App name: Ryvro Shift Planner
- Package: com.ryvro.shiftplanner
- Default language: English
- App type: App
- Free/Paid: Free with optional subscription

Metadata source:

- `docs/RYVRO_STORE_LISTING.md`
- `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`

Required before submit:

- Main store listing
- Screenshots and feature graphic
- Privacy policy URL
- Data safety form
- App access instructions
- Content rating
- Target audience
- Subscriptions
- Internal testing release

## Domain And Social Handles

Preferred:

- getryvro.com
- @ryvro

Fallbacks:

- ryvro.app
- tryryvro.com
- useRyvro.com
- getryvroapp.com
- @getryvro
- @tryryvro

After domain purchase:

- Publish privacy, terms, and support pages.
- Add `support@getryvro.com`.
- Add Firebase Auth authorized domain.
- Add App Store and Play Store support/privacy URLs.
- Add website and social links to store listings.

## Analytics And Support Naming

Use Ryvro-visible names in dashboards:

- Firebase project display name: Ryvro
- Analytics property/report labels: Ryvro
- RevenueCat project/app labels: Ryvro iOS, Ryvro Android
- Support mailbox name: Ryvro Support
- Email sender: Ryvro Support

Keep internal legacy event names only when changing them would break existing analytics continuity.

## Release Verification Matrix

Before submitting:

- Fresh install displays `Ryvro`.
- Bundle/package is `com.ryvro.shiftplanner`.
- Email sign-up works.
- Google sign-in works.
- Apple sign-in works on iPhone.
- Universal Builder works from onboarding.
- Universal Builder works from settings.
- AI Builder creates a draft.
- Manual builder saves a schedule.
- Calendar shows colors and icons.
- Dashboard shows current shift colors/icons.
- Holiday exception changes one public holiday.
- One-off exception changes one date.
- Reminder profiles save.
- Calendar export creates a file.
- Calendar import applies events.
- Paywall loads RevenueCat products.
- Sandbox purchase activates Ryvro Pro.
- Restore purchases works.
- Push/local notifications work.
- Offline dashboard still shows saved schedule.
- Production Firebase rules/indexes are deployed.
- App Store / Play Console metadata matches `docs/RYVRO_STORE_LISTING.md`.
