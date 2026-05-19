# Claude Code Prompt: Move Analytics Intelligence to a Web Admin App

You are working in `/Users/Shared/Ellie`.

The previous implementation incorrectly put the analytics / AI intelligence admin dashboard inside the React Native miner app. That is wrong. This must be an admin-only web page/app, not a screen inside the iOS/Android app.

Your job is to correct that end to end.

## Non-Negotiable Outcome

Build the analytics intelligence UI as a separate web admin surface and remove the mobile-app admin screen entry.

Do not leave any path where normal miner app users see an `AI Intelligence` or analytics admin entry in the native app.

## Current Mistake to Undo

Remove the mobile UI changes that were added for this admin dashboard:

- Remove `AnalyticsIntelligence` from `src/navigation/AppNavigator.tsx`.
- Remove any `AnalyticsIntelligenceScreen` import and route registration.
- Restore `initialRouteName={initialRoute}`. Do not force dev builds to boot into the admin dashboard.
- Remove the `AI Intelligence` row/button from `src/screens/main/ProfileScreen.tsx`.
- Delete the React Native admin screen and test if they only exist for this admin dashboard:
  - `src/screens/main/AnalyticsIntelligenceScreen.tsx`
  - `src/screens/main/__tests__/AnalyticsIntelligenceScreen.test.tsx`
- Do not remove unrelated profile/settings/subscription/onboarding changes.
- Do not revert unrelated work in the dirty tree.

If shared analytics types or service code are useful for the web app, move/copy them into the web admin app instead of importing React Native-only modules.

## Correct Architecture

Create a small web admin app/page in the repo.

Preferred implementation:

```text
web-admin/analytics-intelligence/
  index.html
  styles.css
  app.js
  firebase-config.example.js
  README.md
```

Use plain HTML/CSS/JavaScript unless there is already a web app framework in this repo. Do not add a large React/Vite/Next dependency unless you have a concrete reason and keep scripts working.

The page should be Firebase-hosting friendly and runnable locally as a static page.

## Firebase Requirements

The backend already exists as Firebase callable functions:

- `getAnalyticsDashboardSnapshot`
- `rebuildAnalyticsDay`
- `generateDailyAiIntelligence`
- `markAiDecisionReviewed`

Rules:

- Do not read Firestore analytics collections directly from the web page.
- Use Firebase Auth so callable requests include the signed-in admin UID.
- Use Firebase callable functions from the Firebase Web SDK.
- The server remains the source of truth for admin access through `ANALYTICS_ADMIN_UIDS`.
- If a callable returns `permission-denied`, show a restricted-access UI.
- If a callable returns `unauthenticated`, show the sign-in UI.
- If the network fails, show a clear offline/error state and retry action.

Use Firebase Hosting auto config if possible:

```html
<script type="module" src="/__/firebase/11.10.0/firebase-app.js"></script>
<script type="module" src="/__/firebase/11.10.0/firebase-auth.js"></script>
<script type="module" src="/__/firebase/11.10.0/firebase-functions.js"></script>
<script type="module" src="/__/firebase/init.js"></script>
```

If that is not practical for local development, create `firebase-config.example.js` and document creating an ignored `firebase-config.local.js` with the public Firebase config values.

Do not commit real private secrets. Firebase web config values are public identifiers, but still keep local config out of source if the repo pattern expects env/local files.

## Hosting Configuration

Add Firebase Hosting config to `firebase.json` without breaking the existing functions/firestore config.

Expected shape:

