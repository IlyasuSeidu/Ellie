# Ryvro External Service Setup

Last updated: 2026-06-05

This is the account-side setup checklist for services that cannot be fully changed from the repo. It translates the repo identity into exact console values.

Use `docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md` first when executing launch work; this file provides the detailed console values for that runbook.

Use `docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md` as the fill-in evidence packet for formal clearance, domain purchase, DNS/HTTPS proof, support mailbox, legal page publication, and social handle reservation.

Use `docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md` as the fill-in evidence packet for App Store Connect metadata, TestFlight internal testing, App Store privacy/forms, reviewer account, iOS subscriptions, EAS submit, and App Review gates.

Use `docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md` as the fill-in evidence packet for Firebase project creation, native app config files, Google OAuth, Firebase Auth domains and email templates, backend deploys, endpoint smoke tests, production env preflight, and EAS production environment push.

Use `docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md` as the fill-in evidence packet for RevenueCat apps, Ryvro Pro entitlement, App Store and Google Play subscription products, default offering, SDK key copying, env preflight, and sandbox purchase QA.

## Final Identity Values

- App name: Ryvro Shift Planner
- Native display name: Ryvro
- iOS bundle ID: com.ryvro.shiftplanner
- Android package name: com.ryvro.shiftplanner
- URL scheme: ryvro
- Preferred domain: getryvro.com
- Preferred support email: support@getryvro.com
- Preferred voice endpoint for new builds: ryvroBrain
- Retired voice endpoint: ellieBrain must not be configured for new Ryvro builds

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
- Configure Firebase Auth email templates from `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md` with sender name `Ryvro Support`, reply-to email `support@getryvro.com`, public action domain `getryvro.com`, custom action URL `https://getryvro.com/auth/action/`, and continue/action URLs on `https://getryvro.com`.
- Confirm Firestore rules and indexes are deployed after the project is selected.
- Confirm Analytics events appear under the Ryvro Firebase project.

Deploy backend functions:

```bash
firebase use <ryvro-project-id>
firebase deploy --only functions
```

Configure the new production app and EAS production environment with both Ryvro HTTPS function URLs:

- `RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain`
- `RYVRO_BRAIN_TIMEOUT=30000`
- `SHIFT_SCHEDULE_PARSER_URL=https://<region>-<project-id>.cloudfunctions.net/parseShiftScheduleDescription`
- `SHIFT_SCHEDULE_PARSER_TIMEOUT_MS=45000`
- `SHIFT_SCHEDULE_PARSER_MAX_PROMPT_LENGTH=2000`

Do not configure `ellieBrain` as the launch `RYVRO_BRAIN_URL`. Because Ryvro has not launched publicly yet, new production builds should only deploy and configure `ryvroBrain`; do not keep an `ellieBrain` compatibility endpoint in the launch backend.

Smoke-test endpoints after deploy:

```bash
curl -i -X POST "$RYVRO_BRAIN_URL" \
  -H "Content-Type: application/json" \
  -d "{}"

curl -i -X POST "$SHIFT_SCHEDULE_PARSER_URL" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"I work 2 days, 2 nights, then 4 off.","timezone":"UTC","locale":"en-US","today":"2026-05-31"}'
```

Expected result:

- `ryvroBrain`: `400` means the HTTPS function is live and rejected the invalid body; `200` means it processed a valid test body.
- `parseShiftScheduleDescription`: `200` with a draft schedule proves the parser endpoint, OpenAI secret/fallback path, and response path are launch-ready. A `400` from an intentionally invalid body proves only HTTP reachability, not parser readiness.
- Network errors, `404`, Firebase auth/project errors, missing secret errors, or provider failures mean the endpoint is not ready.

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
GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Before pushing secrets to EAS or starting production builds, validate that `.env` contains real production values and no launch placeholders:

```bash
cp .env.production.example .env
# Fill .env with real owner/account values first.
npm run release:env:check
```

The check requires `APP_ENV=production`, the real EAS project UUID, real Firebase values scoped to one Ryvro `FIREBASE_PROJECT_ID`, root-level real Firebase native service files referenced by `EXPO_IOS_GOOGLE_SERVICES_FILE` and `EXPO_ANDROID_GOOGLE_SERVICES_FILE`, live HTTPS `API_BASE_URL`, real Google web, iOS, and Android OAuth client IDs, mirrored Expo public Google OAuth client IDs, the deployed `ryvroBrain` URL, real RevenueCat `appl_...` and `goog_...` SDK keys, mirrored Expo public RevenueCat keys and entitlement ID, and live HTTPS Ryvro-owned `LEGAL_PRIVACY_POLICY_URL`, `LEGAL_TERMS_OF_SERVICE_URL`, `SUPPORT_URL`, and `ACCOUNT_DELETION_URL` values with matching privacy, terms/legal, support/help, and account deletion paths. The committed production example now includes the known non-secret Ryvro Firebase Web app ID and OAuth client IDs, but it still intentionally keeps Firebase API key and RevenueCat SDK keys as owner-controlled launch checks. It also rejects retired Ellie/ShiftSync Firebase project IDs, retired `ELLIE_BRAIN_*` env keys, Cloud Function hosts for `ryvroBrain` and `parseShiftScheduleDescription`, tracked local service-file placeholders under `config/firebase/`, generated native-folder service-file paths under `ios/` or `android/`, and service files whose project ID or bundle/package does not match `FIREBASE_PROJECT_ID` and `com.ryvro.shiftplanner`. `.env.production.example` is a checklist, not a usable secret file; it must fail the preflight until every placeholder is replaced.

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

