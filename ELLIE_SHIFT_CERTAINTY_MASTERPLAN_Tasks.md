# ELLIE SHIFT CERTAINTY — IMPLEMENTATION TASK LIST

**Source of truth:** `ELLIE_SHIFT_CERTAINTY_MASTERPLAN.md` + Ellie codebase
**Codebase root:** `/Users/Shared/Ellie/src/`
**Rule:** Read the file you are about to edit before touching it. Cross-reference the masterplan before every task. Do not leave any task incomplete before moving to the next sprint.

---

## How to Use This File

- Work top to bottom, sprint by sprint
- Check each box `[x]` when the task is **fully complete and verified**
- Every task includes: what file, what to change, what the result should be
- "Verify" steps must pass before the box is checked
- Swipe screens (`PremiumShiftSystemScreen`, `PremiumRosterTypeScreen`, `PremiumShiftPatternScreen`, `PremiumPhaseSelectorScreen`, `PremiumFIFOPhaseSelectorScreen`) are **READ-ONLY — never edit them**

---

---

# SPRINT 1 — ANALYTICS FOUNDATION

### Goal: Instrument the full onboarding + paywall funnel. Deploy and let run for 1 week before Sprint 2.

---

## TASK 1.1 — Create `src/utils/analytics.ts`

**File to create:** `src/utils/analytics.ts`
**Why:** Zero analytics exist anywhere in the app. This is the typed event wrapper used by all subsequent tasks.

**Complete file contents:**

```typescript
import analytics from '@react-native-firebase/analytics';

// Typed event names — prevents typos and keeps the event schema consistent
export type OnboardingStep =
  | 'welcome'
  | 'shift_system'
  | 'roster_type'
  | 'shift_pattern'
  | 'custom_pattern'
  | 'fifo_custom_pattern'
  | 'phase_selector'
  | 'fifo_phase_selector'
  | 'start_date'
  | 'aha_moment'
  | 'shift_time_input'
  | 'completion';

export const Analytics = {
  screenView: (screenName: string) =>
    analytics().logScreenView({ screen_name: screenName, screen_class: screenName }),

  onboardingStepViewed: (step: OnboardingStep, stepNumber: number) =>
    analytics().logEvent('onboarding_step_viewed', { step, step_number: stepNumber }),

  onboardingStepCompleted: (step: OnboardingStep, timeSpentMs: number) =>
    analytics().logEvent('onboarding_step_completed', { step, time_spent_ms: timeSpentMs }),

  onboardingAbandoned: (step: OnboardingStep, stepNumber: number) =>
    analytics().logEvent('onboarding_abandoned', { step, step_number: stepNumber }),

  ahaMomentReached: (secondsSinceInstall: number) =>
    analytics().logEvent('aha_moment_reached', { seconds_since_install: secondsSinceInstall }),

  ahaMomentVoiceTried: (query: string) => analytics().logEvent('aha_moment_voice_tried', { query }),

  paywallViewed: (source: 'post_aha' | 'profile' | 'feature_gate') =>
    analytics().logEvent('paywall_viewed', { source }),

  paywallPlanSelected: (plan: 'annual' | 'monthly') =>
    analytics().logEvent('paywall_plan_selected', { plan }),

  trialStarted: (plan: 'annual' | 'monthly', price: number) =>
    analytics().logEvent('trial_started', { plan, price }),

  purchaseCompleted: (plan: 'annual' | 'monthly', price: number) =>
    analytics().logEvent('purchase_completed', { plan, price }),

  paywallDismissed: () => analytics().logEvent('paywall_dismissed'),

  notificationPermissionSoftShown: () => analytics().logEvent('notification_soft_ask_shown'),

  notificationPermissionGranted: () => analytics().logEvent('notification_permission_granted'),

  notificationPermissionDeclined: () => analytics().logEvent('notification_permission_declined'),

  dayOneReturn: () => analytics().logEvent('day_1_return'),
  daySevenActive: () => analytics().logEvent('day_7_active'),
  dayThirtyActive: () => analytics().logEvent('day_30_active'),
};
```

**Verify:** File exists at `src/utils/analytics.ts`. TypeScript compiles with no errors.

- [x] **DONE**

---

## TASK 1.2 — Instrument `PremiumWelcomeScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
**Read the file first.** Find the mount `useEffect` (starts around line 60).

Add at the top of the `useEffect` body (before the animation lines):

```typescript
import { Analytics } from '@/utils/analytics';
// inside useEffect:
Analytics.onboardingStepViewed('welcome', 1);
```

Also: store the app install timestamp in AsyncStorage if not already set (used later by AhaMoment screen to compute `secondsSinceInstall`):

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
// inside useEffect, first lines:
AsyncStorage.getItem('app:install_time').then((val) => {
  if (!val) AsyncStorage.setItem('app:install_time', Date.now().toString());
});
```

**Verify:** In Firebase DebugView, `onboarding_step_viewed` fires with `step: 'welcome'` when the screen mounts.

- [x] **DONE**

---

## TASK 1.3 — Instrument `PremiumShiftSystemScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumShiftSystemScreen.tsx`
**DO NOT modify swipe logic, gesture handlers, or animations.**
Find the component's mount `useEffect`. Add:

```typescript
import { Analytics } from '@/utils/analytics';
// inside useEffect:
Analytics.onboardingStepViewed('shift_system', 2);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'shift_system', step_number: 2`.

- [x] **DONE**

---

## TASK 1.4 — Instrument `PremiumRosterTypeScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx`
**DO NOT modify swipe logic.**
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('roster_type', 3);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'roster_type', step_number: 3`.

- [x] **DONE**

---

## TASK 1.5 — Instrument `PremiumShiftPatternScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`
**DO NOT modify gesture/card selection logic.**
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('shift_pattern', 4);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'shift_pattern', step_number: 4`.

- [x] **DONE**

---

## TASK 1.6 — Instrument `PremiumPhaseSelectorScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumPhaseSelectorScreen.tsx`
**DO NOT modify swipe logic (2-stage Tinder swipe: PHASE → DAY_WITHIN_PHASE).**
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('phase_selector', 5);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'phase_selector', step_number: 5`.

- [x] **DONE**

---

## TASK 1.7 — Instrument `PremiumFIFOPhaseSelectorScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen.tsx`
**DO NOT modify swipe logic (3-stage Tinder swipe).**
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('fifo_phase_selector', 5);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'fifo_phase_selector', step_number: 5`.

- [x] **DONE**

---

## TASK 1.8 — Instrument `PremiumStartDateScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumStartDateScreen.tsx`
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('start_date', 6);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'start_date', step_number: 6`.

- [x] **DONE**

---