```json
{
  "hosting": {
    "public": "web-admin/analytics-intelligence",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

Only add this if it does not conflict with an existing hosting setup. If there is already hosting config, integrate cleanly.

Add root package scripts if useful:

```json
"admin:web": "npx serve web-admin/analytics-intelligence",
"firebase:deploy:hosting": "firebase deploy --config firebase.json --only hosting"
```

If adding `serve` as a dependency is unnecessary, prefer documenting:

```bash
npx serve web-admin/analytics-intelligence
```

## Backend Response Contracts

### `getAnalyticsDashboardSnapshot({ summaryLimit?: number })`

Returns:

```ts
{
  ok: true;
  summaries: DailyAnalyticsSummary[];
  analyses: ClaudeDailyIntelligenceAnalysis[];
  decisions: AiDecisionCandidate[];
  realtime: Record<string, unknown>[];
}
```

### `rebuildAnalyticsDay({ dayKey: string })`

Returns:

```ts
{
  ok: true;
  summary: DailyAnalyticsSummary;
  decisionCount: number;
  intelligence: ClaudeDailyIntelligenceAnalysis;
  claudeDecisionCount: number;
}
```

### `generateDailyAiIntelligence({ dayKey: string })`

Returns:

```ts
{
  ok: true;
  intelligence: ClaudeDailyIntelligenceAnalysis;
  claudeDecisionCount: number;
}
```

### `markAiDecisionReviewed({ decisionId, status, note? })`

`status` must be one of:

```ts
'reviewed' | 'accepted' | 'dismissed';
```

## Data Shapes

```ts
type AiDecisionCandidate = {
  id: string;
  dayKey: string;
  type:
    | 'engineering_alert'
    | 'onboarding_optimization'
    | 'offline_gap'
    | 'revenue_optimization'
    | 'voice_quality';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  observation: string;
  recommendedAction: string;
  evidence: Record<string, string | number | boolean | null | (string | number | boolean | null)[]>;
  status: 'open';
  createdAtMs: number;
  schemaVersion: 1;
};

