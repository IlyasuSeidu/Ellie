# Ellie Analytics & AI Intelligence Strategy

> **Purpose:** Define every data point Ellie collects, why it matters, how it is structured, and how Claude Sonnet 4.6 uses it to make decisions that grow the app to levels others cannot imagine.
>
> **Philosophy:** Track what predicts growth — not what feels interesting. Every event must answer a question. Every question must drive a decision. Every decision must be testable.

---

## Table of Contents

1. [Event Taxonomy & Naming Conventions](#1-event-taxonomy--naming-conventions)
2. [Universal User Properties](#2-universal-user-properties)
3. [Screen-by-Screen Analytics](#3-screen-by-screen-analytics)
4. [Feature-Level Events](#4-feature-level-events)
5. [Onboarding Funnel Deep-Tracking](#5-onboarding-funnel-deep-tracking)
6. [Voice Assistant Analytics](#6-voice-assistant-analytics)
7. [Retention & Engagement Metrics](#7-retention--engagement-metrics)
8. [Revenue & Monetization Metrics](#8-revenue--monetization-metrics)
9. [Performance & Quality Analytics](#9-performance--quality-analytics)
10. [Future Features Pre-Instrumentation](#10-future-features-pre-instrumentation)
11. [Claude Sonnet 4.6 AI Decision Engine](#11-claude-sonnet-46-ai-decision-engine)
12. [Analytics Dashboard Architecture](#12-analytics-dashboard-architecture)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Appendix A: AnalyticsService Skeleton](#appendix-a-analyticsservice-implementation-skeleton)
15. [Appendix B: The 15 Metrics That Matter Most](#appendix-b-the-15-metrics-that-matter-most-for-ellie)

---

## 1. Event Taxonomy & Naming Conventions

### Naming Standard

All events use **PascalCase Object + PastTense Action**:

```
Format:  [Object][Action]
Good:    OnboardingStarted, ShiftPatternSelected, VoiceQueryCompleted
Bad:     start_onboarding, selectPattern, voiceQuery
```

### Property Standards

Every single event carries these base properties automatically:

```typescript
interface BaseEventProperties {
  // Identity
  userId: string; // Firebase UID
  sessionId: string; // UUID per app open
  deviceId: string; // Anonymous device fingerprint

  // Timing
  timestamp: number; // Unix ms
  localTime: string; // HH:MM (user local — vital for shift workers)
  dayOfWeek: string; // Monday–Sunday
  isWeekend: boolean;

  // App State
  appVersion: string; // e.g. "1.2.0"
  buildNumber: number;
  platform: 'ios' | 'android';
  osVersion: string; // iOS 18.2, Android 14

  // User Context (non-PII)
  rosterType: 'rotating' | 'fifo' | 'none'; // none = not yet onboarded
  shiftSystem: '2-shift' | '3-shift' | 'none';
  shiftPattern: string; // e.g. "7-7-7", "FIFO_14-14"
  currentShiftPhase: string; // 'day' | 'night' | 'off' | 'work_block' | 'rest_block'
  country: string; // ISO country code
  language: string; // BCP-47 language tag
  isOnboarded: boolean;
  isFirstSession: boolean;

  // Session Context
  sessionNumber: number; // Nth session ever
  daysSinceInstall: number;
  daysSinceLastOpen: number; // Key churn signal
  sessionDuration: number; // Seconds (added at session end)
}
```

### Event Category Prefixes

Organize events by prefix so filtering is instant:

| Prefix         | Category           | Example                          |
| -------------- | ------------------ | -------------------------------- |
| `Session`      | App open/close     | `SessionStarted`, `SessionEnded` |
| `Screen`       | Navigation         | `ScreenViewed`, `ScreenExited`   |
| `Onboarding`   | Onboarding flow    | `OnboardingStepCompleted`        |
| `Voice`        | Voice assistant    | `VoiceQueryStarted`              |
| `Shift`        | Shift features     | `ShiftCalendarScrolled`          |
| `Profile`      | Profile actions    | `ProfileUpdated`                 |
| `Notification` | Push notifications | `NotificationTapped`             |
| `Error`        | Failures           | `ErrorEncountered`               |
| `Performance`  | Speed/crashes      | `PerformanceMeasured`            |
| `Revenue`      | Monetization       | `PremiumUpgradeInitiated`        |
| `AI`           | AI-driven actions  | `AIRecommendationShown`          |

---

## 2. Universal User Properties

These are set once on the user profile and updated when they change. They define _who_ the user is — not just _what_ they did.

```typescript
interface UserAnalyticsProfile {
  // Identity
  userId: string;
  installDate: string; // ISO date of first install
  firstSeenPlatform: 'ios' | 'android';

  // Demographics (from onboarding — no PII stored in analytics)
  occupation: string; // "Underground Miner", "Site Manager", etc.
  company: string; // Company name (hashed or anonymized)
  country: string; // Country code
  region: string; // State/province if provided
  language: string;

  // Shift Configuration (critical for Ellie — this IS the product)
  rosterType: 'rotating' | 'fifo';
  shiftSystem: '2-shift' | '3-shift';
  shiftPattern: string; // "7-7-7", "14-14", etc.
  isCustomPattern: boolean;
  cycleLengthDays: number; // Total days in one cycle
  workDaysPerCycle: number; // Work days in one cycle
  restDaysPerCycle: number;
  fifoWorkBlockDays?: number; // FIFO specific
  fifoRestBlockDays?: number;
  siteName?: string; // Mining site name (anonymized)

  // Engagement Tier (computed weekly by AI)
  engagementTier: 'power' | 'regular' | 'casual' | 'dormant';
  daysSinceLastActive: number;
  totalSessions: number;
  totalVoiceQueries: number;
  totalDaysTracked: number; // Days they've used the calendar

  // Acquisition
  acquisitionChannel: string; // 'organic', 'referral', 'paid', etc.
  acquisitionDate: string;
  referrerId?: string;

  // Feature Adoption Flags
  hasUsedVoiceAssistant: boolean;
  hasUsedWakeWord: boolean;
  hasCustomizedPattern: boolean;
  hasSetNotifications: boolean;
  hasViewedCalendar: boolean;
  hasSwitchedLanguage: boolean;
  onboardingCompletedDate?: string;
  onboardingDropOffScreen?: string; // If they never completed
}
```

---

## 3. Screen-by-Screen Analytics

### 3.1 App Lifecycle Events

```typescript
// Every app open
SessionStarted {
  ...BaseEventProperties,
  launchType: 'cold' | 'warm' | 'background_resume',
  openedFromNotification: boolean,
  notificationId?: string,
  openedFromDeepLink: boolean,
  deepLinkPath?: string,
  openedFromWakeWord: boolean,
  timeOfDayCategory: 'pre-dawn' | 'morning' | 'afternoon' | 'evening' | 'night',
  // ^^ Vital for mining workers whose "day" starts at 5am
}

// Every app close/background
SessionEnded {
  ...BaseEventProperties,
  sessionDurationSeconds: number,
  screensVisited: string[],        // Ordered list of screen names
  actionsCount: number,            // Taps/interactions in session
  voiceQueriesCount: number,
  lastScreenBeforeExit: string,
  exitType: 'background' | 'force_close' | 'crash',
}
```

### 3.2 Universal Screen Events (Every Screen)

Every screen fires this on entrance AND exit:

```typescript
ScreenViewed {
  ...BaseEventProperties,
  screenName: string,              // Exact screen name (e.g. "MainDashboardScreen")
  screenCategory: 'main' | 'onboarding' | 'modal' | 'settings',
  previousScreen: string,
  entryMethod: 'tap' | 'swipe' | 'back' | 'deep_link' | 'notification' | 'wake_word',
  loadTimeMs: number,              // Time from navigation trigger to render complete
  isFirstTimeViewingScreen: boolean,
}

ScreenExited {
  ...BaseEventProperties,
  screenName: string,
  timeOnScreenSeconds: number,
  exitMethod: 'back' | 'tab_switch' | 'modal_dismiss' | 'app_background',
  interactionCount: number,        // Taps while on screen
  scrollDepthPercent?: number,     // 0-100 for scrollable screens
  completedPrimaryAction: boolean, // Did they do the main thing on this screen?
}
```

### 3.3 MainDashboardScreen

The most important screen — users see this every time they open the app.

```typescript
DashboardViewed {
  ...BaseEventProperties,
  currentShiftType: string,        // 'day' | 'night' | 'off' | 'work_block' | 'rest_block'
  daysUntilShiftChange: number,    // How far into current phase
  monthDisplayed: string,          // "2026-03"
  statisticsVisible: boolean,
  upcomingShiftsVisible: boolean,
  calendarWeeksVisible: number,    // How many weeks fit on screen
  isShiftToday: boolean,
  shiftStartsInHours?: number,     // If shift starts today
}

DashboardCalendarScrolled {
  ...BaseEventProperties,
  direction: 'forward' | 'backward',
  monthsScrolled: number,
  newMonthDisplayed: string,
  scrollMethod: 'swipe' | 'arrow_tap',
}

DashboardCalendarDayTapped {
  ...BaseEventProperties,
  tappedDate: string,              // ISO date
  shiftTypeOnDate: string,
  daysFromToday: number,           // Negative = past, positive = future
  isCurrentShiftDay: boolean,
}

DashboardStatisticsTapped {
  ...BaseEventProperties,
  statisticType: 'work_days' | 'off_days' | 'night_shifts' | 'balance',
  value: number,
}

DashboardQuickActionTapped {
  ...BaseEventProperties,
  actionName: string,              // Name of quick action button
  resultScreen: string,            // Where it navigated to
}

DashboardVoiceButtonTapped {
  ...BaseEventProperties,
  // Leads into VoiceAssistant events
}

PersonalizedHeaderTapped {
  ...BaseEventProperties,
  hasAvatar: boolean,
  timeOfDay: string,
  greetingVariant: string,         // Which of the 16 greeting variants was shown
}
```

### 3.4 ProfileScreen

```typescript
ProfileViewed {
  ...BaseEventProperties,
  hasProfilePhoto: boolean,
  profileCompleteness: number,     // 0-100 percent complete
  daysAsUser: number,
}

ProfileEditInitiated {
  ...BaseEventProperties,
  fieldBeingEdited: string,        // 'name' | 'occupation' | 'company' | 'photo' | 'shift_settings'
}

ProfileEditCompleted {
  ...BaseEventProperties,
  fieldEdited: string,
  timeToCompleteSeconds: number,
  changedValue: boolean,           // Did they actually change something?
}

ProfilePhotoChanged {
  ...BaseEventProperties,
  source: 'camera' | 'gallery',
  hadPhotoBefore: boolean,
}

ShiftSettingsEditInitiated {
  // User opens the interactive ShiftSettingsPanel
  ...BaseEventProperties,
  currentPattern: string,
  currentRosterType: string,
}

ShiftSettingsChanged {
  ...BaseEventProperties,
  fieldChanged: 'roster_type' | 'shift_system' | 'pattern' | 'shift_times' | 'start_date',
  oldValue: string,
  newValue: string,
  rosterTypeSwitched: boolean,     // Critical: switching from rotating<->FIFO
}

ShiftSettingsSaved {
  ...BaseEventProperties,
  fieldsChanged: string[],
  totalChanges: number,
  timeSpentEditingSeconds: number,
}

ShiftSettingsCancelled {
  ...BaseEventProperties,
  hadUnsavedChanges: boolean,
}
```

### 3.5 VoiceAssistantModal

See Section 6 for comprehensive voice analytics.

---

## 4. Feature-Level Events

### 4.1 Calendar Feature

```typescript
CalendarMonthChanged {
  ...BaseEventProperties,
  direction: 'forward' | 'backward',
  newMonth: string,
  monthsFromToday: number,         // 0 = today's month, positive = future
  method: 'swipe' | 'button',
}

CalendarDaySelected {
  ...BaseEventProperties,
  date: string,                    // ISO date
  shiftType: string,
  isHoliday: boolean,
  daysFromToday: number,           // Negative = past, positive = future
  viewedShiftDetails: boolean,     // Did they interact after selecting?
}

CalendarLongPressDetected {
  ...BaseEventProperties,
  date: string,
  shiftType: string,
  // Signals desire for note-taking or reminder — future feature signal
}
```

### 4.2 Shift Pattern Feature

```typescript
ShiftPatternViewed {
  // When a pattern card is shown during onboarding
  ...BaseEventProperties,
  patternName: string,
  patternRank: number,             // Position in the swipe stack (1 = first shown)
  rosterType: string,
}

ShiftPatternSwiped {
  ...BaseEventProperties,
  patternName: string,
  direction: 'right_accepted' | 'left_rejected',
  swipeVelocity: number,           // px/s — higher velocity = more decisive
  timeViewedMs: number,            // How long they looked at this card
  patternRank: number,
}

ShiftPatternSelected {
  ...BaseEventProperties,
  patternName: string,
  selectionMethod: 'swipe_right' | 'tap_select',
  patternsViewedBeforeSelection: number,
  wasFirstChoice: boolean,
  isCustomPattern: boolean,
}

CustomPatternBuilt {
  ...BaseEventProperties,
  daysOn: number,
  daysOff: number,
  totalCycleDays: number,
  rosterType: string,
  sliderAdjustments: number,       // How many times they moved sliders
  timeSpentSeconds: number,
}
```

### 4.3 FIFO Roster Feature

```typescript
FIFORosterSelected {
  ...BaseEventProperties,
  previousRosterType: string,      // Were they on rotating before?
  fifoPattern: string,             // "14-14", "8-6", etc.
  isCustomFIFO: boolean,
}

FIFOBlockTracked {
  ...BaseEventProperties,
  blockType: 'work_block' | 'rest_block',
  daysInBlock: number,
  daysRemainingInBlock: number,
}

FIFOQueryMade {
  // Specifically a voice/app query about FIFO timing
  ...BaseEventProperties,
  queryType: 'next_work_block' | 'next_rest_block' | 'days_until_work' | 'days_until_rest' | 'current_block_info',
  daysUntilResult: number,         // The answer — powerful for aggregate patterns
}
```

### 4.4 Notifications Feature

```typescript
NotificationPermissionRequested {
  ...BaseEventProperties,
  context: string,                 // Which screen triggered the request
  triggerReason: string,
}

NotificationPermissionGranted {
  ...BaseEventProperties,
  platform: string,
  sessionNumberWhenGranted: number,
}

NotificationPermissionDenied {
  ...BaseEventProperties,
  platform: string,
}

NotificationScheduled {
  ...BaseEventProperties,
  notificationType: '24h_shift_reminder' | '4h_shift_reminder' | 'pattern_change' | 'holiday',
  scheduledForDate: string,
  shiftType: string,
}

NotificationReceived {
  ...BaseEventProperties,
  notificationId: string,
  notificationType: string,
  deliveryDelayMs: number,         // Scheduled vs actual delivery
  appState: 'foreground' | 'background' | 'killed',
}

NotificationTapped {
  ...BaseEventProperties,
  notificationId: string,
  notificationType: string,
  timeToTapMs: number,             // From delivery to tap
  navigatedTo: string,
}

NotificationDismissed {
  ...BaseEventProperties,
  notificationId: string,
  notificationType: string,
}
```

### 4.5 Language & Internationalization

```typescript
LanguageChanged {
  ...BaseEventProperties,
  fromLanguage: string,
  toLanguage: string,
  context: string,                 // Where they changed it
  sessionNumberWhenChanged: number,
}

LocaleDetectedOnInstall {
  ...BaseEventProperties,
  detectedLocale: string,
  deviceLocale: string,
  languageSupported: boolean,      // Is Ellie translated to their language?
  fallbackUsed: boolean,
}
```

### 4.6 Authentication Events

```typescript
SignUpInitiated {
  ...BaseEventProperties,
  method: 'email' | 'google' | 'apple',
  context: string,                 // Where signup was triggered
}

SignUpCompleted {
  ...BaseEventProperties,
  method: 'email' | 'google' | 'apple',
  timeToCompleteSeconds: number,
  hadOnboardingDataPreserved: boolean,
}

SignUpFailed {
  ...BaseEventProperties,
  method: string,
  errorCode: string,
}

SignInCompleted {
  ...BaseEventProperties,
  method: 'email' | 'google' | 'apple',
  wasReturningUser: boolean,
  daysSinceLastSignIn: number,
}

SignOutCompleted {
  ...BaseEventProperties,
  context: string,
  sessionDurationMinutes: number,
}
```

---

## 5. Onboarding Funnel Deep-Tracking

The onboarding flow is the most critical path in the app. A 1% improvement in onboarding completion rate is worth more than any other single optimization.

### 5.1 Funnel Events (Per Step)

```typescript
OnboardingStarted {
  ...BaseEventProperties,
  startTimestamp: number,
  isRestart: boolean,              // Did they abandon and come back?
  previousDropOffScreen?: string,
}

OnboardingStepViewed {
  ...BaseEventProperties,
  stepName: string,                // e.g. "PremiumShiftPatternScreen"
  stepNumber: number,              // 1–11
  totalSteps: number,
  timeFromPreviousStepSeconds: number,
  isRevisit: boolean,              // Navigating back?
}

OnboardingStepCompleted {
  ...BaseEventProperties,
  stepName: string,
  stepNumber: number,
  timeOnStepSeconds: number,
  inputMethod?: string,

  // PremiumIntroductionScreen
  nameEntered?: boolean,
  occupationEntered?: boolean,
  companyEntered?: boolean,
  countrySelected?: string,

  // PremiumShiftSystemScreen
  shiftSystemChosen?: string,      // '2-shift' | '3-shift'

  // PremiumRosterTypeScreen
  rosterTypeChosen?: string,       // 'rotating' | 'fifo'

  // PremiumShiftPatternScreen
  patternChosen?: string,
  patternsSwipedThrough?: number,

  // PremiumCustomPatternScreen
  customDaysOn?: number,
  customDaysOff?: number,

  // PremiumPhaseSelectorScreen / PremiumFIFOPhaseSelectorScreen
  phaseChosen?: string,

  // PremiumStartDateScreen
  startDateChosen?: string,
  daysFromTodaySelected?: number,  // How far ahead they picked
  usedCalendarPreview?: boolean,

  // PremiumShiftTimeInputScreen
  usedPreset?: boolean,
  presetChosen?: string,
  customTimeEntered?: boolean,
  dayShiftStart?: string,
  nightShiftStart?: string,
}

OnboardingStepAbandoned {
  ...BaseEventProperties,
  stepName: string,
  stepNumber: number,
  timeOnStepSeconds: number,
  exitMethod: 'app_background' | 'back_button' | 'force_close',
}

OnboardingCompleted {
  ...BaseEventProperties,
  totalTimeSeconds: number,
  totalStepsCompleted: number,
  rosterTypeChosen: string,
  shiftPatternChosen: string,
  shiftSystemChosen: string,
  isCustomPattern: boolean,
  countrySelected: string,
  occupationProvided: boolean,
  shiftTimesCustomized: boolean,
}

OnboardingAbandoned {
  ...BaseEventProperties,
  lastStepReached: string,
  lastStepNumber: number,
  totalTimeBeforeAbandonment: number,
  progressPercent: number,         // 0-100
}
```

### 5.2 Tinder Card Swipe Analytics (PremiumShiftPatternScreen)

```typescript
PatternCardDeckStarted {
  ...BaseEventProperties,
  totalCardsInDeck: number,
  rosterType: string,
  shiftSystem: string,
}

PatternCardSwiped {
  ...BaseEventProperties,
  cardIndex: number,               // Position in deck (0-based)
  patternName: string,
  swipeDirection: 'right' | 'left',
  swipeVelocity: number,           // px/s — high velocity = decisive user
  timeViewedMs: number,
  didHoverBeforeSwipe: boolean,
}

PatternCardDeckExhausted {
  // User swiped through ALL cards without selecting — high friction signal
  ...BaseEventProperties,
  totalCardsSwiped: number,
  timeSpentSeconds: number,
}
```

---

## 6. Voice Assistant Analytics

The voice assistant is Ellie's killer feature and primary differentiator. Track everything.

### 6.1 Wake Word Events

```typescript
WakeWordListeningStarted {
  ...BaseEventProperties,
  backend: 'porcupine' | 'open_wake_word',
  isScreenOn: boolean,
}

WakeWordDetected {
  ...BaseEventProperties,
  backend: string,
  timeListeningBeforeDetectionMs: number,
  confidenceScore?: number,
}

WakeWordFalsePositive {
  // User dismissed assistant immediately — was a false trigger
  ...BaseEventProperties,
  backend: string,
}

WakeWordListeningStopped {
  ...BaseEventProperties,
  reason: 'user_disabled' | 'app_background' | 'battery_low' | 'error',
  totalListeningMinutes: number,
}
```

### 6.2 Voice Session Events

```typescript
VoiceSessionStarted {
  ...BaseEventProperties,
  trigger: 'wake_word' | 'button_tap' | 'dashboard_button',
  currentShiftPhase: string,
  timeOfDay: string,
}

VoiceSpeechStarted {
  ...BaseEventProperties,
  speechRecognitionEngine: string,
}

VoiceSpeechCompleted {
  ...BaseEventProperties,
  transcriptionLengthWords: number,
  transcriptionLengthChars: number,
  silenceDetected: boolean,
  confidenceScore?: number,
}

VoiceQuerySentToEllieBrain {
  ...BaseEventProperties,
  queryCategory: 'shift_inquiry' | 'schedule_lookup' | 'countdown' | 'block_status' | 'other',
  queryIntentDetected: string,     // What the AI understood
  toolsInvoked: string[],          // Which shift tools were called
  requestLatencyMs: number,
}

VoiceQuerySucceeded {
  ...BaseEventProperties,
  toolsInvoked: string[],
  responseType: string,
  responseLatencyMs: number,
  totalVoiceSessionMs: number,
}

VoiceQueryFailed {
  ...BaseEventProperties,
  failureStage: 'speech_recognition' | 'api_call' | 'tool_execution' | 'tts',
  errorCode?: string,
  retried: boolean,
}

VoiceResponseDelivered {
  ...BaseEventProperties,
  ttsEngine: string,
  responseLengthWords: number,
  responseDurationMs: number,
}

VoiceSessionEnded {
  ...BaseEventProperties,
  totalQueriesInSession: number,
  successRate: number,             // 0.0–1.0
  totalSessionDurationMs: number,
  endTrigger: 'user_dismissed' | 'timeout' | 'error',
}
```

### 6.3 Tool-Specific Voice Events (Per Ellie Brain Tool)

```typescript
VoiceToolExecuted {
  ...BaseEventProperties,
  toolName:
    | 'get_shift_for_date'
    | 'get_shifts_in_range'
    | 'get_current_status'
    | 'get_statistics'
    | 'get_next_occurrence'
    | 'get_next_work_block'
    | 'get_next_rest_block'
    | 'days_until_work'
    | 'days_until_rest'
    | 'current_block_info',
  executionSucceeded: boolean,
  executionTimeMs: number,
  daysUntilResult?: number,        // For countdown tools — aggregate insight
}
```

---

## 7. Retention & Engagement Metrics

### 7.1 Session Metrics (Computed from Events)

| Metric                   | Definition                                   | Target | Why It Matters for Ellie                                                            |
| ------------------------ | -------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| **D1 Retention**         | % of users opening app the day after install | >40%   | If a worker doesn't check their schedule on day 2, they likely won't form the habit |
| **D7 Retention**         | % returning within 7 days                    | >30%   | One full shift cycle for most patterns — the critical inflection point              |
| **D14 Retention**        | % returning within 14 days                   | >25%   | Covers one full FIFO 14-14 cycle — natural check-in point                           |
| **D30 Retention**        | % returning within 30 days                   | >20%   | One full rotating cycle for most patterns                                           |
| **D60 Retention**        | % returning within 60 days                   | >15%   | Habit established across multiple cycles                                            |
| **Stickiness (DAU/MAU)** | Daily active / Monthly active                | >25%   | Mining workers need daily shift awareness                                           |
| **Session Frequency**    | Sessions per week                            | >4     | Workers check schedule before every shift                                           |
| **Session Length**       | Avg seconds per session                      | >90s   | Purposeful quick-reference use — sessions don't need to be long                     |
| **Voice Query Rate**     | Sessions with voice / total sessions         | >20%   | Voice is the differentiator — measure adoption ruthlessly                           |

### 7.2 Critical Retention Cohorts for Mining Workers

Mining workers have unique cycles that affect when they use the app. Standard retention metrics are misleading without this context:

```
Cohort A: 7-7-7 Pattern Workers
- 7 days day shift, 7 days night shift, 7 days off
- Expected to open app most on day 1 of each new phase (orientation)
- Standard D7 retention aligns with first phase change

Cohort B: FIFO 14-14 Workers
- Fly in, work 14 days, fly out, rest 14 days
- Open app heavily first 2 days of work block (site orientation)
- May disappear for 14 days during rest at home — this is NOT churn
- Standard D14 retention is misleading: a FIFO worker who "vanished" for 14 days
  is perfectly normal and loyal

Cohort C: FIFO 28-14 Workers
- Work 28 days, rest 14 days
- Long periods of high engagement followed by silence
- Must use "block retention" not time-based retention

FIFO-Specific Retention Metric (critical, unique to Ellie):
BlockRetention = % of users who open app in BOTH their work block AND their following rest block

This is the TRUE retention signal for FIFO workers. Implement this alongside standard cohorts.
```

### 7.3 Engagement Scoring

Compute weekly per user:

```typescript
interface EngagementScore {
  userId: string;
  weekStartDate: string;

  // Raw counts
  sessionsThisWeek: number;
  voiceQueriesThisWeek: number;
  calendarInteractionsThisWeek: number;
  profileUpdatesThisWeek: number;
  notificationsTappedThisWeek: number;

  // Computed score (0–100)
  engagementScore: number;

  // Tier assignment
  tier: 'power' | 'regular' | 'casual' | 'dormant';
  // Power:   score > 70 (multi-session days, voice queries, proactive use)
  // Regular: score 40–70 (daily or near-daily, some voice usage)
  // Casual:  score 15–40 (few times per week)
  // Dormant: score < 15 (at churn risk — but check FIFO rest block first)

  tierChangedFromLastWeek: boolean;
  tierChangeDirection: 'upgraded' | 'downgraded' | 'stable';
}
```

---

## 8. Revenue & Monetization Metrics

### 8.1 Revenue Events (Future-Proofed Now)

```typescript
PremiumUpgradeShown {
  ...BaseEventProperties,
  placement: string,               // Which screen/context triggered the upsell
  triggerEvent: string,            // What action led to this
  userEngagementTier: string,
  daysAsUser: number,
}

PremiumUpgradeInitiated {
  ...BaseEventProperties,
  plan: string,                    // 'monthly' | 'annual' | 'lifetime'
  price: number,
  currency: string,
  placement: string,
}

PremiumUpgradeCompleted {
  ...BaseEventProperties,
  plan: string,
  revenue: number,
  currency: string,
  paymentMethod: 'apple_pay' | 'google_pay' | 'card',
  daysAsUserBeforeConversion: number,
  sessionsBeforeConversion: number,
  voiceQueriesBeforeConversion: number,
}

PremiumUpgradeFailed {
  ...BaseEventProperties,
  plan: string,
  errorCode: string,
  wasRetried: boolean,
}

SubscriptionRenewed {
  ...BaseEventProperties,
  plan: string,
  renewalNumber: number,           // 1st renewal, 2nd, etc.
  revenue: number,
}

SubscriptionCancelled {
  ...BaseEventProperties,
  plan: string,
  daysHeld: number,
  renewalsSinceStart: number,
  cancellationReason?: string,
}
```

### 8.2 Revenue KPIs

| Metric                 | Formula                               | Target                        |
| ---------------------- | ------------------------------------- | ----------------------------- |
| **ARPU**               | Total Revenue / Total Users           | Track monthly trend           |
| **ARPPU**              | Total Revenue / Paying Users          | Shows true monetization depth |
| **Conversion Rate**    | Paid Users / Total Users              | >5% for utility apps          |
| **LTV:CAC Ratio**      | Lifetime Value / Acquisition Cost     | >3:1 minimum, >5:1 excellent  |
| **Payback Period**     | CAC / Monthly Gross Profit            | <12 months                    |
| **Subscription Churn** | Cancelled / Total Subscriptions       | <3% monthly                   |
| **Revenue Retention**  | Net Revenue Retained Month-over-Month | >100% (expansion > churn)     |

---

## 9. Performance & Quality Analytics

### 9.1 Performance Events

```typescript
PerformanceMeasured {
  ...BaseEventProperties,
  metric:
    | 'app_cold_start'
    | 'screen_load'
    | 'calendar_render'
    | 'voice_latency'
    | 'api_response',
  screenName?: string,
  durationMs: number,
  isSlowThreshold: boolean,        // true if exceeded target threshold
  deviceModel?: string,
}
```

**Target Thresholds:**

| Metric                          | Target   | Critical Alert |
| ------------------------------- | -------- | -------------- |
| App cold start                  | < 2000ms | > 4000ms       |
| Screen load                     | < 800ms  | > 2000ms       |
| Calendar render                 | < 300ms  | > 800ms        |
| Voice latency (STT → API → TTS) | < 3000ms | > 6000ms       |
| EllieBrain API response         | < 1500ms | > 3000ms       |

### 9.2 Error & Crash Events

```typescript
ErrorEncountered {
  ...BaseEventProperties,
  errorType:
    | 'api_error'
    | 'auth_error'
    | 'storage_error'
    | 'voice_error'
    | 'rendering_error'
    | 'crash',
  errorCode?: string,
  errorMessage: string,            // Sanitized — no PII
  screenName: string,
  featureContext: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  userRecovered: boolean,          // Did the app recover gracefully?
  stackTraceHash?: string,         // Hash for grouping without exposing traces
}

AppCrashed {
  ...BaseEventProperties,
  crashType: string,
  lastScreenBeforeCrash: string,
  lastActionBeforeCrash: string,
  stackTraceHash: string,
}
```

**Target: >99.5% crash-free sessions.** Below 99% triggers emergency response. Mining workers rely on this app in remote locations where they cannot easily re-download or troubleshoot.

---

## 10. Future Features Pre-Instrumentation

These events are defined now so instrumentation is ready the moment features ship — no retrofitting required.

### 10.1 ScheduleScreen (Planned)

```typescript
ScheduleScreenViewed {
  ...BaseEventProperties,
  viewType: 'weekly' | 'monthly' | 'list',
  shiftsVisible: number,
}

ScheduleShiftTapped {
  ...BaseEventProperties,
  shiftDate: string,
  shiftType: string,
  action: 'view_details' | 'add_note' | 'set_reminder',
}

ScheduleNoteAdded {
  ...BaseEventProperties,
  noteLength: number,
  shiftDate: string,
  noteType: 'personal' | 'work' | 'reminder',
}
```

### 10.2 StatsScreen (Planned)

```typescript
StatsScreenViewed {
  ...BaseEventProperties,
  statsPeriod: 'this_month' | 'last_month' | '3_months' | '6_months' | 'year',
  shiftsCount: number,
  hoursWorked: number,
}

StatsReportExported {
  ...BaseEventProperties,
  reportType: string,
  format: 'pdf' | 'csv' | 'share',
}

EarningsCalculated {
  ...BaseEventProperties,
  earningsPeriod: string,
  currencyCode: string,
  // No exact earnings amount stored — privacy
}
```

### 10.3 Shift Log / Manual Entries (Future)

```typescript
ShiftLogEntryCreated {
  ...BaseEventProperties,
  shiftType: string,
  hoursLogged: number,
  energyLevel: 'HIGH' | 'MEDIUM' | 'LOW',
  hasNotes: boolean,
}

ShiftLogEntryEdited {
  ...BaseEventProperties,
  fieldsChanged: string[],
}
```

### 10.4 Holiday Integration (Planned)

```typescript
HolidayDataLoaded {
  ...BaseEventProperties,
  country: string,
  holidayCount: number,
}

HolidayTapped {
  ...BaseEventProperties,
  holidayType: 'public' | 'regional' | 'custom',
  isOnWorkDay: boolean,
  isPaid: boolean,
}
```

### 10.5 Earnings & Overtime (Planned, from types/index.ts)

```typescript
EarningsConfigSet {
  ...BaseEventProperties,
  hasHourlyRate: boolean,
  hasNightMultiplier: boolean,
  hasOvertimeConfig: boolean,
  hasHolidayMultiplier: boolean,
  currencyCode: string,
}

OvertimeCalculated {
  ...BaseEventProperties,
  overtimeHours: number,
  overtimeThresholdUsed: number,
}
```

### 10.6 Multi-Pattern Support (Advanced Future Feature)

```typescript
MultiPatternProfileCreated {
  // User manages multiple shift patterns (union delegates, supervisors)
  ...BaseEventProperties,
  totalPatterns: number,
}

PatternSwitched {
  ...BaseEventProperties,
  fromPattern: string,
  toPattern: string,
}
```

### 10.7 Sharing & Social Features (Future)

```typescript
ScheduleShared {
  ...BaseEventProperties,
  shareMethod: 'link' | 'screenshot' | 'calendar_export',
  sharedWithPlatform: string,      // 'whatsapp' | 'messages' | 'other'
  daysShared: number,
}

ColleagueInvited {
  ...BaseEventProperties,
  inviteMethod: string,
  inviteSource: string,
}
```

---

## 11. Claude Sonnet 4.6 AI Decision Engine

This is the intelligence layer. Claude Sonnet 4.6 consumes Ellie's structured analytics data and makes decisions no human analyst could make at scale, with the nuance required for a mining workforce that operates in one of the world's most unusual schedules.

### 11.1 Architecture Overview

```
Analytics Events
      ↓ (real-time)
Firebase Analytics / Firestore
      ↓ (nightly batch export)
Structured JSON/CSV Reports
      ↓
Claude Sonnet 4.6 Analysis Engine  (model: claude-sonnet-4-6)
      ↓
AI Decision Queue (JSON output)
      ↓
Automated Actions / Human Review Queue / A/B Test Configuration / Slack Alerts
```

### 11.2 Daily Intelligence Report Schema

Every morning at 05:00 AM local time (before shift workers wake up), Claude ingests:

```typescript
interface DailyIntelligenceReport {
  reportDate: string;

  // Retention snapshot
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  blockRetentionFIFO: number; // FIFO-adjusted retention
  stickiness: number; // DAU/MAU

  // Yesterday's activity
  dau: number;
  newInstalls: number;
  newOnboardingCompletions: number;
  onboardingDropOffs: { screen: string; count: number }[];

  // Voice assistant health
  voiceSessionsYesterday: number;
  voiceSuccessRate: number;
  topVoiceQueries: { intent: string; count: number }[];
  voiceErrorRate: number;
  avgVoiceLatencyMs: number;

  // Performance
  crashFreeRate: number;
  avgColdStartMs: number;
  apiErrorRate: number;

  // Engagement distribution
  powerUsers: number;
  regularUsers: number;
  casualUsers: number;
  dormantUsers: number;

  // Cohort comparison (this week vs last week)
  retentionDelta: number;
  engagementDelta: number;
  voiceAdoptionDelta: number;

  // Distribution breakdown
  patternBreakdown: { pattern: string; users: number; retentionRate: number }[];
  rosterTypeBreakdown: { type: string; users: number; retentionRate: number }[];
  countryBreakdown: { country: string; users: number }[];
}
```

### 11.3 Claude's Decision Prompts

#### Prompt 1 — Daily Health Check

```
SYSTEM CONTEXT:
You are the AI intelligence engine for Ellie, a shift schedule app for mining workers.
Your job is to analyze the daily report and surface what matters, flag emergencies, and
recommend the single most impactful action for the day.

Mining workers context:
- They work rotating or FIFO (fly-in fly-out) rosters
- Many work underground with no connectivity — offline-first matters
- Workers are from Australia, South Africa, Indonesia, Canada, and beyond
- A "day" for some workers starts at 4am or ends at 6am
- FIFO workers will appear "dormant" during their rest block — that is NOT churn
- Safety is paramount — this app is a work tool, not entertainment

DAILY REPORT: [JSON of DailyIntelligenceReport]

ANALYZE AND RETURN JSON:
{
  emergencies: [{ metric, currentValue, lastWeekValue, change, recommendedAction }],
  opportunities: [{ observation, recommendation, estimatedImpact }],
  churnAlerts: { genuineCount, fifoCaution },
  engineeringAlerts: [{ area, issue, severity }],
  abTestRecommendation: { hypothesis, control, treatment, primaryMetric },
  executiveSummary: "3 sentence max for the founder"
}
```

#### Prompt 2 — Onboarding Funnel Optimization

```
SYSTEM CONTEXT: [App description as above]

ONBOARDING DATA:
[30-day aggregated funnel: { screen, views, completions, abandonments, avgTimeSeconds }]

RETURN JSON:
{
  worstStep: { screen, dropOffRate, avgTimeSeconds },
  hypotheses: ["Why might mining workers specifically abandon here?"],
  proposedTests: [{ testName, control, treatment, expectedLift }],
  segmentInsights: [{ segment, dropOffDifference }],
  revenueImpactOf5PctImprovement: number
}
```

#### Prompt 3 — Voice Assistant Intelligence

```
SYSTEM CONTEXT: [App description as above]

VOICE DATA:
- Top 20 voice queries by frequency
- Tool execution success rates per tool
- Latency per tool (p50, p90, p99)
- Error distribution by stage
- Session abandonment rate by query type

RETURN JSON:
{
  featureGaps: ["Things users are asking for that don't exist yet"],
  engagementPredictors: ["Voice behaviors that correlate with retention"],
  usagePatterns: { peakHours, peakDays, topCountries },
  newToolRecommendations: [{ toolName, rationale, estimatedQueryVolume }],
  latencyIssues: [{ stage, p90Ms, recommendation }],
  topImprovement: "Single highest-impact change"
}
```

#### Prompt 4 — Churn Prevention (FIFO-Aware)

```
SYSTEM CONTEXT: [App description as above]

CHURN RISK DATA:
- Users who moved from regular → casual or casual → dormant this week
- Their last actions before going quiet
- Their shift pattern type and FIFO block schedule
- Their session duration trend

CRITICAL RULE: Many FIFO workers will appear "dormant" during their rest block.
Before flagging as churn risk, check: is this user in an expected rest block period?
If yes, EXCLUDE them from churn interventions entirely.

For GENUINE churn risks only, RETURN JSON:
{
  churnPredictors: ["Top behaviors that preceded churn"],
  fifoCautionCount: number,        // How many were excluded as FIFO rest
  genuineChurnRiskCount: number,
  reEngagementMessages: [{ segment, message, timing }],
  featureSuggestions: ["What to surface to recover engagement"],
  potentialProductIssues: ["Patterns suggesting bugs or UX friction"]
}
```

#### Prompt 5 — Feature Prioritization

```
SYSTEM CONTEXT: [App description as above]

FEATURE USAGE DATA:
- Feature adoption rates (% of users who used each feature)
- Feature-to-retention correlation
- Voice queries for non-existent features (demand signals)
- Configuration distribution (what patterns do power users have?)

PLANNED FEATURES:
- ScheduleScreen (full weekly/monthly schedule view)
- StatsScreen (usage statistics + earnings calculator)
- Shift log with energy tracking
- Holiday integration
- Earnings calculator with overtime
- Multi-language expansion (Afrikaans, Zulu, Hindi, Indonesian, Russian, Mandarin)
- Sharing/social features
- Enhanced smart notifications

RETURN JSON:
{
  retentionImpactRanking: [{ feature, estimatedD7Lift, rationale }],
  conversionImpactRanking: [{ feature, estimatedConversionLift, rationale }],
  segmentBenefits: [{ feature, targetSegment, benefitDescription }],
  sprintRecommendation: { feature, reasoning, implementationNotes }
}
```

#### Prompt 6 — Personalization Engine

```
SYSTEM CONTEXT: [App description as above]

COHORT BEHAVIORAL DATA:
[Anonymized behavioral clusters: features used, retention rate, voice usage, pattern type, country]

DESIGN PERSONALIZATION RULES. RETURN JSON:
{
  archetypes: [
    {
      name: "Archetype name (e.g., Underground Night Shift Voice User)",
      behaviorSignals: ["What defines this archetype"],
      size: "% of user base",
      retentionRate: number,
      personalization: {
        dashboardPriority: ["What to show first"],
        notificationTiming: "When to send notifications",
        voiceSuggestions: ["Proactive voice query suggestions"],
        upsellTiming: "When to show premium offer"
      }
    }
  ],
  notificationCopy: [{ archetype, message, triggerCondition }],
  voiceTutorialLogic: "Which users should see the voice tutorial vs skip it"
}
```

#### Prompt 7 — A/B Test Design

```
SYSTEM CONTEXT: [App description as above]

CURRENT METRICS: [retention, conversion, engagement baselines]
HYPOTHESIS FROM LAST ANALYSIS: [output from previous Claude run]

DESIGN AN A/B TEST. RETURN JSON:
{
  control: "Current behavior description",
  treatment: "Proposed change description",
  primaryMetric: "What we optimize",
  guardrailMetrics: ["What must not get worse"],
  minimumDetectableEffect: number,
  requiredSampleSize: number,
  estimatedDuration: "X days given current install rate",
  implementationSpec: "3-sentence engineer brief"
}
```

### 11.4 AI Decision Authority Levels

| Level             | Actions                                             | Human Approval Required?      |
| ----------------- | --------------------------------------------------- | ----------------------------- |
| **1 — Alert**     | Flag metrics to team via Slack/email                | No                            |
| **2 — Recommend** | Write recommendations to decision queue             | No                            |
| **3 — Configure** | Adjust notification timing/content for segments     | No — logged automatically     |
| **4 — Trigger**   | Send re-engagement notification to churn-risk users | Yes — human reviews user list |
| **5 — Ship**      | Modify A/B test traffic splits                      | Yes — engineer review         |
| **6 — Block**     | Halt a feature rollout if metrics degrade >5%       | Yes — emergency review        |

### 11.5 AI Safety Rules

```
GUARDRAILS — ALL CLAUDE ANALYSES MUST FOLLOW THESE:

1. NEVER identify individual users — all analysis on aggregates or anonymized IDs
2. NEVER send notifications to users who have opted out
3. NEVER recommend increasing notification frequency if unsubscribe rate > 2%
4. NEVER mark FIFO users as churn risk if absence aligns with their rest block
5. NEVER recommend changes to shift calculation logic without engineering review
   (incorrect shift data could cause a worker to miss a shift — safety-critical)
6. ALWAYS include confidence level (high/medium/low) on each recommendation
7. ALWAYS flag when sample size is too small for statistical significance (<100 users)
8. ALWAYS provide the "why" — not just what to do but why the data shows it
9. ALWAYS check for confounding variables before concluding causation
10. ALWAYS respect the mining worker context: safety-critical job, remote locations,
    irregular hours, underground connectivity gaps, international workforce
```

### 11.6 Weekly AI Intelligence Cycle

| Day/Time        | Analysis                     | Output                             |
| --------------- | ---------------------------- | ---------------------------------- |
| Daily 05:00 AM  | Health Check                 | Slack alert if any emergency       |
| Tuesday         | Onboarding Funnel Analysis   | Product team review                |
| Wednesday       | Voice Assistant Intelligence | Engineering review                 |
| Thursday        | Churn Prevention Run         | Re-engagement list for Friday send |
| Friday 09:00 AM | Feature Prioritization       | Informs sprint planning            |
| Sunday          | A/B Test Design              | Ready for Monday kickoff           |
| 1st of Month    | Full Cohort Analysis         | Executive report                   |
| Quarterly       | Archetype Refresh            | Personalization rule update        |

### 11.7 Claude Integration Schema

```typescript
// /src/services/AIAnalyticsService.ts

interface AIAnalysisRequest {
  reportType:
    | 'daily_health'
    | 'onboarding'
    | 'voice'
    | 'churn'
    | 'features'
    | 'personalization'
    | 'ab_test';
  dataPayload: Record<string, unknown>;
  timeRange: { start: string; end: string };
  model: 'claude-sonnet-4-6';
  temperature: 0; // Deterministic for all product decisions
  maxTokens: 4096;
}

interface AIDecision {
  requestId: string;
  analysisType: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  decisions: AIDecisionItem[];
  requiresHumanReview: boolean;
  executiveSummary: string;
}

interface AIDecisionItem {
  priority: 'emergency' | 'high' | 'medium' | 'low';
  category: string;
  finding: string;
  recommendation: string;
  expectedImpact: string;
  authorityLevel: 1 | 2 | 3 | 4 | 5 | 6;
  actionableBy: 'ai_automated' | 'product' | 'engineering' | 'marketing';
}
```

---

## 12. Analytics Dashboard Architecture

### 12.1 Dashboard Views

**View 1 — Mission Control (Daily Real-Time)**

- DAU live count vs. yesterday (+/-)
- Crash-free rate (green >99.5%, red below)
- Voice assistant success rate
- Onboarding funnel completions today
- Active churn risk count
- Claude's top alert for today

**View 2 — Retention Command Center**

- D1/D7/D30/D60 retention curves (cohort-by-cohort overlay)
- FIFO-adjusted block retention separately
- Stickiness ratio trend (DAU/MAU rolling 90 days)
- Engagement tier distribution pie chart

**View 3 — Onboarding Intelligence**

- Step-by-step completion funnel (waterfall)
- Avg time per step (bar chart)
- Drop-off by step, broken out by country
- Pattern selection heatmap (which patterns users choose vs. reject)

**View 4 — Voice Assistant Performance**

- Query volume by hour of day (heatmap)
- Tool execution success rate per tool
- Latency distribution (p50/p90/p99)
- Top query intents (word cloud)
- Failed query categories (what Ellie can't answer yet)

**View 5 — User Segments**

- Power / Regular / Casual / Dormant breakdown over time
- Tier migration this week (who upgraded / downgraded)
- Top segments by country and shift pattern
- Engagement score distribution

**View 6 — AI Decision Feed**

- Claude's latest recommendations (scrollable feed)
- Decisions pending human review
- A/B tests running + live results
- Churn prevention actions sent vs. recovered

### 12.2 Alerting Rules

| Alert                                     | Threshold      | Severity    | Response                                 |
| ----------------------------------------- | -------------- | ----------- | ---------------------------------------- |
| D7 retention drops >5%                    | Week-over-week | Critical    | Engineering + Product emergency same day |
| Crash-free rate < 99.5%                   | Any point      | Critical    | Engineering immediate response           |
| Voice error rate > 10%                    | Daily average  | High        | Engineering review within 24h            |
| Onboarding completion drops >10%          | Week-over-week | High        | Product review within 48h                |
| Dormant users > 30% of MAU                | Monthly        | Medium      | Marketing + re-engagement campaign       |
| Voice latency p90 > 5000ms                | Daily          | Medium      | Infrastructure review                    |
| New country spike >50 users/day           | Any            | Opportunity | Consider language/localization sprint    |
| Pattern card deck exhausted >20% of users | Weekly         | Medium      | Onboarding UX review                     |

---

## 13. Implementation Roadmap

### Phase 1 — Foundation (Week 1–2)

**Goal: Core event infrastructure and basic funnel tracking**

1. Create `AnalyticsService.ts` in `/src/services/`
   - Wrapper around Firebase Analytics (already in `app.config.js`)
   - Auto-inject `BaseEventProperties` on every event
   - Offline event queue with AsyncStorage (critical for underground workers)
   - Flush queue when connectivity restored via `DataSyncService.ts` hook
2. Instrument `SessionStarted` / `SessionEnded`
3. Instrument `ScreenViewed` / `ScreenExited` on all 16 screens
4. Instrument full onboarding funnel (all 11 steps)
5. Enable Firebase Crashlytics (already flagged in env config)

**Success criteria:** Full onboarding funnel visible in Firebase dashboard

### Phase 2 — Voice & Retention (Week 3–4)

**Goal: Voice assistant analytics + retention dashboards**

1. Instrument all `VoiceSession*` events in `VoiceAssistantService.ts`
2. Instrument `WakeWord*` events in `WakeWordService.ts`
3. Instrument `VoiceToolExecuted` per tool in `EllieBrainService.ts`
4. Build D1/D7/D30 retention cohort dashboard
5. Implement FIFO-adjusted block retention metric

**Success criteria:** Voice adoption rate and retention curves visible

### Phase 3 — User Properties & Segmentation (Week 5–6)

**Goal: Rich user profiles enabling segmentation**

1. Implement `UserAnalyticsProfile` sync on login/onboarding completion
2. Implement weekly `EngagementScore` computation (Cloud Function)
3. Build segment migration tracking (tier changes over time)
4. Instrument notification events in `NotificationService.ts`
5. Instrument all authentication events in `AuthService.ts`

**Success criteria:** Can identify Power/Regular/Casual/Dormant segments in real time

### Phase 4 — AI Decision Engine (Week 7–8)

**Goal: Claude Sonnet 4.6 analyzing data and producing decisions**

1. Build nightly data export pipeline (Firestore → structured JSON)
2. Implement Daily Health Check Cloud Function with Claude API call
3. Implement Churn Prevention pipeline with FIFO rest block exclusion
4. Build AI Decision Feed dashboard view
5. Configure all alerting rules with Slack webhook

**Success criteria:** Claude generates daily health report; churn alerts firing correctly

### Phase 5 — Advanced Intelligence (Ongoing)

**Goal: Full AI intelligence cycle operational**

1. Onboarding funnel optimization loop (weekly)
2. Voice assistant feature gap detection (new tool recommendations)
3. Personalization engine — per-archetype dashboard and notification rules
4. A/B test design and instrumentation pipeline
5. Feature prioritization automation feeding into sprint planning

---

## Appendix A: AnalyticsService Implementation Skeleton

```typescript
// /src/services/AnalyticsService.ts

import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'analytics_queue';

interface QueuedEvent {
  name: string;
  properties: Record<string, unknown>;
  queuedAt: number;
}

class AnalyticsService {
  private eventQueue: QueuedEvent[] = [];
  private isOnline = true;

  setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online) this.flush();
  }

  async track(eventName: string, properties: Record<string, unknown> = {}) {
    const event = { name: eventName, properties, queuedAt: Date.now() };

    if (this.isOnline) {
      await analytics().logEvent(eventName, properties);
    } else {
      // Queue for underground workers with no connectivity
      this.eventQueue.push(event);
      await this.persistQueue();
    }
  }

  async setUserProperties(props: Record<string, string>) {
    for (const [key, value] of Object.entries(props)) {
      await analytics().setUserProperty(key, value);
    }
  }

  async flush() {
    const toFlush = this.eventQueue.splice(0);
    await this.persistQueue();
    for (const event of toFlush) {
      await analytics().logEvent(event.name, event.properties);
    }
  }

  private async persistQueue() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.eventQueue));
  }

  async restoreQueue() {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw) this.eventQueue = JSON.parse(raw);
  }
}

export const analyticsService = new AnalyticsService();
```

---

## Appendix B: The 15 Metrics That Matter Most for Ellie

In strict priority order — focus here before anywhere else:

1. **D7 Retention** — Does the app survive the first shift cycle?
2. **FIFO Block Retention** — Are fly-in fly-out workers truly retained (not just on rest)?
3. **Onboarding Completion Rate** — Can workers set up the app correctly?
4. **Voice Adoption Rate** — % of users who ever use the voice assistant
5. **Voice Success Rate** — Is Ellie Brain answering questions correctly?
6. **DAU/MAU Stickiness** — Is Ellie a daily habit (target >25%)?
7. **Crash-Free Rate** — Is the app safe to depend on underground (must be >99.5%)?
8. **D30 Retention** — Does the app survive a full roster cycle?
9. **Session Frequency** — How many times per week do workers open Ellie?
10. **Onboarding Step Drop-Off** — Where exactly do we lose workers in setup?
11. **Notification Engagement Rate** — Are reminders helping workers?
12. **Voice Session Duration** — Are workers getting real value from voice?
13. **Pattern Distribution** — What shift patterns dominate? (Drives product roadmap)
14. **Country Distribution** — Where is growth happening? (Drives language/locale roadmap)
15. **Dormant User Rate** — Churn risk proxy (but always check FIFO rest block first)

---

_This document is the analytics and AI intelligence foundation for Ellie._
_It is a living document — updated as features ship, decisions are made, and patterns emerge._
_The goal is not to track everything. The goal is to track the right things, understand them deeply, and let AI act on them faster than any human team could._

_Built for mining workers. Powered by data. Decided by AI._