Current non-secret dashboard state from logged-in owner-console work on 2026-06-05:

- Project: `Ryvro`
- Project URL path: `https://app.revenuecat.com/projects/42dccd7e/overview`
- Category: `Productivity`
- Starting platforms: `Native Apple` and `Native Android`
- Setup status: dashboard still shows setup `(0 of 6)` and Test Store only.
- Android app: saved as `Ryvro (Play Store)` with package `com.ryvro.shiftplanner`, app URL `https://app.revenuecat.com/projects/42dccd7e/apps/appab0f4b628d`, and REST API identifier `appab0f4b628d`.
- Android remaining work: upload the Google Play service account credentials JSON, save the RevenueCat app settings, and configure Google developer notifications after Play Console setup is complete.
- iOS app: the App Store app form was filled with `Ryvro (App Store)` and bundle `com.ryvro.shiftplanner`, but RevenueCat blocked save with `The following fields have errors: In-App Purchase Key ID and In-App Purchase Issuer ID`.
- iOS remaining work: create or upload the App Store Connect in-app purchase p8 key, then provide its Key ID and Issuer ID in RevenueCat before saving the iOS app configuration.

Target apps:

- iOS app name: Ryvro (App Store)
- iOS app bundle ID: com.ryvro.shiftplanner
- Android app name: Ryvro (Play Store)
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
- `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md`
- `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`
- `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`

Required before submit:

- Privacy policy URL
- Support URL
- Account deletion URL: `https://getryvro.com/delete-account`
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
- Account deletion URL: `https://getryvro.com/delete-account`
- Data safety form
- App access instructions
- Content rating
- Target audience
- Subscriptions
- Internal testing release

Service account and internal testing:

- Complete the remaining Play Console account verification tasks before creating the app. The developer account now exists, but Play Console still requires identity verification, Android mobile device access verification, and contact phone verification before `Create app` is enabled.
- Create the Play app as `Ryvro Shift Planner` with package `com.ryvro.shiftplanner`.
- Set first release track to Internal testing.
- Create a least-privilege Google Play service account for EAS Submit and RevenueCat access.
- Save the downloaded JSON key locally as `./google-play-key.json`; keep it ignored by Git and never paste its contents into docs, chat, or screenshots.
- Confirm `eas.json` points Android production submit at `./google-play-key.json` and track `internal`.
- Run `eas submit --platform android --latest` only after the AAB exists and the service account is ready.
- Use `docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md` for the exact evidence packet and promotion gate.

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

- Review and publish the static launch pages in `web/launch`: landing page, privacy, terms, support, and account deletion.
- Add `support@getryvro.com`. Completed: Spaceship Email forwarding now routes this mailbox, and Gmail received a Google Play Console verification email addressed to `support@getryvro.com` on 2026-06-07. Do not record one-time verification codes in the repo.
- Add Firebase Auth authorized domain.
- Configure Firebase Auth email-template Custom action URL: https://getryvro.com/auth/action/
- Add App Store and Play Store support/privacy/account deletion URLs.
- Add website and social links to store listings.

If Firebase Hosting is used for the public site, configure a separate hosting target before deploying `web/launch` so the existing analytics admin hosting path is not overwritten:

```bash
firebase target:apply hosting launch-site <firebase-hosting-site-id>
npm run firebase:deploy:launch-site
```

Current Firebase Hosting progress:

- Separate launch site created: `ryvro-launch-site`
- Default launch URL: `https://ryvro-launch-site.web.app`
- `.firebaserc` maps `launch-site` to `ryvro-launch-site` for project `ryvro-shift-planner`
- `npm run firebase:deploy:launch-site -- --project ryvro-shift-planner` deployed the static launch pages on 2026-06-06
- The 2026-06-06 redeploy included the Firebase Auth action handler at `https://ryvro-launch-site.web.app/auth/action/`
- Verified fallback URLs: `https://ryvro-launch-site.web.app/privacy/`, `https://ryvro-launch-site.web.app/terms/`, `https://ryvro-launch-site.web.app/support/`, `https://ryvro-launch-site.web.app/delete-account/`, and `https://ryvro-launch-site.web.app/auth/action/`
- Browser smoke against `https://ryvro-launch-site.web.app/auth/action/?mode=verifyEmail&oobCode=invalid-test-code` loaded the page title `Ryvro Account Action`, rendered the expected invalid-link state, and produced no browser console errors.
- Spaceship DNS now includes `A @ 199.36.158.100`, `TXT @ hosting-site=ryvro-launch-site`, and Firebase's requested `_acme-challenge.getryvro.com` TXT record.
- Firebase Console accepted the `getryvro.com` custom-domain verification and initially moved the domain to `Minting certificate`.
- A later Firebase Hosting custom-domain API recheck reported `hostState` `HOST_ACTIVE`, `ownershipState` `OWNERSHIP_ACTIVE`, and certificate state `CERT_ACTIVE`.
- Verified production URLs: `https://getryvro.com/`, `https://getryvro.com/privacy/`, `https://getryvro.com/terms/`, `https://getryvro.com/support/`, `https://getryvro.com/delete-account/`, and `https://getryvro.com/auth/action/` returned HTTP `200` with security headers on 2026-06-06.
- Firebase Auth email-template callback URL remains pending: metadata-only Identity Toolkit Admin API readback still showed `callbackUri` as `https://ryvro-shift-planner.firebaseapp.com/__/auth/action`, and an API patch attempt for `https://getryvro.com/auth/action/` returned `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`.