type ClaudeDailyIntelligenceAnalysis = {
  id: string;
  dayKey: string;
  generatedAtMs: number;
  model: string;
  promptVersion: number;
  sourceSummaryId: string;
  inputEventCount: number;
  status: 'completed' | 'fallback';
  emergencies: {
    metric: string;
    currentValue: string | number | boolean | null;
    lastWeekValue?: string | number | boolean | null;
    change?: string | number | boolean | null;
    recommendedAction: string;
  }[];
  opportunities: {
    observation: string;
    recommendation: string;
    estimatedImpact: string;
  }[];
  churnAlerts: {
    genuineCount: number;
    fifoCaution: string;
  };
  engineeringAlerts: {
    area: string;
    issue: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
  abTestRecommendation: {
    hypothesis: string;
    control: string;
    treatment: string;
    primaryMetric: string;
  } | null;
  executiveSummary: string;
  rawResponseText?: string;
  responseId?: string;
  stopReason?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  errorMessage?: string;
  schemaVersion: 1;
};

type DailyAnalyticsSummary = {
  id: string;
  dayKey: string;
  generatedAtMs: number;
  eventCount: number;
  uniqueActorCount: number;
  countsByCategory: Record<string, number>;
  countsByEvent: Record<string, number>;
  countsByPlatform: Record<string, number>;
  onboarding: {
    started: number;
    completed: number;
    conversionRate: number | null;
    stepViews: Record<string, number>;
    stepCompletions: Record<string, number>;
    dropOffs: { step: string; views: number; completions: number; dropOffRate: number }[];
  };
  voice: {
    sessionsStarted: number;
    succeeded: number;
    failed: number;
    successRate: number | null;
    errorRate: number | null;
    avgLatencyMs: number | null;
    topIntents: { intent: string; count: number }[];
    toolExecutions: Record<
      string,
      { attempts: number; succeeded: number; avgLatencyMs: number | null }
    >;
  };
  revenue: {
    paywallViews: number;
    ctaClicks: number;
    subscribeTaps: number;
    purchases: number;
    trials: number;
    ctaToPurchaseRate: number | null;
  };
  offline: {
    handledAnswers: number;
    unsupportedQuestions: number;
    topUnsupportedIntents: { intent: string; count: number }[];
  };
  quality: {
    errorEvents: number;
    apiErrorRate: number | null;
    avgColdStartMs: number | null;
  };
};
```

## Web UI Requirements

This is an admin/founder workbench. It should feel operational, serious, compact, and readable. It is not miner-facing marketing UI.

Include these sections:

1. Sign-in / identity bar
   - Google sign-in button.
   - Show signed-in email/UID.
   - Sign out button.

2. Header
   - Title: `AI Intelligence`
   - Subtitle: latest report date and model/status.
   - Refresh button.

3. Executive Summary
   - Show latest `analysis.executiveSummary`.
   - Show `completed` vs `fallback` status.
   - If fallback, show warning copy using `errorMessage`.

4. Critical Signals
   - DAU / unique actors
   - Event count
   - Onboarding conversion
   - Voice success rate
   - Offline unsupported questions
   - Paywall CTA to purchase rate
   - Format null percentages as `-` or `No data`.

5. AI Decision Queue
   - List open decisions ordered by severity.
   - Severity styles:
     - critical: red / urgent
     - high: amber
     - medium: blue/slate
     - low: muted
   - Each item shows title, type, severity, observation, recommended action, and evidence preview.
   - Actions: Accept, Mark reviewed, Dismiss.
   - Each action calls `markAiDecisionReviewed`.
   - Remove/update the item only after success. On failure, keep it and show an inline error.

6. Onboarding / Voice / Revenue / Offline Cards
   - Worst onboarding drop-offs
   - Top voice intents
   - Voice failures/error rate
   - Revenue funnel counts
   - Unsupported offline intents

7. Admin Actions
   - Day key input in `YYYY-MM-DD`.
   - Button: `Rebuild analytics day`.
   - Button: `Regenerate Claude analysis`.
   - Button: `Rebuild yesterday` when useful.
   - Loading/progress state.
   - Success/error banner.

8. Restricted State
   - Title: `Analytics access restricted`.
   - Copy: `Your Firebase account is not configured as an analytics admin.`
   - Do not crash.

9. Empty State
   - Explain that analytics has not been generated yet.
   - Offer `Rebuild yesterday` action.

10. Offline/Error State

- Show retry.
- Network copy: `Analytics requires a network connection. Existing app features still work offline.`

## Visual Direction

- Desktop-first, responsive down to mobile browser width.
- Use Ellie’s dark industrial tone, but make it a web dashboard, not a React Native screen.
- Avoid generic purple gradients.
- Use strong hierarchy:
  - top summary first
  - urgent decisions next
  - metrics below
  - admin actions last
- Add subtle visual structure: cards, status chips, severity borders, compact tables/lists.
- Keep the page fast and dependency-light.

## Local Development README

Add `web-admin/analytics-intelligence/README.md` explaining:

1. How to configure Firebase web config for local preview.
2. How to run locally, for example:

```bash
npx serve web-admin/analytics-intelligence
```

3. How to deploy hosting:

```bash
firebase deploy --config firebase.json --only hosting
```

4. How to grant access:

```bash
firebase functions:config:get
# or set env/params according to the current functions setup
```

Then explain that `ANALYTICS_ADMIN_UIDS` must include the Firebase Auth UID of the admin account and functions must be deployed.

Also document that the Cloud Functions deployment currently requires `ANTHROPIC_API_KEY` in Firebase Secret Manager if deploying functions.

## Testing / Validation

Run what is appropriate after changes:

```bash
npm run type-check
npm run lint
npm test -- --runInBand --silent src/navigation/__tests__/AppNavigator.test.tsx src/screens/main/__tests__/ProfileScreen.test.tsx
npm run backend:build
```

If static web files are plain JS/CSS/HTML and not covered by TypeScript, manually inspect the files for syntax errors and, if possible, run a local static server and open the page.

## Important Constraints

- Do not deploy.
- Do not modify backend Cloud Functions unless the callable contract is impossible to consume.
- Do not add analytics Firestore reads to the frontend.
- Do not keep the admin dashboard inside the native app.
- Do not expose the admin page as a normal user route in the iOS/Android app.
- Do not revert unrelated existing dirty files.
- Keep code production-ready, readable, and maintainable.

## Deliverable

When finished, report:

- Files changed.
- Confirmation that the native app no longer exposes the admin UI.
- How to open the web admin UI locally.
- What Firebase config/admin UID/deploy steps are still required.
- Validation commands and results.