## TASK 1.9 — Instrument `PremiumShiftTimeInputScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumShiftTimeInputScreen.tsx`
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('shift_time_input', 8);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'shift_time_input', step_number: 8`.

- [x] **DONE**

---

## TASK 1.10 — Instrument `PremiumCompletionScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`
Add to mount `useEffect`:

```typescript
import { Analytics } from '@/utils/analytics';
Analytics.onboardingStepViewed('completion', 8);
```

**Verify:** `onboarding_step_viewed` fires with `step: 'completion', step_number: 8`.

- [x] **DONE**

---

## TASK 1.11 — Instrument `PaywallScreen.tsx` — View Event

**File:** `src/screens/subscription/PaywallScreen.tsx`
Read the file. Find the component mount `useEffect` (or add one if none exists).
Add:

```typescript
import { Analytics } from '@/utils/analytics';
// inside useEffect (mount only, empty deps):
useEffect(() => {
  Analytics.paywallViewed('post_aha');
}, []);
```

**Verify:** `paywall_viewed` fires with `source: 'post_aha'` when paywall opens.

- [x] **DONE**

---

## TASK 1.12 — Instrument `PaywallScreen.tsx` — Plan Selection

**File:** `src/screens/subscription/PaywallScreen.tsx`
Find the annual plan `onPress` handler. Add:

```typescript
Analytics.paywallPlanSelected('annual');
```

Find the monthly plan `onPress` handler. Add:

```typescript
Analytics.paywallPlanSelected('monthly');
```

**Verify:** Tapping each plan card fires `paywall_plan_selected` with correct `plan` value.

- [x] **DONE**

---

## TASK 1.13 — Instrument `PaywallScreen.tsx` — Purchase Success

**File:** `src/screens/subscription/PaywallScreen.tsx`
Find the `handlePurchase` function. In the **success path** (after `Purchases.purchasePackage` resolves successfully, before `onDismiss()`), add:

```typescript
Analytics.trialStarted(selectedPlan, selectedPackage.product.price);
```

**Do NOT add it in the catch block** (catch includes user cancellations which are not purchases).

**Verify:** In RevenueCat sandbox, completing a trial purchase fires `trial_started` with correct plan and price.

- [x] **DONE**

---

## TASK 1.14 — Instrument `PaywallScreen.tsx` — Dismiss

**File:** `src/screens/subscription/PaywallScreen.tsx`
Find the dismiss button's `onPress`. Add before calling `onDismiss()`:

```typescript
Analytics.paywallDismissed();
```

**Verify:** Tapping the dismiss button fires `paywall_dismissed`.

- [x] **DONE**

---

## TASK 1.15 — Deploy Sprint 1 to TestFlight

- Build the app with the above analytics instrumentation
- Submit to TestFlight / internal testing track
- Enable Firebase Analytics DebugView:
  - iOS: Add `-FIRAnalyticsDebugEnabled` to Xcode scheme arguments
  - Android: `adb shell setprop debug.firebase.analytics.app au.com.ellie`
- Walk through the full onboarding flow end-to-end
- Confirm ALL events fire in Firebase Console → DebugView

**Verify:** Full funnel visible in DebugView: `welcome` → `shift_system` → `roster_type` → `shift_pattern` → `phase_selector` → `start_date` → `shift_time_input` → `completion` → `paywall_viewed` → `paywall_dismissed`.

- [x] **DONE**

---

## TASK 1.16 — Wait 7 Days, Identify Biggest Drop-Off

- Let analytics run for 7 days with real users
- Open Firebase Analytics → Funnel Analysis
- Identify the single step with the highest drop-off rate
- Record the result: **biggest drop-off step: ******\_\_\_********
- This data informs which sprint items are most urgent

**Verify:** Drop-off step identified and documented.

- [x] **DONE**

---

---

# SPRINT 2 — REMOVE INTRODUCTION + AHA MOMENT + PAYWALL REDESIGN

### Goal: Skip Introduction in the flow. Build AhaMoment screen. Add Hey Ellie demo. Redesign paywall.

---

## TASK 2.1 — Update `onboardingNavigation.ts`: Skip Introduction

**File:** `src/utils/onboardingNavigation.ts`
Read the file. Find the `NAVIGATION_FLOW` constant. Find this line:

```typescript
Welcome: () => 'Introduction',
```

Change it to:

```typescript
Welcome: () => 'ShiftSystem',
```

The `Introduction` entry stays as-is (accessible from Profile post-onboarding):

```typescript
Introduction: () => 'ShiftSystem', // no change needed — already correct
```

**Verify:** Fresh onboarding flow → tap "Get Started" on Welcome → lands on ShiftSystem, NOT Introduction.

- [x] **DONE**

---

## TASK 2.2 — Update `onboardingProgress.ts`: Renumber Steps

**File:** `src/constants/onboardingProgress.ts`
Read the file. Replace the entire `ONBOARDING_STEPS` object and `TOTAL_ONBOARDING_STEPS` with:

```typescript
export const ONBOARDING_STEPS = {
  WELCOME: 1,
  // Introduction removed from initial flow — no step number
  SHIFT_SYSTEM: 2,
  ROSTER_TYPE: 3,
  SHIFT_PATTERN: 4,
  CUSTOM_PATTERN: 4, // conditional — same visual step as SHIFT_PATTERN
  FIFO_CUSTOM_PATTERN: 4, // conditional — same visual step as SHIFT_PATTERN (FIFO)
  PHASE_SELECTOR: 5, // SWIPE — DO NOT TOUCH THE SCREEN
  FIFO_PHASE_SELECTOR: 5, // SWIPE — DO NOT TOUCH THE SCREEN
  START_DATE: 6,
  AHA_MOMENT: 7, // new paywall gateway screen
  SHIFT_TIME_INPUT: 8, // moved post-paywall
  COMPLETION: 8,
} as const;

export const TOTAL_ONBOARDING_STEPS = 7;
```

**Verify:** Progress bar on each onboarding screen shows 7 total steps. Step numbers are correct.

- [x] **DONE**

---

## TASK 2.3 — Patch `VoiceAssistantContext.tsx`: Make `name` Optional

**File:** `src/contexts/VoiceAssistantContext.tsx`
Read the file. Search for `buildUserContext`. Find the null guard that looks like:

```typescript
if (!onboardingData.name || !onboardingData.patternType || !onboardingData.startDate) {
  return null;
}
```

Remove `!onboardingData.name ||` from the condition so it reads:

```typescript
if (!onboardingData.patternType || !onboardingData.startDate) {
  return null;
}
// name is optional — Introduction removed from initial flow
// backend handles null/missing name gracefully (omits personalised greeting)
```

**Why this is safe:** The backend Claude system prompt handles missing names with generic greetings. Shift data queries never require a name.

**Verify:** Complete onboarding without entering a name (Introduction skipped). Open Hey Ellie modal. Ask a question. Should receive an answer (no crash, no "missing context" error).

- [x] **DONE**

---

## TASK 2.4 — Add `processTextQuery()` to `VoiceAssistantService.ts`

**File:** `src/services/VoiceAssistantService.ts`
Read the file. Find `handleFinalTranscript` (the method that handles a completed voice transcript → sends to EllieBrainService → calls TTS). Note its exact signature.

Add a new **public** method alongside `startListening`:

```typescript
/**
 * Process a text query directly, bypassing STT.
 * Used by the AhaMoment screen suggestion chips.
 * Routes through the same handleFinalTranscript pipeline as a voice query.
 */
async processTextQuery(query: string): Promise<void> {
  if (this.state === 'processing' || this.state === 'speaking') return;
  await this.handleFinalTranscript(query);
}
```

**Verify:** Calling `processTextQuery('What shift do I have tomorrow?')` in a test scenario causes the service to transition through `processing` → `speaking` states and play a TTS response. No STT is started.

- [x] **DONE**

---

## TASK 2.5 — Add `openModalWithQuery()` to `VoiceAssistantContext.tsx`

**File:** `src/contexts/VoiceAssistantContext.tsx`
Read the file. Find the context interface (the TypeScript `interface` or `type` that defines the shape of `useVoiceAssistant()` return value). Add:

```typescript
openModalWithQuery: (query: string) => void;
```

Find the `openModal` implementation inside the provider. Add alongside it:

```typescript
const openModalWithQuery = useCallback(
  (query: string) => {
    setIsModalVisible(true);
    // Brief delay for modal slide-up animation to complete
    setTimeout(() => {
      void voiceAssistantService.processTextQuery(query);
    }, 350);
  },
  [voiceAssistantService]
);
```

Make sure `openModalWithQuery` is included in the context value object that is passed to `<VoiceAssistantContext.Provider value={...}>`.

**Verify:** Calling `openModalWithQuery('Am I working Christmas?')` from any screen opens the modal AND shows the question as a user message bubble with a response from Ellie within ~2 seconds. No voice input required.

- [x] **DONE**

---

## TASK 2.6 — Create `src/components/paywall/MiniYearCalendar.tsx`

**File to create:** `src/components/paywall/MiniYearCalendar.tsx`
**Purpose:** Compact dot-grid year calendar used as the blurred background on the paywall. Reuses `buildShiftCycle()` and `getShiftDaysInRange()` from `src/utils/shiftUtils.ts`.

**Component spec:**

```typescript
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { buildShiftCycle, getShiftDaysInRange } from '@/utils/shiftUtils';
import { theme } from '@/utils/theme';
import type { OnboardingData } from '@/contexts/OnboardingContext';

interface MiniYearCalendarProps {
  data: OnboardingData;
  blurred?: boolean;   // if true: opacity 0.25 (used as background)
  compact?: boolean;   // if true: 3pt dots with tighter spacing
}

// Shift type → dot color
const SHIFT_COLORS: Record<string, string> = {
  day: '#2196F3',
  night: '#651FFF',
  morning: '#F59E0B',
  afternoon: '#F59E0B',
  off: theme.colors.softStone,
};

