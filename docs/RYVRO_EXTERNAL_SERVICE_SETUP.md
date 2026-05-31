# Ryvro External Service Setup

Last updated: 2026-05-31

This is the account-side setup checklist for services that cannot be fully changed from the repo. It translates the repo identity into exact console values.

Use `docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md` first when executing launch work; this file provides the detailed console values for that runbook.

## Final Identity Values

- App name: Ryvro Shift Planner
- Native display name: Ryvro
- iOS bundle ID: com.ryvro.shiftplanner
- Android package name: com.ryvro.shiftplanner
- URL scheme: ryvro
- Preferred domain: getryvro.com
- Preferred support email: support@getryvro.com
- Preferred voice endpoint for new builds: ryvroBrain
- Legacy voice endpoint kept only during migration: ellieBrain

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

- iOS source path before native generation: `./GoogleService-Info.plist`
- Android source path before native generation: `./google-services.json`
- Keep both files at the repo root and ignored by Git so `npx expo prebuild --clean` can copy them into the generated native projects without deleting the source files first.
- Local prebuilds fall back to tracked Ryvro-shaped placeholder files in `config/firebase/`; production `.env` must set the root-level `EXPO_IOS_GOOGLE_SERVICES_FILE` and `EXPO_ANDROID_GOOGLE_SERVICES_FILE` paths after the owner downloads real Firebase configs.

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

Configure new production app and EAS secrets with the `ryvroBrain` HTTPS URL only:

- `RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain`
- `RYVRO_BRAIN_TIMEOUT=30000`

Do not configure `ellieBrain` as the launch `RYVRO_BRAIN_URL`. Keep the `ellieBrain` function deployed only long enough to support pre-migration builds, then retire it after production clients and dashboards have moved to `ryvroBrain`.

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

Before pushing secrets to EAS or starting production builds, validate that `.env` contains real production values and no launch placeholders:

```bash
cp .env.production.example .env
# Fill .env with real owner/account values first.
npm run release:env:check
```

The check requires `APP_ENV=production`, the real EAS project UUID, real Firebase values scoped to one Ryvro `FIREBASE_PROJECT_ID`, root-level real Firebase native service files referenced by `EXPO_IOS_GOOGLE_SERVICES_FILE` and `EXPO_ANDROID_GOOGLE_SERVICES_FILE`, live HTTPS `API_BASE_URL`, real Google OAuth values, mirrored Expo public Google OAuth client IDs, the deployed `ryvroBrain` URL, real RevenueCat `appl_...` and `goog_...` SDK keys, mirrored Expo public RevenueCat keys and entitlement ID, live HTTPS Ryvro-owned `LEGAL_PRIVACY_POLICY_URL`, `LEGAL_TERMS_OF_SERVICE_URL`, and `SUPPORT_URL` values with matching privacy, terms/legal, and support/help paths, and an empty `ELLIE_BRAIN_URL` for new Ryvro builds. It also rejects retired Ellie/ShiftSync Firebase project IDs, Cloud Function hosts for `ryvroBrain` and `parseShiftScheduleDescription`, tracked local service-file placeholders under `config/firebase/`, generated native-folder service-file paths under `ios/` or `android/`, and service files whose project ID or bundle/package does not match `FIREBASE_PROJECT_ID` and `com.ryvro.shiftplanner`. `.env.production.example` is a checklist, not a usable secret file; it must fail the preflight until every placeholder is replaced.

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

Pre-launch cleanup:

- Do not configure retired Ellie entitlement IDs in the launch app because the product has not shipped publicly.
- If any private tester receipt exists under an old dashboard, reissue it through Ryvro sandbox products instead of keeping old aliases in production code.
- Confirm restore purchases with fresh Ryvro sandbox accounts before release.

Env values:

