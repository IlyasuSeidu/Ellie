# Ryvro Firebase, OAuth, And Backend Handoff

Last updated: 2026-06-05

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

- Create or rename the production Firebase project to a Ryvro-visible name.
- If Google Analytics terms or other legal terms appear, the owner must review and accept them directly.
- Record only the Firebase project ID, visible display name, Analytics property name if enabled, and owner account used.
- Do not record web API keys or full app config contents in the evidence log.

## Native App Config Files

Add fresh Firebase apps for the final bundle/package.

- iOS app nickname: `Ryvro iOS`
- iOS bundle ID: `com.ryvro.shiftplanner`
- Android app nickname: `Ryvro Android`
- Android package name: `com.ryvro.shiftplanner`
- Download the fresh iOS file as `GoogleService-Info.plist`.
- Download the fresh Android file as `google-services.json`.
- Place both files at the repo root only: `./GoogleService-Info.plist` and `./google-services.json`.
- Keep both files ignored by Git.
- Do not point production `.env` at generated `ios/` or `android/` service-file paths.
- Do not use tracked local placeholders under `config/firebase/` for production builds.

Record:

- Firebase iOS app ID or nickname
- Firebase Android app ID or nickname
- Root-level file paths only
- Confirmation that each file targets `com.ryvro.shiftplanner`

## OAuth And Auth Setup

Create or confirm OAuth clients in the same Ryvro Google Cloud/Firebase project.

- Web OAuth client for Firebase/Auth and Expo runtime values
- iOS OAuth client for `com.ryvro.shiftplanner`
- Android OAuth client for `com.ryvro.shiftplanner`
- Android release signing SHA-1 and SHA-256 fingerprints from the signing key used for the tested build
- Firebase Auth authorized domain: `getryvro.com`
- Firebase Auth sender name: `Ryvro Support`
- Firebase Auth reply-to email: `support@getryvro.com`
- Firebase Auth action domain and continue URLs on `https://getryvro.com`

Record only:

- OAuth client IDs
- Android SHA-1/SHA-256 fingerprint notes
- Authorized-domain confirmation
- Firebase Auth template completion note

## Backend Deploy

Deploy functions to the Ryvro Firebase project.

```bash
firebase use <ryvro-project-id>
firebase deploy --only functions
```

Required function URLs:

```text
RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain
SHIFT_SCHEDULE_PARSER_URL=https://<region>-<project-id>.cloudfunctions.net/parseShiftScheduleDescription
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

Record:

- HTTP status
- Timestamp
- Function URL used
- Short non-secret response summary
- Any Firebase or provider error text without secrets

## Production Env And EAS Secrets

Fill `.env` from `.env.production.example` only after Firebase, OAuth, legal URLs, backend URLs, and RevenueCat keys are ready.

Run:

```bash
npm run release:native:check
npm run release:env:check
```

Push secrets only after both checks pass:

```bash
eas secret:push --scope project --env-file .env
```

Record:

- `npm run release:native:check` pass output
- `npm run release:env:check` pass output
- EAS secret push confirmation
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
- `EAS secret push`

Keep rows as `Pending owner evidence` or `Failed - needs fix` until the matching production evidence exists.
