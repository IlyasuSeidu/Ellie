# AI Intelligence - Ellie Web Admin

Static web dashboard for the Ellie analytics intelligence backend.
It is intentionally separate from the iOS/Android miner app.

The dashboard follows `ELLIE_ANALYTICS_AI_INTELLIGENCE_STRATEGY.md` by focusing on:

- Mission Control daily health metrics
- AI Decision Feed for human-reviewed recommendations
- Onboarding, voice, revenue, offline, and quality detail views
- Aggregate callable data only, not direct Firestore analytics reads

## Local Development

### 1. Create local Firebase config

```bash
cp web-admin/analytics-intelligence/firebase-config.example.js \
  web-admin/analytics-intelligence/firebase-config.local.js
```

Edit `web-admin/analytics-intelligence/firebase-config.local.js` and fill in the Firebase web config values from Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup.

`firebase-config.local.js` is gitignored. Firebase web config values are public identifiers, not private secrets, but local project config should not be committed.

### 2. Run locally

```bash
npx serve web-admin/analytics-intelligence
# or:
npm run admin:web
```

Open the local URL printed by `serve`, usually:

```text
http://localhost:3000
```

Sign in with the Google account whose Firebase Auth UID is in `ANALYTICS_ADMIN_UIDS`.

## Firebase Hosting Deploy

```bash
firebase deploy --config firebase.json --only hosting
# or:
npm run firebase:deploy:hosting
```

When deployed to Firebase Hosting, the page loads public Firebase config from:

```text
/__/firebase/init.json
```

Local preview falls back to `firebase-config.local.js` because normal static servers do not expose Firebase Hosting reserved URLs.

## Grant Admin Access

The backend uses a Firebase Functions v2 string parameter:

```ts
ANALYTICS_ADMIN_UIDS;
```

Set it to a comma-separated list of Firebase Auth UIDs when deploying functions. Example:

```bash
ANALYTICS_ADMIN_UIDS="UID1,UID2" firebase deploy --config firebase.json --only functions
```

In Firebase Console, the same value can be managed under Functions parameters for `ANALYTICS_ADMIN_UIDS`.

To find a UID:

```text
Firebase Console -> Authentication -> Users -> UID column
```

## Backend Requirements

Cloud Functions must be deployed before the dashboard can load data.

Build functions:

```bash
npm run backend:build
```

Deploy functions:

```bash
npm run firebase:deploy:functions
```

Function deployment currently requires the `ANTHROPIC_API_KEY` secret in Firebase Secret Manager. Without it, Claude analysis falls back to deterministic analytics summaries and the dashboard shows a fallback warning.

## Callable Functions Consumed

| Function                        | Description                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `getAnalyticsDashboardSnapshot` | Returns summaries, analyses, open decisions, realtime rows                         |
| `rebuildAnalyticsDay`           | Rebuilds summary, rule-based decisions, and fallback/Claude intelligence for a day |
| `generateDailyAiIntelligence`   | Runs Claude intelligence for an existing day summary                               |
| `markAiDecisionReviewed`        | Marks a decision as `accepted`, `reviewed`, or `dismissed`                         |

## Security Notes

- Do not expose this dashboard inside the native app.
- Do not read analytics Firestore collections directly from the web page.
- Admin authorization is enforced server-side by callable functions.
- Keep analytics aggregate/anonymized in line with the strategy guardrails.
- Use Firebase Hosting headers in `firebase.json` for CSP and related browser protections.
