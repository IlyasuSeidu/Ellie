# Ryvro Firebase, OAuth, And Backend Handoff

Last updated: 2026-06-06

Use this checklist after the owner creates the production Firebase project and before rebuilding Ryvro production binaries. It turns the Firebase, OAuth, backend, and EAS-secret launch blockers into one evidence packet.

Do not store Firebase service-file contents, OAuth client secrets, API keys, OpenAI secrets, EAS tokens, private keys, or `.env` values in Git, docs, screenshots, or chat.

## Required Production Identity

- Firebase project display name: `Ryvro` or `Ryvro Shift Planner`
- Firebase project ID: must be Ryvro-visible and must not contain retired Ellie or ShiftSync names
- iOS bundle ID: `com.ryvro.shiftplanner`
- Android package name: `com.ryvro.shiftplanner`
- Public domain: `getryvro.com`
- Support sender: `Ryvro Support`
- Support reply-to: `support@getryvro.com`
- Voice function: `ryvroBrain`
- Parser function: `parseShiftScheduleDescription`

## Firebase Project

Complete this in Firebase Console while signed in as the owner.

- First refresh Firebase CLI auth from the repo root:

```bash
firebase login --reauth
firebase projects:list
```

- Keep the browser approval step owner-controlled. If the CLI says credentials are no longer valid or waits for authentication, the owner must finish the Google approval page before project creation or deploy work can continue.
- A previous blocking approval screen said `Firebase CLI wants to access your Google Account` for `seiduilyasu94@gmail.com`, with permissions to view and administer Firebase data and settings, view Cloud Platform projects, and see, edit, configure, and delete Google Cloud data. Click `Allow` only when the owner is ready to grant those permissions to the Firebase CLI.
- Firebase CLI reauth completed on 2026-06-05 as `seiduilyasu94@gmail.com`; `firebase projects:list` succeeded and returned `ellie-20260220135308`, `gen-lang-client-0387037810`, `iman-app-7e20d`, `qurantree-app`, and `sunnahmind-staging-36c1ac`. No Ryvro project was present, and the current CLI project remained `ellie-20260220135308`; do not deploy Ryvro backend functions until `firebase use <ryvro-project-id>` points at the production Ryvro project.
- Firebase Console project creation was restarted on 2026-06-05 with display name `Ryvro Shift Planner`, generated project ID `ryvro-shift-planner`, Gemini in Firebase switched off, and Google Analytics left on. With owner confirmation, a new Google Analytics account named `Ryvro Google Analytics` was saved and selected with Analytics location `United States`; the owner then accepted Google Analytics terms and clicked `Create project`.
- Firebase project creation completed on 2026-06-05. `firebase projects:list --json` confirmed project ID `ryvro-shift-planner`, display name `Ryvro Shift Planner`, project number `1002666052675`, state `ACTIVE`, and hosting site `ryvro-shift-planner`. The tracked `.firebaserc` default now points to `ryvro-shift-planner`.
- Local Firebase CLI note: `firebase use` and `firebase use --clear` still failed after project creation because Firebase Tools could not access `/Users/user/.config` for its update/config store and continued to print `ellie-20260220135308`. Before deploying, either repair that local Firebase Tools config-store permission and rerun `firebase use ryvro-shift-planner`, or pass `--project ryvro-shift-planner` explicitly on deploy and functions commands.
- Firebase native apps were created on 2026-06-05. `firebase apps:list --project ryvro-shift-planner --json` confirmed `Ryvro iOS` app ID `1:1002666052675:ios:bf72c1cc611308a76b98f6`, platform `IOS`, namespace `com.ryvro.shiftplanner`, state `ACTIVE`; and `Ryvro Android` app ID `1:1002666052675:android:735fd0ef9443ddf76b98f6`, platform `ANDROID`, namespace `com.ryvro.shiftplanner`, state `ACTIVE`.
- Fresh native Firebase config files were downloaded on 2026-06-05 to ignored root paths only: `./GoogleService-Info.plist` and `./google-services.json`. Metadata-only local verification confirmed both files target project ID `ryvro-shift-planner` and `com.ryvro.shiftplanner`; file contents were not printed or committed.
- Google Cloud credentials page check on 2026-06-06 for project `ryvro-shift-planner` initially showed Firebase-created API keys but no OAuth clients. Google Auth Platform was then created with app name `Ryvro Shift Planner`, support email `seiduilyasu94@gmail.com`, audience `External`, and developer contact `seiduilyasu94@gmail.com` after the owner accepted the Google API Services User Data Policy.
- OAuth clients were created on 2026-06-06 in the Ryvro Google Cloud project. Web client ID: `1002666052675-p31u9msgqrtmg1sgcl1vv5mu5fijo98o.apps.googleusercontent.com`; iOS client ID: `1002666052675-le1ivq51bi0dv77pt24kvtir90qli2io.apps.googleusercontent.com`; Android client ID: `1002666052675-94b6mo0a78vr4kjb8ql8rorpe9rrovch.apps.googleusercontent.com`. The Web client secret was shown by Google Cloud but was not recorded in the repo, docs, chat, or tests.
- EAS production Android credentials check on 2026-06-06 displayed the EAS-managed keystore fingerprints used for the Android OAuth client and Firebase Android app: SHA-1 `D5:BD:0B:C7:43:DB:4A:DE:B3:4A:86:16:A5:74:23:F8:86:74:9E:EF` and SHA-256 `07:31:46:00:75:14:2E:55:32:DF:34:76:5F:B2:83:A1:5C:E9:EB:CF:EB:03:74:9B:C0:1A:D2:6E:ED:C7:D2:9C`.
- Firebase Android app signing fingerprints were registered on 2026-06-06 with `firebase apps:android:sha:create` for both SHA-1 and SHA-256. Fresh ignored root config files were then re-downloaded. Metadata-only verification confirmed the iOS config includes `CLIENT_ID` `1002666052675-le1ivq51bi0dv77pt24kvtir90qli2io.apps.googleusercontent.com` and `REVERSED_CLIENT_ID` `com.googleusercontent.apps.1002666052675-le1ivq51bi0dv77pt24kvtir90qli2io`; the Android config includes OAuth client type `1` with `1002666052675-94b6mo0a78vr4kjb8ql8rorpe9rrovch.apps.googleusercontent.com` and type `3` with `1002666052675-p31u9msgqrtmg1sgcl1vv5mu5fijo98o.apps.googleusercontent.com`.
- If Google Analytics terms or other legal terms appear, the owner must review and accept them directly.
- Record only the Firebase project ID, visible display name, Analytics property name if enabled, and owner account used.
- Do not record web API keys or full app config contents in the evidence log.