export const MiniYearCalendar: React.FC<MiniYearCalendarProps> = ({ data, blurred, compact }) => {
  const dotSize = compact ? 3 : 5;
  const dotGap = compact ? 1 : 2;

  const shiftDays = useMemo(() => {
    if (!data.patternType || !data.startDate) return [];
    const cycle = buildShiftCycle(data);
    if (!cycle) return [];
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear() + 1, 11, 31);
    return getShiftDaysInRange(cycle, start, end);
  }, [data]);

  // Group by month
  const months = useMemo(() => {
    const grouped: { month: number; year: number; days: typeof shiftDays }[] = [];
    for (let m = 0; m < 12; m++) {
      const year = new Date().getFullYear();
      grouped.push({
        month: m,
        year,
        days: shiftDays.filter(d => {
          const date = new Date(d.date);
          return date.getMonth() === m && date.getFullYear() === year;
        }),
      });
    }
    return grouped;
  }, [shiftDays]);

  return (
    <View style={[styles.container, blurred && styles.blurred]}>
      {months.map(({ month, days }) => (
        <View key={month} style={styles.monthRow}>
          {days.map((d, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  margin: dotGap / 2,
                  backgroundColor: SHIFT_COLORS[d.type] ?? theme.colors.softStone,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  blurred: {
    opacity: 0.25,
  },
  monthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  dot: {
    // size and margin set inline
  },
});
```

**Verify:** Import `MiniYearCalendar` in a test screen and pass valid `OnboardingData`. Should render colored dots representing a year of shifts. `blurred=true` renders at 25% opacity.

- [x] **DONE**

---

## TASK 2.7 — Create `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`

**File to create:** `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`
**This is the most important new screen.** Read `PremiumCompletionScreen.tsx` and `PremiumStartDateScreen.tsx` first for patterns (progress bar, button styles, navigation patterns).

### 2.7a — Scaffold and imports

```typescript
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { buildShiftCycle, getShiftDaysInRange, getShiftStatistics } from '@/utils/shiftUtils';
import { Analytics } from '@/utils/analytics';
import { theme } from '@/utils/theme';
import { PremiumButton } from '@/components/onboarding/premium';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'AhaMoment'>;

const SUGGESTION_QUERIES = [
  'Am I working Christmas?',
  "When's my next day off?",
  'How many night shifts this month?',
];
```

### 2.7b — Shift data computation (inside component)

```typescript
const { data } = useOnboarding();
const { openModalWithQuery, openModal } = useVoiceAssistant();
const navigation = useNavigation<NavigationProp>();

const shiftCycle = useMemo(() => {
  if (!data.patternType || !data.startDate) return null;
  return buildShiftCycle(data);
}, [data]);

const yearStart = useMemo(() => new Date(new Date().getFullYear(), 0, 1), []);
const yearEnd = useMemo(() => new Date(new Date().getFullYear() + 1, 11, 31), []);

const shiftDays = useMemo(() => {
  if (!shiftCycle) return [];
  return getShiftDaysInRange(shiftCycle, yearStart, yearEnd);
}, [shiftCycle, yearStart, yearEnd]);

const stats = useMemo(() => {
  if (!shiftDays.length) return null;
  return getShiftStatistics(shiftDays);
}, [shiftDays]);

// Next shift from today
const nextShift = useMemo(() => {
  const today = new Date();
  return shiftDays.find((d) => new Date(d.date) > today && d.type !== 'off') ?? null;
}, [shiftDays]);
```

### 2.7c — Analytics on mount

```typescript
useEffect(() => {
  Analytics.onboardingStepViewed('aha_moment', 7);
  // Compute seconds since install
  AsyncStorage.getItem('app:install_time').then((val) => {
    if (val) {
      const secondsSinceInstall = Math.floor((Date.now() - parseInt(val)) / 1000);
      Analytics.ahaMomentReached(secondsSinceInstall);
    }
  });
}, []);
```

### 2.7d — 12-month dot-grid calendar rendering

Render a `ScrollView` containing 12 month rows. Each month row: the month name abbreviation (Jan, Feb…) in small text, then a `flexWrap: 'row'` of colored dots — one per day. Dot colors from the masterplan:

- `day` → `#2196F3`
- `night` → `#651FFF`
- `morning` / `afternoon` → `#F59E0B`
- `off` → `theme.colors.softStone`

Use `Animated.View` with `entering={FadeInDown.delay(rowIndex * 80).duration(300)}` per month row (same stagger pattern as CompletionScreen lines 780–807).

### 2.7e — Stats row

Below the calendar grid, render a 2×2 grid of stat chips:

```tsx
<View style={styles.statsGrid}>
  <View style={styles.statChip}>
    <Text style={styles.statValue}>{stats?.workDays ?? '—'}</Text>
    <Text style={styles.statLabel}>Work days</Text>
  </View>
  <View style={styles.statChip}>
    <Text style={styles.statValue}>{stats?.nightShifts ?? '—'}</Text>
    <Text style={styles.statLabel}>Night shifts</Text>
  </View>
  <View style={styles.statChip}>
    <Text style={styles.statValue}>{stats?.daysOff ?? '—'}</Text>
    <Text style={styles.statLabel}>Days off</Text>
  </View>
  <View style={styles.statChip}>
    <Text style={styles.statValue}>
      {nextShift
        ? new Date(nextShift.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' })
        : '—'}
    </Text>
    <Text style={styles.statLabel}>Next shift</Text>
  </View>
</View>
```

### 2.7f — Hey Ellie section

```tsx
{/* Section divider */}
<View style={styles.sectionDivider} />

<View style={styles.heyEllieSection}>
  <Text style={styles.heyEllieTitle}>Ask Ellie about your roster</Text>

  <View style={styles.suggestionChips}>
    {SUGGESTION_QUERIES.map((query, i) => (
      <TouchableOpacity
        key={i}
        style={styles.suggestionChip}
        onPress={() => {
          Analytics.ahaMomentVoiceTried(query);
          openModalWithQuery(query);
        }}
      >
        <Ionicons name="mic-outline" size={13} color={theme.colors.sacredGold} />
        <Text style={styles.suggestionChipText}>{query}</Text>
      </TouchableOpacity>
    ))}
  </View>

  <TouchableOpacity
    style={styles.heyEllieButton}
    onPress={() => {
      Analytics.ahaMomentVoiceTried('manual_mic');
      openModal();
    }}
  >
    <View style={styles.heyEllieGlow} />
    <Ionicons name="mic" size={24} color={theme.colors.sacredGold} />
    <Text style={styles.heyEllieLabel}>Hey Ellie</Text>
  </TouchableOpacity>
</View>

{/* Section divider */}
<View style={styles.sectionDivider} />
```

### 2.7g — Primary CTA + secondary link

```tsx
<PremiumButton
  title="Unlock Full Access — Free 7-Day Trial"
  onPress={() => {
    // Open PaywallScreen as modal — pass onboardingData for blurred calendar
    // After dismiss, navigate to ShiftTimeInput regardless of subscription state
    navigation.navigate('ShiftTimeInput' as never); // TODO: show paywall first
  }}
  variant="primary"
  size="large"
/>
<TouchableOpacity
  onPress={() => navigation.navigate('ShiftTimeInput' as never)}
  style={styles.secondaryLink}
>
  <Text style={styles.secondaryLinkText}>Continue with Limited Access →</Text>
</TouchableOpacity>
```

**Note on paywall:** The primary CTA should open `PaywallScreen` as a modal (using the same pattern as `SubscriptionContext`'s `openPaywall()`). After the modal dismisses, navigate to `'ShiftTimeInput'`. Consult `SubscriptionContext.tsx` for the existing `openPaywall` pattern.

### 2.7h — Styles

Add `StyleSheet.create({...})` with all styles referenced above. Key styles:

```typescript
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  scrollContent: { paddingHorizontal: theme.spacing.xl, paddingBottom: 40 },
  headline: { fontSize: 28, fontWeight: '800', color: theme.colors.paper, marginBottom: 4 },
  subheadline: { fontSize: 16, color: theme.colors.dust, marginBottom: theme.spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: theme.spacing.lg },
  statChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.colors.paper },
  statLabel: { fontSize: 11, color: theme.colors.dust, marginTop: 2 },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
    opacity: 0.3,
    marginVertical: theme.spacing.lg,
    marginHorizontal: -theme.spacing.xl,
  },
  heyEllieSection: { alignItems: 'center', paddingHorizontal: theme.spacing.md },
  heyEllieTitle: {
    fontSize: 14,
    color: theme.colors.dust,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  suggestionChips: { gap: 8, width: '100%', marginBottom: theme.spacing.lg },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(212, 168, 106, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 106, 0.2)',
  },
  suggestionChipText: { fontSize: 14, color: theme.colors.paper, flex: 1 },
  heyEllieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(212, 168, 106, 0.1)',
    position: 'relative',
  },
  heyEllieGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.05,
  },
  heyEllieLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.sacredGold,
    letterSpacing: 0.5,
  },
  secondaryLink: { marginTop: 12, alignItems: 'center' },
  secondaryLinkText: { fontSize: 14, color: theme.colors.dust },
});
```

**Verify:** Screen renders with populated year calendar showing colored dots. Stats are accurate. Tapping a suggestion chip opens VoiceAssistantModal and processes the query. Tapping mic button opens modal for voice input. Both CTAs navigate to ShiftTimeInput.

- [x] **DONE**

---

## TASK 2.8 — Register `AhaMoment` in `OnboardingNavigator.tsx`

**File:** `src/navigation/OnboardingNavigator.tsx`
Read the file. Find the `OnboardingStackParamList` type definition. Add:

```typescript
AhaMoment: undefined;
```

Find the `<Stack.Navigator>` JSX. Add the screen registration alongside the other screens:

```tsx
import { PremiumAhaMomentScreen } from '@/screens/onboarding/premium/PremiumAhaMomentScreen';
// ...
<Stack.Screen name="AhaMoment" component={PremiumAhaMomentScreen} />;
```

**Verify:** TypeScript compiles. Navigating to `'AhaMoment'` resolves to `PremiumAhaMomentScreen`.

- [x] **DONE**

---

## TASK 2.9 — Update `onboardingNavigation.ts`: Wire `AhaMoment` into the Flow

**File:** `src/utils/onboardingNavigation.ts`
Read the file. Make three changes to `NAVIGATION_FLOW`:

**Change 1:** `StartDate` target:

```typescript
// Old:
StartDate: () => 'ShiftTimeInput',
// New:
StartDate: () => 'AhaMoment',
```

**Change 2:** Add `AhaMoment` entry:

```typescript
AhaMoment: () => 'ShiftTimeInput',
```

**Change 3:** `ShiftTimeInput` stays the same (still → `'Completion'`).

**Verify:** Navigation flow: StartDate → AhaMoment → ShiftTimeInput → Completion. Completing StartDate navigates to AhaMoment (not ShiftTimeInput).

- [x] **DONE**

---

## TASK 2.10 — Update `onboardingProgress.ts`: Add `AHA_MOMENT` (verify Task 2.2 is done)

This was already done in Task 2.2. Confirm `AHA_MOMENT: 7` exists in the constants object.

**Verify:** `ONBOARDING_STEPS.AHA_MOMENT === 7`. TypeScript compiles.

- [x] **CONFIRMED**

---

## TASK 2.11 — Update `PremiumWelcomeScreen.tsx`: Fix `handleContinue` Navigation

**File:** `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
Read the file. Find `handleContinue` function (around line 112). Find this line:

```typescript
navigation.navigate('Introduction');
```

Change to:

```typescript
navigation.navigate('ShiftSystem');
```

**Verify:** Tapping the "Get Started" button on the Welcome screen navigates to ShiftSystem, not Introduction.

- [x] **DONE**

---

## TASK 2.12 — Redesign `PaywallScreen.tsx` — Section 0: Delayed Dismiss

**File:** `src/screens/subscription/PaywallScreen.tsx`
Read the entire file before editing.

Find the dismiss button (currently immediately visible near the top of the component). Add a `useState` and `useEffect` to delay it by 4 seconds:

```typescript
const [dismissVisible, setDismissVisible] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setDismissVisible(true), 4000);
  return () => clearTimeout(timer);
}, []);
```

Wrap the dismiss button's render in a conditional:

```tsx
{
  dismissVisible && (
    <TouchableOpacity
      style={styles.dismissButton}
      onPress={() => {
        Analytics.paywallDismissed();
        onDismiss();
      }}
    >
      <Ionicons name="close" size={22} color={theme.colors.dust} />
    </TouchableOpacity>
  );
}
```

**Verify:** Open paywall. Dismiss button is invisible for the first 4 seconds. Appears at ~4s. Tapping it fires `paywall_dismissed` and closes the modal.

- [x] **DONE**

---

## TASK 2.13 — Redesign `PaywallScreen.tsx` — Section 1: Blurred Calendar Hero

**File:** `src/screens/subscription/PaywallScreen.tsx`

**Step 1:** Add `onboardingData?: OnboardingData` to the `PaywallScreenProps` interface:

```typescript
interface PaywallScreenProps {
  onDismiss: () => void;
  onboardingData?: OnboardingData;
}
```

**Step 2:** Import `MiniYearCalendar` and `LinearGradient`.

**Step 3:** Replace the existing mic-circle hero (lines 123–132 in the original file) with the blurred calendar:

```tsx
{
  /* Blurred calendar background — their actual shifts */
}
<View style={styles.calendarBackground} pointerEvents="none">
  {onboardingData && <MiniYearCalendar data={onboardingData} blurred compact />}
  <LinearGradient
    colors={['transparent', theme.colors.deepVoid]}
    start={{ x: 0.5, y: 0.2 }}
    end={{ x: 0.5, y: 1.0 }}
    style={StyleSheet.absoluteFillObject}
  />
</View>;
```

Add style:

```typescript
calendarBackground: {
  position: 'absolute', top: 0, left: 0, right: 0, height: 220, overflow: 'hidden',
},
```

**Verify:** Open paywall after completing onboarding. Top 220pt shows ghosted colored dots (the user's actual shifts) fading into the dark background.

- [x] **DONE**

---

## TASK 2.14 — Redesign `PaywallScreen.tsx` — Section 2: Social Proof Bar

**File:** `src/screens/subscription/PaywallScreen.tsx`

After the blurred calendar (top of the `ScrollView` content, before the title), add:

```tsx
<View style={styles.socialProofBar}>
  <Text style={styles.socialStars}>★★★★★</Text>
  <Text style={styles.socialProofText}>
    {t('subscription.paywall.socialProof', {
      defaultValue: '4.8 · Trusted by 50,000+ shift workers',
    })}
  </Text>
</View>
```

Add styles:

```typescript
socialProofBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8, marginTop: 16 },
socialStars: { color: theme.colors.paleGold, fontSize: 14, letterSpacing: 1 },
socialProofText: { color: theme.colors.dust, fontSize: 13 },
```

**Verify:** Stars and social proof text visible above the headline.

- [x] **DONE**

---

## TASK 2.15 — Redesign `PaywallScreen.tsx` — Section 3: New Headline + Subheadline

**File:** `src/screens/subscription/PaywallScreen.tsx`

Find the existing `title` and `subtitle` text elements. Update the i18n keys they reference:

- Title renders: `"Your year is ready."`
- Subtitle renders: `"Every shift. Every day off. Yours to unlock."`

Also update `src/i18n/locales/en/common.json` (do this now, as part of this task):

```json
"title": "Your year is ready.",
"subtitle": "Every shift. Every day off. Yours to unlock."
```

**Verify:** Paywall shows "Your year is ready." as headline, not "Ellie Pro".

- [x] **DONE**

---

## TASK 2.16 — Redesign `PaywallScreen.tsx` — Section 4: Testimonials Carousel

**File:** `src/screens/subscription/PaywallScreen.tsx`

Add testimonials between the subheadline and the feature list:

```typescript
const CARD_WIDTH = Dimensions.get('window').width - 48;
const TESTIMONIALS = [
  {
    quote: "Finally know when I'm working Christmas. Changed my life.",
    author: 'Sarah K.',
    role: 'Nurse, 12-hour rotating shifts',
    stars: 5,
  },
  {
    quote: 'Showed my wife my whole year roster in under a minute.',
    author: 'Dave L.',
    role: 'Firefighter, FIFO roster',
    stars: 5,
  },
  {
    quote: 'Booked flights 3 months out without calling HR once.',
    author: 'Jason M.',
    role: 'Mine worker, 7/7 FIFO',
    stars: 5,
  },
];
const [activeTestimonial, setActiveTestimonial] = useState(0);
```

```tsx
<View style={styles.testimonialsSection}>
  <ScrollView
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    snapToInterval={CARD_WIDTH + 12}
    decelerationRate="fast"
    onMomentumScrollEnd={(e) => {
      setActiveTestimonial(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)));
    }}
  >
    {TESTIMONIALS.map((t, i) => (
      <View key={i} style={[styles.testimonialCard, { width: CARD_WIDTH }]}>
        <Text style={styles.testimonialStars}>{'★'.repeat(t.stars)}</Text>
        <Text style={styles.testimonialQuote}>"{t.quote}"</Text>
        <Text style={styles.testimonialAuthor}>
          — {t.author}, {t.role}
        </Text>
      </View>
    ))}
  </ScrollView>
  <View style={styles.testimonialDots}>
    {TESTIMONIALS.map((_, i) => (
      <View key={i} style={[styles.dot, activeTestimonial === i && styles.dotActive]} />
    ))}
  </View>