```text
REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
REVENUECAT_ANDROID_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
REVENUECAT_ENTITLEMENT_ID=pro
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

Fill these in `.env` from the `.env.production.example` slots after creating the Ryvro RevenueCat apps, products, entitlement, and default offering. Keep the same keys in `.env.example` as local-development placeholders only.

Important:

- Do not use RevenueCat `test_` API keys for release, store, or E2E simulator QA. The app treats `test_` keys as unavailable launch keys so RevenueCat's release-mode test-key protection cannot block QA with a native alert.
- Use production/sandbox app API keys from the Ryvro RevenueCat apps, such as the normal iOS `appl_...` and Android `goog_...` key formats.
- Keep `EXPO_PUBLIC_REVENUECAT_IOS_KEY` identical to `REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` identical to `REVENUECAT_ANDROID_KEY`, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` identical to `REVENUECAT_ENTITLEMENT_ID`; `npm run release:env:check` blocks mismatches so the native app and Expo runtime cannot load different RevenueCat projects or entitlement gates.

Verification:

- Paywall loads.
- Monthly and annual products load.
- Purchase succeeds in sandbox.
- Restore purchases succeeds.
- Profile shows `Ryvro Pro - Active` after entitlement activation.
- Center voice button unlocks when Pro is active.
- `npm run release:env:check` passes with the real RevenueCat native/public key mirrors before secrets are pushed to EAS.

## App Store Connect

Create app:

- Name: Ryvro Shift Planner
- Bundle ID: com.ryvro.shiftplanner
- SKU: ryvro-shift-001
- Primary language: English

Metadata source:

- `docs/RYVRO_STORE_LISTING.md`
- `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`
- `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`

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
- `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`

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
- useryvro.com
- tryryvro.com
- getryvroapp.com
- @getryvro
- @tryryvro

After domain purchase:

- Publish privacy, terms, and support pages.
- Add `support@getryvro.com`.
- Add Firebase Auth authorized domain.
- Add App Store and Play Store support/privacy URLs.
- Add website and social links to store listings.

Before purchase/reservation, run the public repo-side evidence check:

```bash
npm run release:clearance
```

This command checks public Apple software search results, public Google Play search text, DNS, Verisign WHOIS for `.com` candidates, social URL HTTP statuses, and USPTO Trademark Search reachability. It does not buy domains, reserve handles, prove App Store Connect or Play Console availability, or replace legal trademark clearance. Treat it as a repeatable preflight check before the account-owner completes the logged-in steps.

Latest public preflight evidence captured on 2026-05-31 at 07:14:40Z:

- Apple public software search: no exact `Ryvro` or `Ryvro Shift Planner` app result returned across 5 fuzzy results.
- Google Play public search: no exact `Ryvro` or `Ryvro Shift Planner` result text found. Visible fuzzy names included `Rydoo` and `Rydora`.
- USPTO public search app: reachable only. This is not legal clearance.
- `getryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, and `ryvro.org`: no public DNS record.
- `useryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `tryryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `getryvroapp.com`: no public DNS record and Verisign `.com` returned no match.
- `ryvro.com`: already registered through GoDaddy/Afternic and should not be treated as available.
- X, Instagram, and TikTok `@ryvro`: public URLs returned `200`; this is not reliable ownership or availability proof.
- YouTube `@ryvro` and LinkedIn `company/ryvro`: public URLs returned `404`; reserve directly while logged in.

## Analytics And Support Naming

Use Ryvro-visible names in dashboards:

- Firebase project display name: Ryvro
- Analytics property/report labels: Ryvro
- Segment schedule setup dashboards by industry, template, and source.
- Use `industry`, `template_id`, and `schedule_source` / `source` dimensions from backend daily summaries instead of making mining/FIFO the default segment.
- Do not send raw ward, depot, plant, terminal, venue, rig, station, or site names into analytics dimensions. The backend sanitizer redacts `work_location`, `work_location_name`, `location_name`, `workplace`, `site_name`, and legacy `mining_site` fields.
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