Record the live `https://getryvro.com/privacy`, `https://getryvro.com/terms`, `https://getryvro.com/support`, `https://getryvro.com/delete-account`, and `https://getryvro.com/auth/action/` checks in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md`. Record any later support mailbox checks, Firebase Auth callback fixes, and store-console URL evidence in the same file without storing one-time codes or secrets.

Before purchase/reservation, run the public repo-side evidence check:

```bash
npm run release:clearance
```

This command checks public Apple software search results, public Google Play search text, DNS, Verisign WHOIS for `.com` candidates, social URL HTTP statuses, and USPTO Trademark Search reachability. It does not buy domains, reserve handles, prove App Store Connect or Play Console availability, or replace legal trademark clearance. Treat it as a repeatable preflight check before the account-owner completes the logged-in steps.

Latest public preflight evidence captured on 2026-06-06 at 13:11:48Z:

- Apple public software search: no exact `Ryvro` or `Ryvro Shift Planner` app result returned across 5 fuzzy results.
- Google Play public search: no exact `Ryvro` or `Ryvro Shift Planner` result text found. Visible fuzzy names included `Rydoo` and `Rydora`.
- USPTO public search app: reachable only. This is not legal clearance.
- `getryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, and `ryvro.org`: no public DNS record.
- `useryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `tryryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `getryvroapp.com`: no public DNS record and Verisign `.com` returned no match.
- `ryvro.com`: already registered through GoDaddy/Afternic, with public A records `76.223.54.146` and `13.248.169.48`, creation date `2025-06-16T10:06:52Z`, expiry date `2026-06-16T10:06:52Z`, and Afternic nameservers. Do not treat it as available unless purchased from the current registrant.
- X, Instagram, and TikTok `@ryvro`: public URLs returned `200`; this is not reliable ownership or availability proof.
- YouTube `@ryvro`: public URL returned `404`; reserve directly while logged in.
- LinkedIn `company/ryvro`: public URL returned `404`; this is not reliable ownership or availability proof, so check and reserve directly while logged in.

Logged-in domain progress from 2026-06-06: Spaceship showed `getryvro.com` as available and the domain was added to the cart without add-ons. The cart showed first-year line price `$8.88`, renewal price `$9.98`, and visible total `$9.08`. The owner later confirmed purchase. Spaceship Advanced DNS now has `A @ 199.36.158.100`, `TXT @ hosting-site=ryvro-launch-site`, and Firebase's requested `_acme-challenge.getryvro.com` TXT record. Public `dig` checks returned all three records, `http://getryvro.com` returns HTTP `301` to `https://getryvro.com/`, and live `https://getryvro.com/`, `/privacy/`, `/terms/`, `/support/`, `/delete-account/`, and `/auth/action/` checks returned HTTP `200` with security headers. Firebase Hosting custom domain `getryvro.com` is attached to site `ryvro-launch-site`; Firebase Console accepted verification and initially moved the domain to `Minting certificate`, and a later Hosting API recheck reported `hostState` `HOST_ACTIVE`, `ownershipState` `OWNERSHIP_ACTIVE`, and certificate state `CERT_ACTIVE`. The live account deletion page now includes a prefilled deletion request link to `support@getryvro.com` with subject `Ryvro account deletion request`, account email, country, and optional-notes fields. Spaceship Email forwarding now has individual rules forwarding `support@getryvro.com` and `reviewer@getryvro.com` to `seiduilyasu94@gmail.com`; public DNS returns Spaceship forwarding MX records `mx1.efwd.spaceship.net` and `mx2.efwd.spaceship.net`, plus SPF TXT value `v=spf1 include:spf.efwd.spaceship.net ~all`. A same-account Gmail test sent from `seiduilyasu94@gmail.com` to `support@getryvro.com` did not produce a forwarded inbound copy because the sender and forwarding destination were the same mailbox, and the requested outside sender `seiduilyasu@tmail.com` could not be used because `tmail.com` returned no public MX or A records. Later on 2026-06-07, Gmail contained a Google Play Console verification email from Google addressed to `support@getryvro.com`; the code was used to verify the public developer profile email in Play Console. Keep the broader launch row pending until legal/content review and store-console URL evidence are complete.

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