</View>
```

Add styles from masterplan (testimonialCard, testimonialStars, testimonialQuote, testimonialAuthor, testimonialDots, dot, dotActive).

**Verify:** 3 testimonial cards are horizontally scrollable. Dot indicators update on scroll.

- [x] **DONE**

---

## TASK 2.17 — Redesign `PaywallScreen.tsx` — Section 5: Outcome-Focused Feature List

**File:** `src/screens/subscription/PaywallScreen.tsx`
**File:** `src/i18n/locales/en/common.json`

Update feature copy in `common.json`:

```json
"features": {
  "fullYear":      "See every shift for the next 365 days",
  "askRoster":     "Ask Ellie anything — \"When's my next day off?\"",
  "offline":       "Works underground with zero signal",
  "leavePlanning": "Plan holidays without calling HR",
  "aiPowered":     "AI that knows YOUR exact pattern, not a generic one"
}
```

Update icons in `PaywallScreen.tsx` where the feature list is rendered:

- `leavePlanning`: change icon from `chatbubble-ellipses-outline` → `airplane-outline`
- `aiPowered`: change icon from `flash-outline` → `sparkles-outline`

**Verify:** Feature list shows 5 items with updated outcome-focused copy. `airplane-outline` and `sparkles-outline` icons render correctly.

- [x] **DONE**

---

## TASK 2.18 — Redesign `PaywallScreen.tsx` — Section 6: Loss Aversion Block

**File:** `src/screens/subscription/PaywallScreen.tsx`

After the feature list, add:

```tsx
<View style={styles.lossAversion}>
  <Ionicons name="lock-closed-outline" size={14} color={theme.colors.shadow} />
  <Text style={styles.lossAversionText}>
    {t('subscription.paywall.lossAversion', {
      defaultValue: 'Without Pro, you can only see 2 weeks of your roster.',
    })}
  </Text>
</View>
```

Add styles:

```typescript
lossAversion: {
  flexDirection: 'row', alignItems: 'center', gap: 6,
  paddingHorizontal: 16, paddingVertical: 8,
  backgroundColor: 'rgba(120, 113, 108, 0.15)', borderRadius: 8, marginBottom: 16,
},
lossAversionText: { fontSize: 13, color: theme.colors.shadow, flex: 1 },
```

**Verify:** Lock icon + "Without Pro, you can only see 2 weeks of your roster." renders between features and timer.

- [x] **DONE**

---

## TASK 2.19 — Redesign `PaywallScreen.tsx` — Section 7: Urgency Timer

**File:** `src/screens/subscription/PaywallScreen.tsx`

Add timer state:

```typescript
const [secondsLeft, setSecondsLeft] = useState(600);
useEffect(() => {
  const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
  return () => clearInterval(interval);
}, []);
const timerText = `${Math.floor(secondsLeft / 60)
  .toString()
  .padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
```

Render before the plans section:

```tsx
{
  secondsLeft > 0 && (
    <View style={styles.timerRow}>
      <Ionicons name="time-outline" size={14} color={theme.colors.sacredGold} />
      <Text style={styles.timerText}>
        {t('subscription.paywall.timerLabel', { defaultValue: 'Introductory offer ends in' })}{' '}
        {timerText}
      </Text>
    </View>
  );
}
```

Add styles: `timerRow` and `timerText` from masterplan.

**Verify:** Timer counts down from 09:59. Disappears when it hits 00:00. Resets if paywall is dismissed and reopened (useState resets on unmount).

- [x] **DONE**

---

## TASK 2.20 — Redesign `PaywallScreen.tsx` — Section 8: Redesigned Plans (Decoy Pricing)

**File:** `src/screens/subscription/PaywallScreen.tsx`

Add `annualMonthlyEquivalent` computation:

```typescript
const annualMonthlyEquivalent = useMemo(() => {
  if (!annualPackage) return '$2.99';
  const monthlyEq = annualPackage.product.price / 12;
  const currencySymbol = annualPackage.product.currencySymbol ?? '$';
  return `${currencySymbol}${monthlyEq.toFixed(2)}`;
}, [annualPackage]);
```

Replace the existing plan selection UI with the new two-card layout from the masterplan:

- Annual card: dominant, gold border (`borderWidth: 2, borderColor: theme.colors.paleGold`), "BEST VALUE" badge top-right corner, shows per-month equivalent below plan name, shows strikethrough monthly price on the right
- Monthly card: smaller, de-emphasized, monthly price in grey

Add all styles from masterplan: `planOptionAnnual`, `bestValueBadge`, `bestValueText`, `planMonthlyEquivalent`, `planPriceStrikethrough`, `planPriceMonthly`.

**Verify:** Annual card is visually dominant. "BEST VALUE" badge shows. Per-month equivalent shows (e.g., "$2.99/month"). Strikethrough monthly price shows. Monthly card is smaller and grey-toned. Tapping each card fires `paywallPlanSelected` analytics event.

- [x] **DONE**

---

## TASK 2.21 — Redesign `PaywallScreen.tsx` — Section 9: Pulsing CTA

**File:** `src/screens/subscription/PaywallScreen.tsx`

Add pulsing animation:

```typescript
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const ctaPulse = useSharedValue(1);
useEffect(() => {
  ctaPulse.value = withRepeat(
    withSequence(
      withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    false
  );
}, [ctaPulse]);
const ctaAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaPulse.value }] }));
```

Wrap the existing CTA `LinearGradient` in `<Animated.View style={ctaAnimatedStyle}>`.

Add `arrow-forward` Ionicon to the right of the CTA text:

```tsx
<Text style={styles.ctaText}>{t('subscription.paywall.cta', { defaultValue: 'Start Free 7-Day Trial' })}</Text>
<Ionicons name="arrow-forward" size={18} color={theme.colors.deepVoid} style={{ marginLeft: 6 }} />
```

**Verify:** CTA button gently pulses (scale 1.00 ↔ 1.02). Arrow icon visible to the right of the text.

- [x] **DONE**

---

## TASK 2.22 — Redesign `PaywallScreen.tsx` — Sections 10–13: Trust Row, Value Frame, Security, Footer

**File:** `src/screens/subscription/PaywallScreen.tsx`

**Section 10 — Replace `noCard` with 3-icon trust row:**

```tsx
<View style={styles.trustRow}>
  <View style={styles.trustItem}>
    <Ionicons name="calendar-outline" size={14} color={theme.colors.dust} />
    <Text style={styles.trustText}>
      {t('subscription.paywall.trust.freeTrial', { defaultValue: '7 days free' })}
    </Text>
  </View>
  <View style={styles.trustDivider} />
  <View style={styles.trustItem}>
    <Ionicons name="close-circle-outline" size={14} color={theme.colors.dust} />
    <Text style={styles.trustText}>
      {t('subscription.paywall.trust.cancel', { defaultValue: 'Cancel anytime' })}
    </Text>
  </View>
  <View style={styles.trustDivider} />
  <View style={styles.trustItem}>
    <Ionicons name="card-outline" size={14} color={theme.colors.dust} />
    <Text style={styles.trustText}>
      {t('subscription.paywall.trust.noCharge', { defaultValue: 'No charge today' })}
    </Text>
  </View>
</View>
```

**Section 11 — Value framing:**

```tsx
<Text style={styles.valueFrame}>
  {t('subscription.paywall.valueFrame', {
    defaultValue: 'Less than a coffee per week to know your entire year.',
  })}
</Text>
```

**Section 12 — Security row:**

```tsx
<View style={styles.securityRow}>
  <Ionicons name="lock-closed" size={12} color={theme.colors.shadow} />
  <Text style={styles.securityText}>
    {t('subscription.paywall.security', {
      platform: Platform.OS === 'ios' ? 'Apple' : 'Google',
      defaultValue: `Secure payment via ${Platform.OS === 'ios' ? 'Apple' : 'Google'} · Not stored by Ellie`,
    })}
  </Text>
</View>
```

**Section 13 — Footer: add Terms link:**
Find the existing footer with Restore + Privacy. Add a third link:

```tsx
<Text style={styles.footerDot}>·</Text>
<TouchableOpacity onPress={() => { /* navigate to Terms */ }}>
  <Text style={styles.footerLink}>{t('subscription.paywall.termsOfService', { defaultValue: 'Terms' })}</Text>
</TouchableOpacity>
```

Add all styles from masterplan (trustRow, trustItem, trustDivider, trustText, valueFrame, securityRow, securityText).

**Verify:** Trust row shows 3 items with dividers. Value framing text visible. Security row visible. Footer shows Restore · Privacy · Terms.

- [x] **DONE**

---

## TASK 2.23 — Update `src/i18n/locales/en/common.json` — All New Paywall Keys

**File:** `src/i18n/locales/en/common.json`
Read the file. Find the `subscription.paywall` object. Add/update all keys from the masterplan:

```json
"subscription": {
  "paywall": {
    "closeA11y": "Close paywall",
    "title": "Your year is ready.",
    "subtitle": "Every shift. Every day off. Yours to unlock.",
    "socialProof": "4.8 · Trusted by 50,000+ shift workers",
    "testimonials": [
      { "quote": "Finally know when I'm working Christmas. Changed my life.", "author": "Sarah K., Nurse — 12h rotating shifts" },
      { "quote": "Showed my wife my whole year roster in under a minute.", "author": "Dave L., Firefighter — FIFO roster" },
      { "quote": "Booked flights 3 months out without calling HR once.", "author": "Jason M., Mine worker — 7/7 FIFO" }
    ],
    "features": {
      "fullYear":      "See every shift for the next 365 days",
      "askRoster":     "Ask Ellie anything — \"When's my next day off?\"",
      "offline":       "Works underground with zero signal",
      "leavePlanning": "Plan holidays without calling HR",
      "aiPowered":     "AI that knows YOUR exact pattern, not a generic one"
    },
    "lossAversion": "Without Pro, you can only see 2 weeks of your roster.",
    "timerLabel": "Introductory offer ends in",
    "plans": {
      "annual": "Annual",
      "monthly": "Monthly",
      "annualSuffix": "/yr",
      "monthlySuffix": "/mo",
      "bestValue": "BEST VALUE",
      "perMonth": "/month"
    },
    "cta": "Start Free 7-Day Trial",
    "trust": {
      "freeTrial": "7 days free",
      "cancel": "Cancel anytime",
      "noCharge": "No charge today"
    },
    "valueFrame": "Less than a coffee per week to know your entire year.",
    "security": "Secure payment via {{platform}} · Processed by {{platform}}, not Ellie",
    "noCard": "No credit card required · Cancel anytime",
    "restorePurchases": "Restore",
    "privacyPolicy": "Privacy",
    "termsOfService": "Terms"
  }
}
```

**Verify:** All `t('subscription.paywall.*')` calls in PaywallScreen resolve correctly. No missing translation warnings.

- [x] **DONE**

---

## TASK 2.24 — Update All 10 Other Locale Files (Paywall Keys)

**Files:** All locale files in `src/i18n/locales/` except `en/`:

- `ar/common.json`, `af/common.json`, `hi/common.json`, `id/common.json`, `fr/common.json`, `es/common.json`, `pt-BR/common.json`, `ru/common.json`, `zh-CN/common.json`, `zu/common.json`

For each file: add the same new keys with **English values as placeholders**. Translations can be updated later. The `defaultValue` fallbacks in the component code handle untranslated keys gracefully.

Minimum: add `title`, `subtitle`, `cta`, `socialProof`, `lossAversion`, `timerLabel`, `trust.*`, `valueFrame`, `termsOfService`, `features.*` keys with English fallback strings to each locale file.

**Verify:** App renders correctly in all 10 other languages. No i18n key missing warnings. Title shows "Your year is ready." in all locales until translations are added.

- [x] **DONE**

---

## TASK 2.25 — Update `src/i18n/locales/en/onboarding.json` — AhaMoment Keys

**File:** `src/i18n/locales/en/onboarding.json`
Read the file. Add a new `ahaMoment` section:

```json
"ahaMoment": {
  "headline": "Your year, mapped.",
  "subheadline": "Every shift. Every day off.",
  "heyEllieTitle": "Ask Ellie about your roster",
  "ctaPrimary": "Unlock Full Access — Free 7-Day Trial",
  "ctaSecondary": "Continue with Limited Access →"
}
```