## Native App Config Files

Fresh Firebase apps for the final bundle/package were created and verified.

- iOS app nickname: `Ryvro iOS`
- iOS bundle ID: `com.ryvro.shiftplanner`
- iOS app ID: `1:1002666052675:ios:bf72c1cc611308a76b98f6`
- Android app nickname: `Ryvro Android`
- Android package name: `com.ryvro.shiftplanner`
- Android app ID: `1:1002666052675:android:735fd0ef9443ddf76b98f6`
- The fresh iOS file was downloaded as `GoogleService-Info.plist`.
- The fresh Android file was downloaded as `google-services.json`.
- Both files are placed at the repo root only: `./GoogleService-Info.plist` and `./google-services.json`.
- Both files are ignored by Git.
- The current ignored root files were refreshed after OAuth client creation and Android SHA registration on 2026-06-06.
- The iOS root file metadata includes the Ryvro iOS OAuth client ID and reversed client ID.
- The Android root file metadata includes the Ryvro Android OAuth client ID and Ryvro Web OAuth client ID.
- Do not point production `.env` at generated `ios/` or `android/` service-file paths.
- Do not use tracked local placeholders under `config/firebase/` for production builds.

Record:

- Firebase iOS app ID or nickname
- Firebase Android app ID or nickname
- Root-level file paths only
- Confirmation that each file targets `com.ryvro.shiftplanner`

## OAuth And Auth Setup

Create or confirm OAuth clients in the same Ryvro Google Cloud/Firebase project.

- Web OAuth client for Firebase/Auth and Expo runtime values: `1002666052675-p31u9msgqrtmg1sgcl1vv5mu5fijo98o.apps.googleusercontent.com`
- iOS OAuth client for `com.ryvro.shiftplanner`: `1002666052675-le1ivq51bi0dv77pt24kvtir90qli2io.apps.googleusercontent.com`
- Android OAuth client for `com.ryvro.shiftplanner`: `1002666052675-94b6mo0a78vr4kjb8ql8rorpe9rrovch.apps.googleusercontent.com`
- Android release signing SHA-1 and SHA-256 fingerprints are recorded here as non-secret launch evidence.
- Android release signing SHA-1 `D5:BD:0B:C7:43:DB:4A:DE:B3:4A:86:16:A5:74:23:F8:86:74:9E:EF`
- Android release signing SHA-256 `07:31:46:00:75:14:2E:55:32:DF:34:76:5F:B2:83:A1:5C:E9:EB:CF:EB:03:74:9B:C0:1A:D2:6E:ED:C7:D2:9C`
- Web client secret was not recorded.
- Firebase Auth was enabled on 2026-06-06 in the logged-in Firebase Console.
- Firebase Auth authorized domain: `getryvro.com`
- Metadata-only Identity Toolkit Admin API verification on 2026-06-06 confirmed `authorizedDomains` contains `localhost`, `ryvro-shift-planner.firebaseapp.com`, `ryvro-shift-planner.web.app`, and `getryvro.com`.
- Firebase Auth email templates are still pending. The same metadata-only verification showed default sender and reply-to values, so do not mark template evidence complete yet.
- Required Firebase Auth sender name: `Ryvro Support`
- Required Firebase Auth reply-to email: `support@getryvro.com`
- Required Firebase Auth action domain and continue URLs on `https://getryvro.com`

Record only:

- OAuth client IDs
- Android SHA-1/SHA-256 fingerprint notes
- Authorized-domain confirmation
- Firebase Auth template completion note

## Backend Deploy

Deploy functions to the Ryvro Firebase project.

Current state updated on 2026-06-06:

- The owner reported Firebase billing is now on pay-as-you-go, and Firebase Secret Manager is reachable.
- OpenAI Platform project `Ryvro Project` now has a new key for the Firebase backend. The key value was copied without printing it and stored as Firebase Secret Manager `OPENAI_API_KEY` version `1` for project `ryvro-shift-planner`.
- `ANTHROPIC_API_KEY` was added as a non-production placeholder Secret Manager value only because Firebase Functions requires every declared secret name to exist while it analyzes the codebase. This is not launch evidence for Claude-backed analytics.
- The codebase-qualified Firebase deploy filter is required for this project:

```bash
firebase deploy --only functions:ryvro-brain:ryvroBrain,functions:ryvro-brain:parseShiftScheduleDescription --project ryvro-shift-planner
```

- The first deploy attempt failed because the default compute service account was missing Cloud Build builder permissions. The documented fix was applied by granting `roles/cloudbuild.builds.builder` to `1002666052675-compute@developer.gserviceaccount.com`.
- The rerun successfully updated both `ryvro-brain:ryvroBrain(us-central1)` and `ryvro-brain:parseShiftScheduleDescription(us-central1)`.
- Firebase returned Cloud Run URLs `https://ryvrobrain-olx76zaeka-uc.a.run.app` and `https://parseshiftscheduledescription-olx76zaeka-uc.a.run.app`.
- Standard Firebase HTTPS URLs remain the URLs production clients should use.
- Both Cloud Run services initially returned public HTTP `403`, so `roles/run.invoker` was granted to `allUsers` on only `ryvrobrain` and `parseshiftscheduledescription`.
- A Firebase Functions artifact cleanup policy was set for `us-central1` to delete images older than 1 day.
- OpenAI provider calls currently return `429` quota exceeded. Fix OpenAI project billing or quota before marking AI voice and non-heuristic parser behavior launch-ready.