Update `PremiumAhaMomentScreen.tsx` to use `t('ahaMoment.headline')` etc. for all text.

**Verify:** All strings in AhaMoment screen come from i18n keys.

- [x] **DONE**

---

## TASK 2.26 — Sprint 2 End-to-End Verification

Walk through the complete new onboarding flow from a fresh install:

- [ ] Welcome → tapping "Set Up My Roster →" → lands on **ShiftSystem** (not Introduction)
- [ ] Progress bar shows steps 1–7
- [ ] ShiftSystem swipe works identically (DO NOT HAVE CHANGED)
- [ ] RosterType swipe works identically
- [ ] ShiftPattern card selection works
- [ ] PhaseSelector swipe works identically
- [ ] StartDate calendar works
- [ ] After StartDate → lands on **AhaMoment** (not ShiftTimeInput)
- [ ] AhaMoment shows year calendar populated with correct shift pattern colors
- [ ] AhaMoment stats row shows accurate numbers
- [ ] Tapping suggestion chip opens VoiceAssistantModal + sends query without voice
- [ ] Tapping Hey Ellie mic button opens modal for manual voice input
- [ ] `aha_moment_voice_tried` fires in Firebase DebugView
- [ ] Tapping "Unlock Full Access" opens PaywallScreen as modal
- [ ] PaywallScreen: dismiss button delayed 4s ✓, blurred calendar ✓, social proof ✓, new headline ✓, testimonials scroll ✓, BEST VALUE badge ✓, per-month equivalent ✓, timer counts down ✓, CTA pulses ✓, trust row ✓, 3 footer links ✓
- [ ] After paywall dismiss → navigates to ShiftTimeInput
- [ ] ShiftTimeInput → Completion flow unaffected

- [ ] **SPRINT 2 VERIFIED**

---

---

# SPRINT 3 — WELCOME SCREEN UPGRADE

### Goal: Remove auto-advance. Add social proof. Update copy. Deploy.

---

## TASK 3.1 — Remove Auto-Advance Timer from `PremiumWelcomeScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
Read the file. Find lines 87–93 (the `setTimeout` block inside `useEffect`):

```typescript
autoAdvanceTimerRef.current = setTimeout(() => {
  if (onContinue) {
    onContinue();
  } else {
    goToNextScreen(navigation, 'Welcome');
  }
}, ANIMATION_TIMINGS.AUTO_ADVANCE);
```

Delete this `setTimeout` block entirely.
Also delete the `autoAdvanceTimerRef` cleanup in the `useEffect` return:

```typescript
return () => {
  if (autoAdvanceTimerRef.current) {
    clearTimeout(autoAdvanceTimerRef.current);
  }
};
```

Also remove `autoAdvanceTimerRef` from the dependency array and from its declaration (`const autoAdvanceTimerRef = useRef...`).

Remove `AUTO_ADVANCE: 3000` from `ANIMATION_TIMINGS`.

Also remove the clearTimeout call from `handleContinue` (lines 113–115):

```typescript
if (autoAdvanceTimerRef.current) {
  clearTimeout(autoAdvanceTimerRef.current);
}
```

**Verify:** Welcome screen stays on screen indefinitely. User must tap the button. Screen does NOT advance automatically after 3 seconds.

- [x] **DONE**

---

## TASK 3.2 — Update `welcome.tagline` i18n Key

**File:** `src/i18n/locales/en/onboarding.json`
Find the `welcome.tagline` key. Update its value to:

```json
"tagline": "Know every shift for the entire year. In 60 seconds."
```

**Verify:** Welcome screen tagline reads "Know every shift for the entire year. In 60 seconds."

- [x] **DONE**

---

## TASK 3.3 — Update `welcome.getStarted` i18n Key

**File:** `src/i18n/locales/en/onboarding.json`
Find the `welcome.getStarted` key. Update its value to:

```json
"getStarted": "Set Up My Roster →"
```

**Verify:** Welcome screen button reads "Set Up My Roster →".

- [x] **DONE**

---

## TASK 3.4 — Add Social Proof Row to `PremiumWelcomeScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
Read the file. Find the `content` View (around line 156). It contains: logoContainer → nameContainer → tagline → buttonContainer.

Between the `tagline` and the `buttonContainer`, add a new `Animated.View`:

```tsx
<Animated.View style={styles.socialProofRow} entering={FadeIn.delay(1200).duration(400)}>
  <Text style={styles.socialProofStars}>★★★★★</Text>
  <Text style={styles.socialProofText}>50,000+ shift workers</Text>
</Animated.View>
```

Import `FadeIn` from `react-native-reanimated`.

Add styles:

```typescript
socialProofRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginBottom: theme.spacing.lg,
},
socialProofStars: {
  color: theme.colors.sacredGold,
  fontSize: 12,
  letterSpacing: 2,
},
socialProofText: {
  color: theme.colors.dust,
  fontSize: 13,
},
```

**Verify:** After the button animation completes (~1.2s), social proof row fades in below the tagline. Row is visible before the button.

- [x] **DONE**

---

## TASK 3.5 — Sprint 3 Verification

- [ ] Welcome screen does NOT auto-advance after 3 seconds
- [ ] Tagline reads "Know every shift for the entire year. In 60 seconds."
- [ ] Button reads "Set Up My Roster →"
- [ ] Social proof row appears after button animation (~1.2s delay)
- [ ] Tapping "Set Up My Roster →" navigates to ShiftSystem (verified in Task 2.11)
- [ ] Analytics: `onboarding_step_viewed` fires with `step: 'welcome'` on mount

- [ ] **SPRINT 3 VERIFIED**

---

---

# SPRINT 4 — HABIT FORMATION + RETENTION

### Goal: Notification priming. Next-shift countdown. Daily check-in picker. Re-engagement sequence.

---

## TASK 4.1 — Create `src/components/onboarding/NotificationPrimingModal.tsx`

**File to create:** `src/components/onboarding/NotificationPrimingModal.tsx`

This is a full-screen `Modal` that slides up after the completion confetti. Presents the notification soft-ask before triggering the OS system dialog.

```typescript
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

interface NotificationPrimingModalProps {
  visible: boolean;
  onAllow: () => void;   // triggers real system permission request
  onDecline: () => void; // saves soft-declined flag, no OS dialog
}

export const NotificationPrimingModal: React.FC<NotificationPrimingModalProps> = ({
  visible, onAllow, onDecline,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="notifications-outline" size={52} color={theme.colors.sacredGold} style={styles.icon} />
          <Text style={styles.title}>Never miss a shift</Text>
          <Text style={styles.body}>
            Ellie will remind you 24 hours and 4 hours before every shift.{'\n'}You control what and when.
          </Text>
          <TouchableOpacity style={styles.allowButton} onPress={onAllow}>
            <Text style={styles.allowText}>Turn On Reminders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: theme.spacing.xl, alignItems: 'center', paddingBottom: 48,
  },
  icon: { marginBottom: theme.spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.paper, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: theme.colors.dust, textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.xl },
  allowButton: {
    width: '100%', backgroundColor: theme.colors.sacredGold,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  allowText: { fontSize: 16, fontWeight: '700', color: theme.colors.deepVoid },
  declineButton: { paddingVertical: 8 },
  declineText: { fontSize: 15, color: theme.colors.dust },
});
```

**Verify:** Modal renders correctly. "Turn On Reminders" calls `onAllow`. "Not now" calls `onDecline`. No system dialog appears on "Not now".

- [x] **DONE**

---

## TASK 4.2 — Add Notification Modal to `PremiumCompletionScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`
Read the file. Understand the `saveOnboardingData` function and where `setIsSaved(true)` is called (around line 359).

**Step 1:** Add imports:

```typescript
import { NotificationPrimingModal } from '@/components/onboarding/NotificationPrimingModal';
import { Analytics } from '@/utils/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import notificationService if not already imported
```

**Step 2:** Add state:

```typescript
const [showNotificationModal, setShowNotificationModal] = useState(false);
```

**Step 3:** In the `saveOnboardingData` success path, after `setIsSaved(true)`, add:

```typescript
// Show notification priming modal 1.5s after celebration starts
setTimeout(() => {
  Analytics.notificationPermissionSoftShown();
  setShowNotificationModal(true);
}, 1500);
```

**Step 4:** Add modal to the JSX return, after the `ScrollView`:

```tsx
<NotificationPrimingModal
  visible={showNotificationModal}
  onAllow={async () => {
    setShowNotificationModal(false);
    const granted = await notificationService.requestPermissions();
    Analytics[granted ? 'notificationPermissionGranted' : 'notificationPermissionDeclined']();
  }}
  onDecline={() => {
    setShowNotificationModal(false);
    void AsyncStorage.setItem('notifications:soft_declined', 'true');
    Analytics.notificationPermissionDeclined();
  }}
/>
```

**Verify:** After completing onboarding and data saves, notification modal appears ~1.5s later. "Not now" closes modal, does NOT trigger OS dialog, stores `'notifications:soft_declined': 'true'` in AsyncStorage. "Turn On Reminders" triggers OS permission dialog.

- [x] **DONE**

---

## TASK 4.3 — Add Next-Shift Countdown to `PremiumCompletionScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`

Add a `useMemo` to compute the next upcoming shift:

```typescript
const nextShiftCountdown = useMemo(() => {
  if (!data.startDate || !data.patternType) return null;
  const cycle = buildShiftCycle(data);
  if (!cycle) return null;
  const today = new Date();
  const end = new Date(today.getFullYear() + 1, 11, 31);
  const shiftDays = getShiftDaysInRange(cycle, today, end);
  const next = shiftDays.find((d) => d.type !== 'off' && new Date(d.date) > today);
  if (!next) return null;
  const nextDate = new Date(next.date);
  const daysAway = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { date: nextDate, daysAway, shiftType: next.type };
}, [data]);
```

Import `buildShiftCycle` and `getShiftDaysInRange` from `@/utils/shiftUtils`.

In the summary card (in `styles.summaryCard`), after the existing summary rows, add:

```tsx
{
  nextShiftCountdown && (
    <View style={styles.countdownRow}>
      <Ionicons name="time-outline" size={20} color={theme.colors.sacredGold} />
      <Text style={styles.countdownText}>
        Next shift in {nextShiftCountdown.daysAway} day
        {nextShiftCountdown.daysAway !== 1 ? 's' : ''} (
        {nextShiftCountdown.date.toLocaleDateString()})
      </Text>
    </View>
  );
}
```

Add styles:

```typescript
countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
countdownText: { fontSize: 14, color: theme.colors.paper, flex: 1 },
```

**Verify:** Next shift date in the summary card matches manual calculation using the pattern + start date + phase offset.

- [x] **DONE**

---

## TASK 4.4 — Add Daily Check-In Time Picker to `PremiumCompletionScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`

Add state for selected check-in time:

```typescript
const [selectedCheckIn, setSelectedCheckIn] = useState<string | null>(null);
```

Find the feature pills section and the "Get Started" button. Between them, add:

```tsx
<View style={styles.checkInSection}>
  <Text style={styles.checkInTitle}>When do you check your schedule?</Text>
  <View style={styles.checkInOptions}>
    {(['Morning', 'Midday', 'Evening'] as const).map((time, i) => {
      const hours = [7, 12, 18][i];
      return (
        <TouchableOpacity
          key={time}
          style={[styles.checkInChip, selectedCheckIn === time && styles.checkInChipSelected]}
          onPress={() => {
            setSelectedCheckIn(time);
            void notificationService.scheduleDaily(
              hours,
              'Your schedule today',
              'Tap to see your upcoming shifts.'
            );
          }}
        >
          <Text
            style={[
              styles.checkInChipText,
              selectedCheckIn === time && styles.checkInChipTextSelected,
            ]}
          >
            {time}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
```

Add styles:

```typescript
checkInSection: { marginVertical: theme.spacing.lg, alignItems: 'center' },
checkInTitle: { fontSize: 15, color: theme.colors.dust, marginBottom: 12, textAlign: 'center' },
checkInOptions: { flexDirection: 'row', gap: 12 },
checkInChip: {
  paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  borderWidth: 1, borderColor: theme.colors.softStone,
},
checkInChipSelected: { borderColor: theme.colors.sacredGold, backgroundColor: 'rgba(212,168,106,0.1)' },
checkInChipText: { fontSize: 14, color: theme.colors.dust },
checkInChipTextSelected: { color: theme.colors.sacredGold, fontWeight: '600' },
```

**Verify:** Three chips (Morning, Midday, Evening) appear. Tapping one selects it visually and calls `notificationService.scheduleDaily()`.

- [x] **DONE**

---

## TASK 4.5 — Add `scheduleDaily()` to `NotificationService.ts`

**File:** `src/services/NotificationService.ts`
Read the file. Find the class. Add a new public method:

```typescript
/**
 * Schedule a recurring daily notification at a specific hour.
 * Used by the completion screen check-in time picker.
 */
async scheduleDaily(hour: number, title: string, body: string): Promise<void> {
  if (!this.scheduler) return;
  // expo-notifications trigger: { hour, minute: 0, repeats: true }
  await this.scheduler.scheduleNotification(
    { title, body },
    { hour, minute: 0, repeats: true } as never
  );
}
```

**Note:** Verify how `this.scheduler.scheduleNotification` accepts a recurring trigger in your existing `INotificationScheduler` interface. Adjust the trigger type if needed to match the interface.

**Verify:** Calling `scheduleDaily(7, 'test', 'test body')` results in a scheduled daily notification visible in `expo-notifications` pending list (`Notifications.getAllScheduledNotificationsAsync()`).

- [x] **DONE**

---

## TASK 4.6 — Add `scheduleOnboardingEngagementSequence()` to `NotificationService.ts`

**File:** `src/services/NotificationService.ts`

Add a private helper and the main public method:

```typescript
// Private helper
private addDays(base: Date, days: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Schedule 6 re-engagement notifications for the first 30 days.
 * Called from PremiumCompletionScreen on successful onboarding save.
 */
async scheduleOnboardingEngagementSequence(userName: string): Promise<void> {
  if (!this.scheduler) return;
  const now = new Date();

  const notifications = [
    {
      trigger: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0),
      title: 'Your roster is live',
      body: 'See what shifts are coming up this week. Tap to open your calendar.',
    },
    {
      trigger: this.addDays(now, 1, 8),
      title: `Morning, ${userName}! 👋`,
      body: 'Did you know you can ask Ellie "When am I next off?" — try it now.',
    },
    {
      trigger: this.addDays(now, 2, 18),
      title: 'Your month at a glance',
      body: 'Check your shift balance for this month. Open Ellie to see.',
    },
    {
      trigger: this.addDays(now, 6, 9),
      title: 'One week with Ellie 🎉',
      body: "You've mapped your shifts for the entire year. Keep it up.",
    },
    {
      trigger: this.addDays(now, 13, 9),
      title: 'Pattern cycle update',
      body: 'Your roster cycle changes soon. Ellie has already updated your calendar.',
    },
    {
      trigger: this.addDays(now, 29, 9),
      title: '30 days of shift certainty',
      body: "Your next month is mapped. Tap to see what's coming.",
    },
  ];

  for (const n of notifications) {
    if (n.trigger > now) {
      await this.scheduler.scheduleNotification({ title: n.title, body: n.body }, n.trigger);
    }
  }
}
```

**Verify:** After calling `scheduleOnboardingEngagementSequence('Alex')`, `Notifications.getAllScheduledNotificationsAsync()` shows 6 future-dated notifications. Titles are correct. Day 1 trigger is today at 6 PM.

- [x] **DONE**

---

## TASK 4.7 — Call `scheduleOnboardingEngagementSequence()` from `PremiumCompletionScreen.tsx`

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`

In the `saveOnboardingData` success path, after `setIsSaved(true)` and the notification modal trigger (from Task 4.2), add:

```typescript
// Schedule 30-day re-engagement notification sequence
const firstName = data.name ? data.name.split(' ')[0] : 'there';
void notificationService.scheduleOnboardingEngagementSequence(firstName);
```

**Note:** Even if `data.name` is null (Introduction was skipped), use `'there'` as fallback so the Day 2 notification reads "Morning, there! 👋" — acceptable until the user fills in their profile later.

**Verify:** After completing onboarding, `getAllScheduledNotificationsAsync()` shows 6 notifications. Notification at Day 2 shows first name if available.

- [x] **DONE**

---

## TASK 4.8 — Sprint 4 Verification

- [ ] Completing onboarding → 1.5s after save → notification soft-ask modal appears
- [ ] "Not now" → modal closes, NO system dialog, AsyncStorage `'notifications:soft_declined' = 'true'`
- [ ] "Turn On Reminders" → OS system dialog appears
- [ ] Analytics: `notification_soft_ask_shown` fires. `notification_permission_granted` or `_declined` fires depending on response
- [ ] Next-shift countdown shows in the completion summary card with correct date
- [ ] Morning/Midday/Evening chips visible above "Get Started" button
- [ ] Tapping a chip schedules a daily notification and selects it visually
- [ ] 6 re-engagement notifications scheduled in `Notifications.getAllScheduledNotificationsAsync()`
- [ ] Day 1 notification trigger: today at 6 PM
- [ ] Day 7 notification trigger: 6 days from today at 9 AM

- [ ] **SPRINT 4 VERIFIED**

---

---

# SPRINT 5 — DASHBOARD FIRST IMPRESSION

### Goal: Post-onboarding checklist. "Add shift times" CTA on dashboard. Profile completion accessible.

---

## TASK 5.1 — Create `src/components/dashboard/OnboardingChecklist.tsx`

**File to create:** `src/components/dashboard/OnboardingChecklist.tsx`

Read `src/screens/main/MainDashboardScreen.tsx` first to understand component patterns.

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/utils/theme';

interface ChecklistItem {
  key: string;
  label: string;
  storageKey: string;
  onDoIt: () => void;
}

interface OnboardingChecklistProps {
  onDismiss: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onDismiss }) => {
  const navigation = useNavigation<any>();
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Roster setup is always done (user just completed onboarding)
  const items: ChecklistItem[] = [
    {
      key: 'roster',
      label: 'Set up your roster',
      storageKey: 'checklist:roster_done',
      onDoIt: () => {},  // already done
    },
    {
      key: 'shift_times',
      label: 'Add your shift times',
      storageKey: 'checklist:shift_times_done',
      onDoIt: () => {
        void AsyncStorage.setItem('checklist:shift_times_done', 'true');
        setCompletedItems(prev => ({ ...prev, shift_times: true }));
        navigation.navigate('Onboarding', { screen: 'ShiftTimeInput', params: { entryPoint: 'settings' } });
      },
    },
    {
      key: 'profile',
      label: 'Complete your profile',
      storageKey: 'checklist:profile_done',
      onDoIt: () => {
        navigation.navigate('Onboarding', { screen: 'Introduction' });
      },
    },
    {
      key: 'ask_ellie',
      label: 'Ask Ellie a question',
      storageKey: 'checklist:ask_ellie_done',
      onDoIt: () => {
        void AsyncStorage.setItem('checklist:ask_ellie_done', 'true');
        setCompletedItems(prev => ({ ...prev, ask_ellie: true }));
        // Navigate to voice assistant tab
        navigation.navigate('Ellie');
      },
    },
    {
      key: 'hourly_rate',
      label: 'Set your hourly rate',
      storageKey: 'checklist:hourly_rate_done',
      onDoIt: () => {
        navigation.navigate('Profile');
      },
    },
  ];

  useEffect(() => {
    // Load completion states from AsyncStorage
    Promise.all(items.map(item => AsyncStorage.getItem(item.storageKey))).then(values => {
      const completed: Record<string, boolean> = { roster: true };
      items.forEach((item, i) => {
        if (values[i] === 'true') completed[item.key] = true;
      });
      setCompletedItems(completed);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get the most out of Ellie</Text>
      {items.map(item => {
        const done = completedItems[item.key] ?? false;
        return (
          <View key={item.key} style={styles.row}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={done ? theme.colors.sacredGold : theme.colors.softStone}
            />
            <Text style={[styles.label, done && styles.labelDone]}>{item.label}</Text>
            {!done && item.key !== 'roster' && (
              <TouchableOpacity style={styles.doItButton} onPress={item.onDoIt}>
                <Text style={styles.doItText}>Do it</Text>
              </TouchableOpacity>
            )}
            {done && <Text style={styles.doneText}>Done</Text>}
          </View>
        );
      })}
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16, marginHorizontal: 0,
    marginBottom: theme.spacing.md, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.softStone,
  },
  title: { fontSize: 15, fontWeight: '700', color: theme.colors.paper, marginBottom: theme.spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(120,113,108,0.15)',
  },
  label: { flex: 1, fontSize: 14, color: theme.colors.paper },
  labelDone: { color: theme.colors.dust, textDecorationLine: 'line-through' },
  doItButton: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, backgroundColor: 'rgba(212,168,106,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,168,106,0.3)',
  },
  doItText: { fontSize: 12, color: theme.colors.sacredGold, fontWeight: '600' },
  doneText: { fontSize: 12, color: theme.colors.dust },
  dismissButton: { marginTop: theme.spacing.md, alignSelf: 'flex-end' },
  dismissText: { fontSize: 13, color: theme.colors.shadow },
});
```