Required function URLs:

```text
RYVRO_BRAIN_URL=https://us-central1-ryvro-shift-planner.cloudfunctions.net/ryvroBrain
SHIFT_SCHEDULE_PARSER_URL=https://us-central1-ryvro-shift-planner.cloudfunctions.net/parseShiftScheduleDescription
```

Do not configure `ellieBrain` for new Ryvro production builds.

Record:

- Firebase deploy command output summary
- `ryvroBrain` HTTPS URL
- `parseShiftScheduleDescription` HTTPS URL
- Confirmation both URLs contain the Ryvro Firebase project ID

## Backend Smoke Tests

Run smoke tests after deploy and after production `.env` is filled.

```bash
curl -i -X POST "$RYVRO_BRAIN_URL" \
  -H "Content-Type: application/json" \
  -d "{}"

curl -i -X POST "$SHIFT_SCHEDULE_PARSER_URL" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"I work 2 days, 2 nights, then 4 off.","timezone":"UTC","locale":"en-US","today":"2026-05-31"}'
```

Expected launch evidence:

- `ryvroBrain`: `400` for the intentionally empty body proves reachability; `200` with a valid body also passes.
- `parseShiftScheduleDescription`: must return `200` with a draft schedule for the minimal schedule prompt.
- `404`, missing secret, wrong project, provider failure, auth failure, network failure, or parser `400` for the valid prompt is not launch-ready.
- Current smoke result on 2026-06-06: `ryvroBrain` returned HTTP `400` with non-secret error code `invalid_request` for the intentionally empty body after public invoker access was fixed.
- Current smoke result on 2026-06-06: `parseShiftScheduleDescription` returned HTTP `200` with a draft schedule for the minimal 2 days, 2 nights, 4 off prompt, but warned that deterministic fallback was used because AI parsing was unavailable.
- Current provider blocker on 2026-06-06: a non-heuristic parser prompt returned HTTP `502` with OpenAI `429` quota exceeded. Treat provider-backed voice and AI parsing as not launch-ready until OpenAI quota or billing is fixed and a non-heuristic parser smoke passes without quota error.

Record:

- HTTP status
- Timestamp
- Function URL used
- Short non-secret response summary
- Any Firebase or provider error text without secrets

## Production Env And EAS Secrets

Fill `.env` from `.env.production.example` only after Firebase, OAuth, legal URLs, backend URLs, and RevenueCat keys are ready.

The committed `.env.production.example` now contains the non-secret Ryvro project IDs and deployed Firebase Functions URLs. Keep actual Firebase API keys, Firebase app IDs, RevenueCat SDK keys, and any provider keys out of Git.

Run:

```bash
npm run release:native:check
npm run release:env:check
```

Push secrets only after both checks pass:

```bash
npm run release:env:push
```

Record:

- `npm run release:native:check` pass output
- `npm run release:env:check` pass output
- EAS production environment push confirmation
- EAS project ID `b306643e-1688-448e-8acd-f72bf74312c3`

## Evidence Log Updates

Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` only with non-secret evidence.

Mark rows `Passed` only when the evidence is complete:

- `Firebase project`
- `Firebase iOS app`
- `Firebase Android app`
- `OAuth clients`
- `Firebase Auth domains`
- `Firebase Auth email templates`
- `Backend deploy - ryvroBrain`
- `Backend smoke - ryvroBrain`
- `Backend deploy - parser`
- `Shift parser smoke`
- `Production env preflight`
- `EAS production environment push`

Keep rows as `Pending owner evidence` or `Failed - needs fix` until the matching production evidence exists.