**Verify:** Component renders all 5 items. "Set up your roster" shows as already done. "Do it" buttons navigate to the correct screens. Dismissing calls `onDismiss`.

- [x] **DONE**

---

## TASK 5.2 — Add `OnboardingChecklist` to `MainDashboardScreen.tsx`

**File:** `src/screens/main/MainDashboardScreen.tsx`
Read the file. Find where `CurrentShiftStatusCard` is rendered and where `MonthlyCalendarCard` is rendered.

**Step 1:** Add import:

```typescript
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Step 2:** Add state to load checklist visibility from AsyncStorage:

```typescript
const [showChecklist, setShowChecklist] = useState(false);

useEffect(() => {
  AsyncStorage.getItem('onboarding_checklist:dismissed').then((val) => {
    setShowChecklist(val !== 'true');
  });
}, []);
```

**Step 3:** In the ScrollView, below `CurrentShiftStatusCard` and above `MonthlyCalendarCard`, add:

```tsx
{
  showChecklist && (
    <OnboardingChecklist
      onDismiss={() => {
        void AsyncStorage.setItem('onboarding_checklist:dismissed', 'true');
        setShowChecklist(false);
      }}
    />
  );
}
```

**Verify:** After first onboarding completion, the checklist widget is visible on the dashboard. Tapping "Dismiss" saves the flag and hides the widget. Subsequent app opens do not show the widget.

- [x] **DONE**

---

## TASK 5.3 — Update `CurrentShiftStatusCard`: Add "Add Shift Times" CTA

**File:** Find `CurrentShiftStatusCard` component (likely `src/components/dashboard/CurrentShiftStatusCard.tsx` or similar).
Read the file to understand how it renders.

When shift times are not configured (user skipped `ShiftTimeInput` or is in limited mode), instead of showing exact times (e.g., "06:00 – 18:00"), show a CTA:

Add logic to detect missing shift times — check if `data.shiftTimes` is null/undefined in `OnboardingContext`. When times are missing:

```tsx
{
  !shiftTimesSet && (
    <TouchableOpacity
      style={styles.addTimesRow}
      onPress={() =>
        navigation.navigate('Onboarding', {
          screen: 'ShiftTimeInput',
          params: { entryPoint: 'settings' },
        })
      }
    >
      <Ionicons name="time-outline" size={16} color={theme.colors.sacredGold} />
      <Text style={styles.addTimesText}>Add shift times →</Text>
    </TouchableOpacity>
  );
}
```

Add appropriate styles for `addTimesRow` and `addTimesText`.

**Verify:** After completing onboarding via "Continue with Limited Access" (skipping paywall), the `CurrentShiftStatusCard` shows "Add shift times →" instead of exact times. Tapping navigates to `ShiftTimeInput`.

- [x] **DONE**

---

## TASK 5.4 — Sprint 5 Verification

- [ ] Dashboard first launch after onboarding shows the checklist widget
- [ ] "Set up your roster" row shows as done (checkmark, strikethrough text, "Done" label)
- [ ] "Add your shift times" → tapping "Do it" navigates to ShiftTimeInput
- [ ] "Complete your profile" → tapping "Do it" navigates to Introduction screen
- [ ] "Ask Ellie a question" → tapping "Do it" navigates to voice assistant tab
- [ ] "Set your hourly rate" → tapping "Do it" navigates to Profile
- [ ] Dismissing the checklist hides it permanently (AsyncStorage `'onboarding_checklist:dismissed' = 'true'`)
- [ ] `CurrentShiftStatusCard` shows "Add shift times →" when shift times not set
- [ ] Tapping "Add shift times →" navigates to `ShiftTimeInput`

- [ ] **SPRINT 5 VERIFIED**

---

---

# FINAL VERIFICATION — ALL SPRINTS

Run through the complete end-to-end flow as a new user:

### New User Flow:

- [ ] Install → Welcome screen: no auto-advance, social proof visible, button reads "Set Up My Roster →"
- [ ] Tap "Set Up My Roster →" → lands on ShiftSystem (NOT Introduction)
- [ ] Progress bar shows 1 of 7
- [ ] Complete ShiftSystem swipe (unchanged)
- [ ] Complete RosterType swipe (unchanged, auto-skipped for 3-shift)
- [ ] Complete ShiftPattern card selection (unchanged)
- [ ] Complete PhaseSelector swipe (unchanged)
- [ ] Complete StartDate → lands on AhaMoment
- [ ] AhaMoment: year calendar loads with correct colors and shift pattern
- [ ] AhaMoment stats: work days, night shifts, days off, next shift all accurate
- [ ] AhaMoment Hey Ellie: tap "Am I working Christmas?" → modal opens, query sent, answer received
- [ ] AhaMoment Hey Ellie: tap mic button → modal opens for voice input
- [ ] AhaMoment: tap "Unlock Full Access" → PaywallScreen opens
- [ ] PaywallScreen: dismiss button hidden for 4s, blurred calendar, social proof, new headline, testimonials, BEST VALUE badge, per-month equivalent, timer, pulsing CTA, trust row, value frame, security row, 3 footer links
- [ ] PaywallScreen: complete sandbox trial purchase → `trial_started` fires in Firebase
- [ ] After paywall dismiss → ShiftTimeInput
- [ ] Complete ShiftTimeInput → CompletionScreen
- [ ] CompletionScreen: next-shift countdown visible in summary
- [ ] CompletionScreen: check-in time chips visible (Morning/Midday/Evening)
- [ ] CompletionScreen: 1.5s after save → notification priming modal appears
- [ ] Dashboard: checklist widget visible
- [ ] Dashboard: `CurrentShiftStatusCard` shows "Add shift times →" if skipped
- [ ] Firebase Analytics: full funnel visible with correct events
- [ ] 6 re-engagement notifications scheduled in `getAllScheduledNotificationsAsync()`

---

## TARGET METRICS

| Metric                              | Industry Average | Ellie Target |
| ----------------------------------- | ---------------- | ------------ |
| Onboarding completion rate          | ~40%             | 75%+         |
| Day 1 retention                     | 18%              | 50%+         |
| Day 7 retention                     | 8%               | 25%+         |
| Day 30 retention                    | 3.5%             | 15%+         |
| Trial conversion (download → trial) | 1.7%             | 10%+         |
| Notification permission opt-in      | ~45%             | 65%+         |

---

_Source: ELLIE_SHIFT_CERTAINTY_MASTERPLAN.md — implement in sprint order, verify each task before checking it off._
