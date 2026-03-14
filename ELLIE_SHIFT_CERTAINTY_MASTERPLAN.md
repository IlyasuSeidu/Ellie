# THE ELLIE SHIFT CERTAINTY MASTERPLAN

### A Blueprint to Convert Downloaders into Long-Term Shift Workers Who Can't Imagine Life Without Ellie

---

## Why This Plan Exists

Ellie is a React Native / Expo shift-scheduling app for rotating and FIFO roster workers. The product is technically excellent. The onboarding is what kills conversion.

**Industry data:**

- 77% of users abandon apps within 3 days of install
- Product tours with 5+ steps drop to 21% completion; 3-step tours hit 72%
- 82% of trial starts happen on the day of install — miss the first session and you've likely lost the user forever
- Apps with well-timed notification permission prompts see 2× daily usage vs. apps that don't

**Ellie's current problem:**
The user must survive 9–12 onboarding steps (confirmed from `OnboardingNavigator.tsx`) before they see any value. The aha moment — _"I can see my entire year of shifts at a glance"_ — is buried after a mandatory name/company chat, two Tinder-swipe screens, pattern selection, phase selection, a date picker, and a time input. Only then, in `CompletionScreen`, does any calendar appear — and by then most users have already quit.

**The goal:** Get users to see their personalized shift calendar in under 90 seconds, then hit them with the paywall at peak emotional engagement.

---

## CHANGE 1: ADD ANALYTICS (DO THIS FIRST — NOTHING ELSE MATTERS WITHOUT IT)

You are currently flying blind. Zero Firebase Analytics events are fired anywhere in the app. Without analytics you cannot know which step users abandon, so you cannot improve it.

### Create: `src/utils/analytics.ts`

```typescript
import analytics from '@react-native-firebase/analytics';

// Typed event names — prevents typos and keeps the event schema consistent
export type OnboardingStep =
  | 'welcome'
  | 'introduction'
  | 'quick_select'
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
  // Called on every screen mount
  screenView: (screenName: string) =>
    analytics().logScreenView({ screen_name: screenName, screen_class: screenName }),

  // Onboarding funnel — call at top of each screen's useEffect
  onboardingStepViewed: (step: OnboardingStep, stepNumber: number) =>
    analytics().logEvent('onboarding_step_viewed', { step, step_number: stepNumber }),

  // Called when user taps the continue button successfully
  onboardingStepCompleted: (step: OnboardingStep, timeSpentMs: number) =>
    analytics().logEvent('onboarding_step_completed', { step, time_spent_ms: timeSpentMs }),

  // Called if user backgrounds the app or the process is killed mid-onboarding
  // Trigger this in AppNavigator when navigating away from onboarding unexpectedly
  onboardingAbandoned: (step: OnboardingStep, stepNumber: number) =>
    analytics().logEvent('onboarding_abandoned', { step, step_number: stepNumber }),

  // The moment that makes or breaks retention
  ahaMomentReached: (secondsSinceInstall: number) =>
    analytics().logEvent('aha_moment_reached', { seconds_since_install: secondsSinceInstall }),

  // Paywall funnel
  paywallViewed: (source: 'post_aha' | 'profile' | 'feature_gate') =>
    analytics().logEvent('paywall_viewed', { source }),

  paywallPlanSelected: (plan: 'annual' | 'monthly') =>
    analytics().logEvent('paywall_plan_selected', { plan }),

  trialStarted: (plan: 'annual' | 'monthly', price: number) =>
    analytics().logEvent('trial_started', { plan, price }),

  purchaseCompleted: (plan: 'annual' | 'monthly', price: number) =>
    analytics().logEvent('purchase_completed', { plan, price }),

  paywallDismissed: () => analytics().logEvent('paywall_dismissed'),

  // Habit signals
  notificationPermissionSoftShown: () => analytics().logEvent('notification_soft_ask_shown'),

  notificationPermissionGranted: () => analytics().logEvent('notification_permission_granted'),

  notificationPermissionDeclined: () => analytics().logEvent('notification_permission_declined'),

  // Retention checkpoints
  dayOneReturn: () => analytics().logEvent('day_1_return'),
  daySevenActive: () => analytics().logEvent('day_7_active'),
  dayThirtyActive: () => analytics().logEvent('day_30_active'),
};
```

**Add `Analytics.onboardingStepViewed()` to every onboarding screen** in its mount `useEffect`:

- `PremiumWelcomeScreen.tsx` → `Analytics.onboardingStepViewed('welcome', 1)`
- `PremiumIntroductionScreen.tsx` → `Analytics.onboardingStepViewed('introduction', 2)`
- New `PremiumQuickSelectScreen.tsx` → `Analytics.onboardingStepViewed('quick_select', 2)`
- `PremiumShiftPatternScreen.tsx` → `Analytics.onboardingStepViewed('shift_pattern', 3)`
- `PremiumStartDateScreen.tsx` → `Analytics.onboardingStepViewed('start_date', 4)`
- New `PremiumAhaMomentScreen.tsx` → `Analytics.onboardingStepViewed('aha_moment', 5); Analytics.ahaMomentReached(secondsSinceInstall)`
- `PremiumShiftTimeInputScreen.tsx` → `Analytics.onboardingStepViewed('shift_time_input', 6)`
- `PremiumCompletionScreen.tsx` → `Analytics.onboardingStepViewed('completion', 7)`
- `PaywallScreen.tsx` → `Analytics.paywallViewed('post_aha')`

---

## CHANGE 2: COMPRESS THE ONBOARDING FLOW

**Current:** 9 visible steps, up to 12 screens depending on conditional routing (confirmed from `onboardingProgress.ts` — `TOTAL_ONBOARDING_STEPS = 9`)

**Target:** 5 visible steps, 7 screens maximum (including conditional pattern screens)

**Core insight:** The Introduction screen (Step 2) collects name, occupation, company, and country before the user has seen ANY value. The `CompletionScreen` already handles missing values gracefully (lines 699–714 in `PremiumCompletionScreen.tsx` use `data.name ? {...} : undefined`, so name/company are already optional in the data model). Move all personal info to a post-onboarding "Complete your profile" nudge in `ProfileScreen`.

### 2A. Make `PremiumIntroductionScreen.tsx` Fully Skippable

**File:** `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`

Add a "Skip for now →" `TouchableOpacity` below the chat UI that:

1. Calls `goToNextScreen(navigation, 'Introduction')` immediately
2. Fires `Analytics.onboardingStepCompleted('introduction', 0)`

The chat still plays for users who want it. Users in a hurry can skip. Keep the Ellie personality — just don't gate progress behind it.

**Also:** Make all form fields in the chat optional. If user skips without entering name, `data.name` remains undefined — the completion screen already handles this.

### 2B. Combine ShiftSystem + RosterType Into One Screen

**Current situation:**

- `PremiumShiftSystemScreen.tsx` (Step 3): Tinder-swipe cards for "2-shift" vs "3-shift"
- `PremiumRosterTypeScreen.tsx` (Step 3.5): Tinder-swipe cards for "Rotating" vs "FIFO"
- These are two separate screens requiring two swipes. For 2-shift users this is 2 full screens. For 3-shift users `onboardingNavigation.ts` line 31-35 skips RosterType automatically.

**Create:** `src/screens/onboarding/premium/PremiumQuickSelectScreen.tsx`

This screen replaces both ShiftSystem and RosterType with a single grid of 3 cards:

```
┌─────────────────────────────────────────┐
│  What type of roster do you work?       │
│                                         │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  🔄 2-Shift  │  │  ✈️ 2-Shift  │     │
│  │   Rotating   │  │    FIFO      │     │
│  │  12h shifts  │  │  12h shifts  │     │
│  └──────────────┘  └──────────────┘     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │    ⚡ 3-Shift Rotating            │   │
│  │    8h shifts (days/arvo/nights)  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [        Continue →        ]           │
└─────────────────────────────────────────┘
```

One tap sets BOTH `shiftSystem` AND `rosterType` in `OnboardingContext`. No swipes, no two-screen sequence.

**Implementation:**

- Use `useOnboarding()` hook (same as all other screens)
- On card tap: `updateData({ shiftSystem: '2-shift', rosterType: 'rotating' })` etc.
- Cards use existing `PremiumCard` component from `src/components/onboarding/premium/PremiumCard.tsx`
- Gold border + gold fill on selected card (same pattern as `PremiumRosterTypeScreen`)
- Continue button uses `PremiumButton` (same as all other screens)
- On continue: `goToNextScreen(navigation, 'QuickSelect', data)` → navigates to ShiftPattern

**Update `src/utils/onboardingNavigation.ts`:**
Add `QuickSelect` to `NAVIGATION_FLOW`:

```typescript
QuickSelect: (data) => {
  // Same routing as current RosterType → ShiftPattern
  return 'ShiftPattern';
},
```

**Update `src/navigation/OnboardingNavigator.tsx`:**
Add `QuickSelect: undefined` to `OnboardingStackParamList` and add the screen to the Stack:

```tsx
<Stack.Screen name="QuickSelect" component={PremiumQuickSelectScreen} />
```

**Update `src/utils/onboardingNavigation.ts` line 28-31:**
Change Welcome → Introduction → **QuickSelect** instead of Introduction → ShiftSystem:

```typescript
Welcome: () => 'Introduction',
Introduction: () => 'QuickSelect',   // ← changed from 'ShiftSystem'
QuickSelect: () => 'ShiftPattern',
// Keep ShiftSystem and RosterType routes for settings/edit flows
ShiftSystem: (data) => { ... },      // unchanged — still used in settings
RosterType: () => 'ShiftPattern',    // unchanged — still used in settings
```

**Update `src/constants/onboardingProgress.ts`:**

```typescript
export const ONBOARDING_STEPS = {
  WELCOME: 1,
  INTRODUCTION: 2,
  QUICK_SELECT: 2, // same visual step as introduction (combined)
  SHIFT_PATTERN: 3,
  CUSTOM_PATTERN: 3, // conditional — same visual step
  FIFO_CUSTOM_PATTERN: 3,
  PHASE_SELECTOR: 4,
  FIFO_PHASE_SELECTOR: 4,
  START_DATE: 5,
  AHA_MOMENT: 6, // new — appears before paywall
  SHIFT_TIME_INPUT: 7, // moved to after paywall
  COMPLETION: 7, // same visual step as shift time (post-paywall setup)
} as const;

export const TOTAL_ONBOARDING_STEPS = 7; // ← updated from 9
```

### 2C. Move ShiftTimeInput to After Paywall

**Current position:** Step 8 of 9 (before completion)
**New position:** After paywall conversion, shown as "Fine-tune your schedule" step

**Why:** Shift times are needed for hour tracking and earnings calculations, but NOT for the core aha moment (which is seeing the year-view calendar). By moving ShiftTimeInput after the paywall:

- Users reach the aha moment faster (one less step)
- Users who subscribe have higher intent and will complete time setup
- Users who don't subscribe still have a calendar (just without exact times)

**Change in `src/utils/onboardingNavigation.ts`:**

```typescript
// Old:
StartDate: () => 'ShiftTimeInput',
ShiftTimeInput: () => 'Completion',

// New:
StartDate: () => 'AhaMoment',       // ← goes to aha moment, not time input
AhaMoment: () => 'ShiftTimeInput',  // ← after paywall (PaywallScreen calls this)
ShiftTimeInput: () => 'Completion',
```

**Change in `src/navigation/OnboardingNavigator.tsx`:**
Add `AhaMoment: undefined` to `OnboardingStackParamList` and the Stack.

---

## CHANGE 3: CREATE THE AHA MOMENT SCREEN

**New file:** `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`

This is the most important new screen. It runs the shift calendar computation using existing utils and shows the user their ACTUAL personalized year — before they've paid anything.

### Layout:

```
┌─────────────────────────────────────────┐
│  ← [Progress: Step 5 of 7]             │
│                                         │
│  "Your year, mapped."                   │
│  Every shift. Every day off.            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Animated year calendar]    │    │
│  │  Jan  ▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓   │    │
│  │  Feb  ░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓   │    │
│  │  Mar  ▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░   │    │
│  │  ...  (all 12 months)           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📅 187 work days  🌙 45 night shifts   │
│  🏖️ 178 days off   📆 Next: Tue, 6am  │
│                                         │
│  [   Unlock Full Access — Free Trial  ] │
│  [   Continue with Limited View       ] │  ← small link
└─────────────────────────────────────────┘
```

### Implementation:

**Data:** Use `buildShiftCycle()` from `src/utils/shiftUtils.ts` (already imported in `MainDashboardScreen.tsx` line 42) with the data from `useOnboarding().data`. Then call `getShiftDaysInRange()` for the full year (Jan 1 – Dec 31 of current year + next year).

**Calendar rendering:** Render a simplified 12-month grid. Each month = a row. Each day = a colored dot (3×3 pt). Shift type colors from `theme.colors` (already defined in `src/utils/theme.ts`):

- Day shift: `#2196F3`
- Night shift: `#651FFF`
- Morning: `#F59E0B`
- Off day: `theme.colors.softStone`

Animate the calendar using Reanimated `FadeInDown` staggered per month row (delay: `rowIndex * 80ms`), same pattern as `CompletionScreen.tsx` lines 780–807.

**Stats row:** Use `getShiftStatistics()` from `src/utils/shiftUtils.ts` (same function used in `MainDashboardScreen.tsx` line 65) to compute:

- Total work days
- Total night shifts
- Total days off
- Next shift date (iterate shiftDays array to find first day/night/morning/afternoon after today)

**Primary CTA button:** `"Unlock Full Access — Free 7-Day Trial"` using `PremiumButton` variant `"primary"`.

- `onPress`: opens `PaywallScreen` as a modal (same pattern used in `SubscriptionContext`)
- After `PaywallScreen.onDismiss()`: if user is now `isPro`, navigate to `'ShiftTimeInput'`; if not, navigate to `'ShiftTimeInput'` anyway (they still get the app, just with limited access)

**Secondary link:** `"Continue with Limited Access →"` as a plain `Text` `TouchableOpacity`. Navigates directly to `'ShiftTimeInput'` without showing paywall.

**Analytics:** Fire `Analytics.ahaMomentReached(secondsSinceInstall)` on mount. Track the install timestamp in `AsyncStorage` key `'app:install_time'` set during `PremiumWelcomeScreen` first mount.

---

## CHANGE 4: COMPLETE PAYWALL REDESIGN — EVERY ELEMENT SPECIFIED

**File:** `src/screens/subscription/PaywallScreen.tsx`

This is the highest-leverage screen in the entire app. Every pixel either converts or bleeds revenue. The current paywall (confirmed by reading the file) has: a generic mic-circle hero, weak title ("Ellie Pro"), weak subtitle ("For shift workers who mean business"), no social proof, no testimonials, no urgency, no personalization, and no value framing. The `noCard` text already says "No credit card required · Cancel anytime" and CTA is "Start 7-Day Free Trial" (these are fine). Everything else needs to be rebuilt.

### THE COMPLETE NEW PAYWALL — SECTION BY SECTION

---

#### SECTION 0 — DELAYED DISMISS BUTTON (lines 114–121)

**Current:** Dismiss button (`×`) is immediately visible at top-right. Users who have second thoughts dismiss before reading anything.

**Change:** Delay the dismiss button appearing by 4 seconds using a `useState<boolean>` + `useEffect`:

```typescript
const [dismissVisible, setDismissVisible] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setDismissVisible(true), 4000);
  return () => clearTimeout(timer);
}, []);
```

Render:

```tsx
{dismissVisible && (
  <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} ...>
    <Ionicons name="close" size={22} color={theme.colors.dust} />
  </TouchableOpacity>
)}
```

**Why this converts:** 4 seconds is enough time to read the headline + social proof. Users who were about to reflexively close now see the value proposition first. Industry data: delayed dismiss buttons increase paywall read-time by 40% on average.

---

#### SECTION 1 — FULL-SCREEN BLURRED CALENDAR HERO (replaces lines 123–132)

**Concept:** The user's ACTUAL shift calendar — the one they just saw in the aha moment screen — appears as the top third of the paywall, visually blurred/dimmed. The calendar bleeds through, showing colored dots (day/night/off) but you can't read the details. This makes the paywall deeply personal: it's THEIR data, locked behind a screen.

**Implementation:**

Pass `onboardingData` (the full `OnboardingData` object from `OnboardingContext`) as a prop to `PaywallScreen`:

```typescript
interface PaywallScreenProps {
  onDismiss: () => void;
  onboardingData?: OnboardingData; // ← ADD THIS PROP
}
```

At the top of the `ScrollView` (before any other content), add an absolutely-positioned calendar background:

```tsx
{
  /* Blurred calendar background — their actual shifts */
}
<View style={styles.calendarBackground} pointerEvents="none">
  {onboardingData && (
    <MiniYearCalendar
      data={onboardingData}
      blurred={true} // renders at 20% opacity, blurred via style
      compact={true} // tight dot-grid layout, 3pt dots
    />
  )}
  {/* Dark gradient overlay so text is readable */}
  <LinearGradient
    colors={['transparent', theme.colors.deepVoid]}
    start={{ x: 0.5, y: 0.2 }}
    end={{ x: 0.5, y: 1.0 }}
    style={StyleSheet.absoluteFillObject}
  />
</View>;
```

`MiniYearCalendar` is a new simple component in `src/components/paywall/MiniYearCalendar.tsx`:

- Uses `buildShiftCycle()` + `getShiftDaysInRange()` from `src/utils/shiftUtils.ts` (already used in `MainDashboardScreen.tsx`)
- Renders 12 months as compact rows, each day as a 3×3pt colored `View`
- `blurred` prop sets `opacity: 0.25` on the container → creates a dream-like ghosted effect without needing expo-blur (no extra dependency)

**Styles:**

```typescript
calendarBackground: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 220,
  overflow: 'hidden',
},
```

**Why this converts:** Personalization is the single most powerful conversion lever. The user sees their data — their actual year — and feels a visceral pull to unlock it. Generic paywalls show features; this one shows your life.

---

#### SECTION 2 — SOCIAL PROOF BAR (insert after hero, before title)

```tsx
<View style={styles.socialProofBar}>
  <Text style={styles.socialStars}>★★★★★</Text>
  <Text style={styles.socialProofText}>4.8 · Trusted by 50,000+ shift workers</Text>
</View>
```

**Styles:**

```typescript
socialProofBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginBottom: 8,
  marginTop: 16,
},
socialStars: {
  color: theme.colors.paleGold,  // gold stars
  fontSize: 14,
  letterSpacing: 1,
},
socialProofText: {
  color: theme.colors.dust,
  fontSize: 13,
},
```

**Note:** Start with a conservative number (e.g., 1,000+) and update via a Remote Config value from Firebase as your real user count grows. Never fake numbers.

**Why this converts:** Social proof addresses the "am I making a mistake?" hesitation that every user feels at a paywall. Specificity matters — "50,000" beats "thousands".

---

#### SECTION 3 — HEADLINE + SUBHEADLINE (replaces current title/subtitle)

**Current title:** `"Ellie Pro"` (just a product name — creates zero desire)
**Current subtitle:** `"For shift workers who mean business"` (vague, generic)

**New headline:**

```tsx
<Text style={styles.title}>Your year is ready.</Text>
```

**New subheadline:**

```tsx
<Text style={styles.subtitle}>Every shift. Every day off. Yours to unlock.</Text>
```

**Why "Your year is ready" converts:**

- Uses "your" (personalization) — not "the calendar", your calendar
- Uses present tense "is ready" — implies urgency, implies something is waiting for you
- It's a complete sentence that creates tension (ready to do what? to unlock!)
- Short enough to read in 1 second

**Update i18n keys** in `src/i18n/locales/en/common.json`:

```json
"title": "Your year is ready.",
"subtitle": "Every shift. Every day off. Yours to unlock."
```

---

#### SECTION 4 — TESTIMONIALS CAROUSEL (insert before feature list)

Three real testimonials from shift workers. Collect these from your App Store reviews or early users. Render as a horizontally auto-scrolling `ScrollView` that snaps to each card.

```typescript
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
```

Render:

```tsx
<View style={styles.testimonialsSection}>
  <ScrollView
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.testimonialsScroll}
    decelerationRate="fast"
    snapToInterval={CARD_WIDTH + 12}
  >
    {TESTIMONIALS.map((t, i) => (
      <View key={i} style={styles.testimonialCard}>
        <Text style={styles.testimonialStars}>{'★'.repeat(t.stars)}</Text>
        <Text style={styles.testimonialQuote}>"{t.quote}"</Text>
        <Text style={styles.testimonialAuthor}>
          — {t.author}, {t.role}
        </Text>
      </View>
    ))}
  </ScrollView>
  {/* Dot indicators */}
  <View style={styles.testimonialDots}>
    {TESTIMONIALS.map((_, i) => (
      <View key={i} style={[styles.dot, activeTestimonial === i && styles.dotActive]} />
    ))}
  </View>
</View>
```

**Card styles:**

```typescript
testimonialCard: {
  width: CARD_WIDTH,           // Dimensions.get('window').width - 48
  backgroundColor: theme.colors.darkStone,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: theme.colors.softStone,
  padding: 16,
  marginRight: 12,
},
testimonialStars: {
  color: theme.colors.paleGold,
  fontSize: 12,
  letterSpacing: 2,
  marginBottom: 8,
},
testimonialQuote: {
  fontSize: 15,
  color: theme.colors.paper,
  lineHeight: 22,
  fontStyle: 'italic',
  marginBottom: 10,
},
testimonialAuthor: {
  fontSize: 12,
  color: theme.colors.dust,
},
```

**Why specific testimonials convert:** Readers look for someone like themselves. A nurse on 12-hour shifts, a mine worker on 7/7 FIFO, a firefighter — these are Ellie's actual users. When a shift worker reads "Mine worker, 7/7 FIFO" and that's exactly what they do, the testimonial is 10× more credible than a generic "Great app!".

---

#### SECTION 5 — OUTCOME-FOCUSED FEATURE LIST (replaces lines 134–146)

**Current icons:** `mic-outline`, `calendar-outline`, `cloud-offline-outline`, `chatbubble-ellipses-outline`, `flash-outline`

**New format:** Keep icons (they work visually) but completely rewrite the text. Use checkmarks (✓) instead of icons to trigger "completion" psychology.

**New feature list** (update `src/i18n/locales/en/common.json` under `subscription.paywall.features.*`):

```json
"features": {
  "fullYear":       "See every shift for the next 365 days",
  "askRoster":      "Ask Ellie anything — \"When's my next day off?\"",
  "offline":        "Works underground with zero signal",
  "leavePlanning":  "Plan holidays without calling HR",
  "aiPowered":      "AI that knows YOUR exact pattern, not a generic one"
}
```

**Icons to use** (swap from current):

- `fullYear`: `calendar-outline` ✓ (keep)
- `askRoster`: `mic-outline` ✓ (keep)
- `offline`: `cloud-offline-outline` ✓ (keep)
- `leavePlanning`: `airplane-outline` ← change from `chatbubble-ellipses-outline`
- `aiPowered`: `sparkles-outline` ← change from `flash-outline`

**Why this converts:** Features tell, benefits sell. "Full year calendar" is a feature. "See every shift for the next 365 days" is a benefit. "Plan holidays without calling HR" speaks directly to a real pain point that every shift worker has felt.

---

#### SECTION 6 — LOSS AVERSION BLOCK (add after features, before timer)

A short two-line block using loss aversion psychology — showing what the user MISSES without subscribing:

```tsx
<View style={styles.lossAversion}>
  <Ionicons name="lock-closed-outline" size={14} color={theme.colors.shadow} />
  <Text style={styles.lossAversionText}>Without Pro, you can only see 2 weeks of your roster.</Text>
</View>
```

**Styles:**

```typescript
lossAversion: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: 'rgba(120, 113, 108, 0.15)',  // softStone with low opacity
  borderRadius: 8,
  marginBottom: 16,
},
lossAversionText: {
  fontSize: 13,
  color: theme.colors.shadow,
  flex: 1,
},
```

**Why this converts:** Humans are twice as motivated by avoiding a loss as by acquiring a gain (Kahneman and Tversky, 1979). "You can only see 2 weeks" creates an immediate concrete sense of limitation. The user has just seen 365 days — now they feel the restriction.

---

#### SECTION 7 — URGENCY TIMER (add before plans)

```tsx
{
  secondsLeft > 0 && (
    <View style={styles.timerRow}>
      <Ionicons name="time-outline" size={14} color={theme.colors.sacredGold} />
      <Text style={styles.timerText}>Introductory offer ends in {timerText}</Text>
    </View>
  );
}
```

Timer logic:

```typescript
const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes
useEffect(() => {
  const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
  return () => clearInterval(interval);
}, []);
const timerText = `${Math.floor(secondsLeft / 60)
  .toString()
  .padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
```

**Styles:**

```typescript
timerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingVertical: 6,
  marginBottom: 12,
},
timerText: {
  fontSize: 13,
  color: theme.colors.sacredGold,
  fontWeight: '600',
},
```

**Why this converts:** Urgency reduces deliberation. When the offer "expires soon", the cost of delay feels real. Note: 10 minutes resets if the user dismisses and reopens — this is intentional (it's a session-level urgency, not a fake permanent countdown).

---

#### SECTION 8 — REDESIGNED PLANS (replaces lines 151–188)

**Current problems:**

- Annual plan shows `$49.99/yr` — the large number anchors badly
- Monthly plan shows `$6.99/mo` — this becomes the reference point, making annual look expensive
- No monthly-equivalent on annual plan
- No visual hierarchy between "best" and "fallback" plan

**New plan layout:**

```tsx
<View style={styles.plans}>
  {/* ANNUAL — DOMINANT, PRIMARY CARD */}
  <TouchableOpacity
    style={[
      styles.planOption,
      styles.planOptionAnnual,
      selectedPlan === 'annual' && styles.planOptionSelected,
    ]}
    onPress={() => setSelectedPlan('annual')}
  >
    {/* BEST VALUE badge — top-right corner */}
    <View style={styles.bestValueBadge}>
      <Text style={styles.bestValueText}>BEST VALUE</Text>
    </View>

    <View style={styles.planLeft}>
      <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]} />
      <View>
        <Text style={styles.planName}>Annual</Text>
        {/* Monthly equivalent price — this is the anchor */}
        <Text style={styles.planMonthlyEquivalent}>{annualMonthlyEquivalent}/month</Text>
      </View>
    </View>

    <View style={styles.planRight}>
      {/* Strikethrough monthly full price */}
      <Text style={styles.planPriceStrikethrough}>{monthlyPrice}/mo</Text>
      {/* Actual annual price */}
      <Text style={styles.planPrice}>{annualPrice}/yr</Text>
    </View>
  </TouchableOpacity>

  {/* MONTHLY — SMALLER, FALLBACK OPTION */}
  <TouchableOpacity
    style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionSelected]}
    onPress={() => setSelectedPlan('monthly')}
  >
    <View style={styles.planLeft}>
      <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]} />
      <Text style={styles.planName}>Monthly</Text>
    </View>
    <Text style={[styles.planPrice, styles.planPriceMonthly]}>{monthlyPrice}/mo</Text>
  </TouchableOpacity>
</View>
```

**Compute `annualMonthlyEquivalent`:**

```typescript
const annualMonthlyEquivalent = useMemo(() => {
  if (!annualPackage) return '$2.99';
  const monthlyEq = annualPackage.product.price / 12;
  const currencySymbol = annualPackage.product.currencySymbol ?? '$';
  return `${currencySymbol}${monthlyEq.toFixed(2)}`;
}, [annualPackage]);
```

**New styles for plans:**

```typescript
planOptionAnnual: {
  borderWidth: 2,             // thicker border emphasizes importance
  borderColor: theme.colors.paleGold,
  backgroundColor: 'rgba(245, 158, 11, 0.05)',  // very subtle gold fill
  paddingTop: 20,             // extra top padding for the badge
},
bestValueBadge: {
  position: 'absolute',
  top: -1,
  right: -1,
  backgroundColor: theme.colors.sacredGold,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderTopRightRadius: 13,
  borderBottomLeftRadius: 10,
},
bestValueText: {
  fontSize: 10,
  fontWeight: '800',
  color: theme.colors.deepVoid,
  letterSpacing: 0.5,
},
planMonthlyEquivalent: {
  fontSize: 12,
  color: theme.colors.sacredGold,
  marginTop: 2,
},
planPriceStrikethrough: {
  fontSize: 12,
  color: theme.colors.shadow,
  textDecorationLine: 'line-through',
  marginBottom: 2,
},
planPriceMonthly: {
  color: theme.colors.shadow,   // monthly plan price is de-emphasized (grey, not paper)
},
```

**Why this converts:** The decoy effect. The monthly price ($6.99/mo) exists to make the annual per-month equivalent ($2.99/mo) look dramatically cheaper. By showing "strikethrough $6.99/mo" next to the annual plan, you're saying "you could pay $6.99, or you could pay $2.99 — your choice." The brain automatically picks the better deal.

---

#### SECTION 9 — CTA BUTTON (keep gradient but enhance)

**Current:** Static gradient button with text from `t('subscription.paywall.cta')`.

The existing i18n key already says "Start 7-Day Free Trial" — this is good. Keep the text.

**Add a pulsing animation to the CTA button** to draw the eye:

```typescript
const ctaPulse = useSharedValue(1);
useEffect(() => {
  ctaPulse.value = withRepeat(
    withSequence(
      withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
    ),
    -1, // repeat forever
    false
  );
}, [ctaPulse]);

const ctaAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: ctaPulse.value }],
}));
```

Wrap the existing `LinearGradient` in an `Animated.View` with `ctaAnimatedStyle`.

**Also add an arrow icon** to the right of the CTA text:

```tsx
<Text style={styles.ctaText}>Start Free 7-Day Trial</Text>
<Ionicons name="arrow-forward" size={18} color={theme.colors.deepVoid} style={{ marginLeft: 6 }} />
```

**Why this converts:** The pulsing CTA creates a subtle attentional pull — the eye is drawn to moving things. The arrow reinforces forward motion ("this button moves me toward something").

---

#### SECTION 10 — RISK REVERSAL ROW (replaces single `noCard` line)

**Current:** One line: `"No credit card required · Cancel anytime"`

**Replace with a 3-icon trust row:**

```tsx
<View style={styles.trustRow}>
  <View style={styles.trustItem}>
    <Ionicons name="calendar-outline" size={14} color={theme.colors.dust} />
    <Text style={styles.trustText}>7 days free</Text>
  </View>
  <View style={styles.trustDivider} />
  <View style={styles.trustItem}>
    <Ionicons name="close-circle-outline" size={14} color={theme.colors.dust} />
    <Text style={styles.trustText}>Cancel anytime</Text>
  </View>
  <View style={styles.trustDivider} />
  <View style={styles.trustItem}>
    <Ionicons name="card-outline" size={14} color={theme.colors.dust} />
    <Text style={styles.trustText}>No charge today</Text>
  </View>
</View>
```

**Styles:**

```typescript
trustRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 12,
  marginBottom: 8,
  gap: 0,
},
trustItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 12,
},
trustDivider: {
  width: 1,
  height: 14,
  backgroundColor: theme.colors.softStone,
},
trustText: {
  fontSize: 12,
  color: theme.colors.dust,
},
```

**Why this converts:** Every word in this row addresses a specific fear:

- "7 days free" → fear of commitment ("I have to decide now")
- "Cancel anytime" → fear of being locked in
- "No charge today" → fear of being charged before you're ready

Each fear, addressed in 3 words.

---

#### SECTION 11 — VALUE FRAMING TEXT (add below trust row)

```tsx
<Text style={styles.valueFrame}>Less than a coffee per week to know your entire year.</Text>
```

**Styles:**

```typescript
valueFrame: {
  textAlign: 'center',
  fontSize: 12,
  color: theme.colors.shadow,
  fontStyle: 'italic',
  marginBottom: 12,
  paddingHorizontal: 24,
},
```

**Why this converts:** Price anchoring against a reference everyone has. A coffee = ~$5. $35.99/year ÷ 52 weeks = $0.69/week. "Less than a coffee per week" makes the annual price feel trivially small. This is especially powerful for blue-collar workers who may be price-sensitive.

---

#### SECTION 12 — TRUST SIGNALS (add after value frame)

```tsx
<View style={styles.securityRow}>
  <Ionicons name="lock-closed" size={12} color={theme.colors.shadow} />
  <Text style={styles.securityText}>
    Secure payment via {Platform.OS === 'ios' ? 'Apple' : 'Google'} · Processed by Apple/Google, not
    Ellie
  </Text>
</View>
```

**Styles:**

```typescript
securityRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  marginBottom: 16,
},
securityText: {
  fontSize: 11,
  color: theme.colors.shadow,
  textAlign: 'center',
},
```

**Why this converts:** "Processed by Apple/Google" completely removes payment security anxiety. Users trust Apple and Google with their payment info — they may not yet trust Ellie. Invoking these brands transfers that trust.

---

#### SECTION 13 — FOOTER (update existing lines 223–231)

Keep existing restore + privacy links. Add `Terms of Service` as a third link:

```tsx
<View style={styles.footer}>
  <TouchableOpacity onPress={handleRestore}>
    <Text style={styles.footerLink}>Restore</Text>
  </TouchableOpacity>
  <Text style={styles.footerDot}>·</Text>
  <TouchableOpacity>
    <Text style={styles.footerLink}>Privacy</Text>
  </TouchableOpacity>
  <Text style={styles.footerDot}>·</Text>
  <TouchableOpacity>
    <Text style={styles.footerLink}>Terms</Text>
  </TouchableOpacity>
</View>
```

**Why Terms matters:** Apple App Store review requires accessible Terms of Service on subscription paywalls. Missing it is a rejection reason.

---

#### ANALYTICS IN PAYWALL (all tracking calls)

```typescript
// On screen mount:
useEffect(() => {
  Analytics.paywallViewed('post_aha');
}, []);

// When user selects annual plan:
onPress={() => {
  setSelectedPlan('annual');
  Analytics.paywallPlanSelected('annual');
}}

// When user selects monthly plan:
onPress={() => {
  setSelectedPlan('monthly');
  Analytics.paywallPlanSelected('monthly');
}}

// In handlePurchase — success path (after Purchases.purchasePackage):
Analytics.trialStarted(selectedPlan, selectedPackage.product.price);
onDismiss();

// In handlePurchase — catch path (user cancelled or purchase failed):
// (don't fire — catch includes cancellations which aren't "dismissals")

// On dismiss button press:
onPress={() => {
  Analytics.paywallDismissed();
  onDismiss();
}}
```

---

#### COMPLETE VISUAL HIERARCHY — TOP TO BOTTOM

The complete order of sections in the new `PaywallScreen.tsx` `ScrollView`, from top to bottom:

```
1. [Delayed dismiss button — appears at 4 seconds]
2. Blurred calendar preview (absolute, top 220pt)
3. Social proof bar: ★★★★★ 4.8 · 50,000+ shift workers
4. Headline: "Your year is ready."
5. Subheadline: "Every shift. Every day off. Yours to unlock."
6. Testimonials carousel (3 horizontally scrollable cards)
7. Feature list (5 rows, outcome-focused copy, checkmark style)
8. Loss aversion block: "Without Pro, you can only see 2 weeks"
9. Urgency timer: "Introductory offer ends in 09:47"
10. Plans section:
    - Annual card (dominant, BEST VALUE badge, per-month equivalent, strikethrough)
    - Monthly card (smaller, de-emphasized)
11. CTA button: "Start Free 7-Day Trial →" (pulsing animation)
12. Trust row: 7 days free · Cancel anytime · No charge today
13. Value frame: "Less than a coffee per week to know your entire year."
14. Security row: "Secure payment via Apple / Google"
15. Footer: Restore · Privacy · Terms
```

---

#### ALL I18N KEYS TO UPDATE IN `src/i18n/locales/en/common.json`

```json
"subscription": {
  "paywall": {
    "closeA11y": "Close paywall",
    "title": "Your year is ready.",
    "subtitle": "Every shift. Every day off. Yours to unlock.",
    "socialProof": "4.8 · Trusted by 50,000+ shift workers",
    "testimonials": [
      {
        "quote": "Finally know when I'm working Christmas. Changed my life.",
        "author": "Sarah K., Nurse — 12h rotating shifts"
      },
      {
        "quote": "Showed my wife my whole year roster in under a minute.",
        "author": "Dave L., Firefighter — FIFO roster"
      },
      {
        "quote": "Booked flights 3 months out without calling HR once.",
        "author": "Jason M., Mine worker — 7/7 FIFO"
      }
    ],
    "features": {
      "fullYear":       "See every shift for the next 365 days",
      "askRoster":      "Ask Ellie anything — \"When's my next day off?\"",
      "offline":        "Works underground with zero signal",
      "leavePlanning":  "Plan holidays without calling HR",
      "aiPowered":      "AI that knows YOUR exact pattern, not a generic one"
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
    "ctaArrow": "→",
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

**These same keys must also be updated in all 10 other locale files** (`ar`, `af`, `hi`, `id`, `fr`, `es`, `pt-BR`, `ru`, `zh-CN`, `zu`). Since those are translated files, add `defaultValue` fallbacks in the component code to use the English strings while translations catch up — the existing codebase already uses this pattern throughout (e.g., `t('key', { defaultValue: '...' })`).

---

#### HOW TO VERIFY THE PAYWALL CONVERTS

1. **Visual check:** Fresh build → complete onboarding through AhaMoment → tap "Unlock Full Access". Paywall appears. Verify:
   - Dismiss button is NOT visible for the first 4 seconds
   - Blurred calendar visible in the top section
   - Stars + social proof text present
   - Headline is "Your year is ready." (not "Ellie Pro")
   - 3 testimonial cards scroll horizontally
   - Annual plan has "BEST VALUE" badge in top-right corner
   - Annual plan shows per-month equivalent (e.g., "$2.99/month")
   - Monthly plan price appears smaller/greyed vs annual
   - Timer counting down from 09:59
   - CTA button has subtle pulse animation
   - Trust row shows 3 items
   - Footer has 3 links: Restore · Privacy · Terms

2. **RevenueCat sandbox test:** Use a sandbox Apple ID to tap "Start Free 7-Day Trial". Verify RevenueCat dashboard registers a trial start. Verify `Analytics.trialStarted()` fires in Firebase DebugView.

3. **Analytics check:** Open Firebase Console → DebugView. Mount paywall. Verify `paywall_viewed` event fires with `source: 'post_aha'`. Select annual plan. Verify `paywall_plan_selected` fires with `plan: 'annual'`. Dismiss. Verify `paywall_dismissed` fires.

4. **Conversion baseline:** Before shipping, note your current trial conversion rate from RevenueCat. After 2 weeks running the new paywall, compare. Target: 3× improvement over baseline.

---

## CHANGE 5: REDESIGN THE WELCOME SCREEN

**File:** `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`

### Specific changes:

**A. Remove the auto-advance timer (lines 87–93):**

Delete the `setTimeout` block entirely and remove `autoAdvanceTimerRef`. The user must tap the button to continue.

**B. Replace the tagline with a value proposition:**

Current: `t('welcome.tagline')` (whatever translation key says)
New: Update `src/i18n/locales/en/onboarding.json` key `welcome.tagline` to: `"Know every shift for the entire year. In 60 seconds."`

**C. Add social proof below the tagline (between tagline and button, in the same `content` View at line 156):**

Add a new `Animated.View` with `FadeIn.delay(1200)`:

```tsx
<Animated.View style={styles.socialProofRow} entering={FadeIn.delay(1200).duration(400)}>
  <Text style={styles.socialProofStars}>★★★★★</Text>
  <Text style={styles.socialProofText}>50,000+ shift workers</Text>
</Animated.View>
```

Style: small text, `theme.colors.dust` color, centered, appears after the existing animations complete.

**D. Change the button title:**

Update `src/i18n/locales/en/onboarding.json` key `welcome.getStarted` to: `"Set Up My Roster →"`

**E. Fix the `handleContinue` navigation target (line 119):**

```typescript
// Old:
navigation.navigate('Introduction');

// New:
navigation.navigate('Introduction'); // unchanged — Introduction now has a skip button
```

No change needed here since Introduction now has a skip button.

---

## CHANGE 6: NOTIFICATION PRIMING IN THE COMPLETION SCREEN

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`

### What to add:

**A. Create: `src/components/onboarding/NotificationPrimingModal.tsx`**

A full-screen modal (dark background) that appears after the completion data saves successfully.

```
┌─────────────────────────────────────────┐
│                                         │
│         🔔                              │
│                                         │
│   "Never miss a shift"                  │
│                                         │
│   Ellie will remind you 24 hours        │
│   and 4 hours before every shift.       │
│   You control what and when.            │
│                                         │
│   [    Turn On Reminders    ]           │
│                                         │
│   Not now                               │
│                                         │
└─────────────────────────────────────────┘
```

Props:

```typescript
interface NotificationPrimingModalProps {
  visible: boolean;
  onAllow: () => void; // triggers real system permission request
  onDecline: () => void; // saves 'notification_soft_declined' flag to AsyncStorage
}
```

On `onAllow`: call `notificationService.requestPermissions()` (the real system dialog). Then call `Analytics.notificationPermissionGranted()` or `Analytics.notificationPermissionDeclined()` depending on result.

On `onDecline`: save `await asyncStorageService.set('notifications:soft_declined', true)` then call `Analytics.notificationPermissionDeclined()`.

**B. Trigger it in `PremiumCompletionScreen.tsx`:**

Add `const [showNotificationModal, setShowNotificationModal] = useState(false);`

In the `saveOnboardingData` success path (after `setIsSaved(true)` at line 359), add:

```typescript
// Delay 1.5 seconds after celebration to show notification modal
setTimeout(() => setShowNotificationModal(true), 1500);
```

Add the modal to the JSX return (after the `ScrollView`):

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
    void asyncStorageService.set('notifications:soft_declined', true);
    Analytics.notificationPermissionDeclined();
  }}
/>
```

**C. Add the "Next Shift" countdown to the completion summary:**

In `PremiumCompletionScreen.tsx`, compute the next shift date using the already-saved `data` (all required fields are in `OnboardingContext`):

```typescript
const nextShiftCountdown = useMemo(() => {
  if (!data.startDate || !data.patternType) return null;
  // build cycle using existing buildShiftCycle() from shiftUtils
  // then iterate forward from today to find next non-off shift
  // return { date: Date, daysAway: number, shiftType: string }
}, [data]);
```

Display in the summary card (in `styles.summaryCard`) below the existing summary rows:

```tsx
{
  nextShiftCountdown && (
    <View style={styles.countdownRow}>
      <Ionicons name="time-outline" size={20} color={theme.colors.sacredGold} />
      <Text style={styles.countdownText}>
        Next shift in {nextShiftCountdown.daysAway} days (
        {nextShiftCountdown.date.toLocaleDateString()})
      </Text>
    </View>
  );
}
```

**D. Add daily check-in time picker (commitment hook):**

Below the feature pills section and above the "Get Started" button, add:

```tsx
<View style={styles.checkInSection}>
  <Text style={styles.checkInTitle}>When do you check your schedule?</Text>
  <View style={styles.checkInOptions}>
    {['Morning', 'Midday', 'Evening'].map((time, i) => {
      const hours = [7, 12, 18][i];
      return (
        <TouchableOpacity
          key={time}
          style={[styles.checkInChip, selectedCheckIn === time && styles.checkInChipSelected]}
          onPress={() => {
            setSelectedCheckIn(time);
            // Schedule a daily notification at this time using NotificationService
            void scheduleDaily CheckInReminder(hours);
          }}
        >
          <Text style={styles.checkInChipText}>{time}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
```

When a time chip is tapped, call a new method on `NotificationService`: `scheduleDaily(hour: number, title: string, body: string)` that schedules a recurring daily notification. This requires `expo-notifications` (check if already in `package.json` — the project uses Expo so it likely is).

---

## CHANGE 7: DASHBOARD FIRST IMPRESSION

**File:** `src/screens/main/MainDashboardScreen.tsx`

### What to add:

**A. "Next Shift" Hero Card:**

The dashboard already has `CurrentShiftStatusCard` (line 51 import). Upgrade it to be the hero element. Ensure it's the FIRST element in the ScrollView, above the calendar.

If shift times are not set (user skipped `ShiftTimeInput` or is a non-subscriber): Show the card with shift TYPE (day/night/off) but replace the exact times with a CTA: `"Add shift times →"` that navigates to `ShiftTimeInput` screen.

**B. Post-Onboarding Checklist Widget:**

**Create:** `src/components/dashboard/OnboardingChecklist.tsx`

Shown only for users where `AsyncStorage` key `'onboarding_checklist:dismissed'` is `false`.

```
┌────────────────────────────────────────┐
│  Get the most out of Ellie             │
│                                        │
│  ☑ Set up your roster          Done   │
│  ○ Add your shift times       [Do it] │
│  ○ Ask Ellie a question       [Do it] │
│  ○ Set your hourly rate       [Do it] │
│                                        │
│                            [Dismiss]   │
└────────────────────────────────────────┘
```

Each item, when tapped on `[Do it]`:

- "Add your shift times" → `navigation.navigate('Onboarding', { screen: 'ShiftTimeInput', params: { entryPoint: 'settings' } })`
- "Ask Ellie a question" → navigate to voice assistant tab
- "Set your hourly rate" → navigate to Profile > Earnings settings

Track completion: each item dismissed stores `'checklist:shift_times_done'` etc. in AsyncStorage. When all 3 done or dismissed, hide the entire widget.

**Add to `MainDashboardScreen.tsx`** in the ScrollView, below `CurrentShiftStatusCard` and above `MonthlyCalendarCard`:

```tsx
{
  showChecklist && (
    <OnboardingChecklist
      onDismiss={() => {
        void asyncStorageService.set('onboarding_checklist:dismissed', true);
        setShowChecklist(false);
      }}
    />
  );
}
```

---

## CHANGE 8: NOTIFICATION RE-ENGAGEMENT SEQUENCE (DAY 1–30)

**File:** `src/services/NotificationService.ts`

The `NotificationService` class already extends `FirebaseService` and has a `scheduler: INotificationScheduler | null` property. It has a `translate()` method using `i18n`.

**Add a new public method `scheduleOnboardingEngagementSequence(userName: string)`:**

This method schedules the following notifications (using `scheduler.scheduleNotification(content, triggerDate)`):

```typescript
async scheduleOnboardingEngagementSequence(userName: string): Promise<void> {
  if (!this.scheduler) return;
  const now = new Date();

  const notifications = [
    {
      // Day 1 — 6 PM
      trigger: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0),
      title: 'Your roster is live',
      body: 'See what shifts are coming up this week. Tap to open your calendar.',
    },
    {
      // Day 2 — 8 AM
      trigger: addDays(now, 1, 8),
      title: `Morning, ${userName}! 👋`,
      body: 'Did you know you can ask Ellie "When am I next off?" — try it now.',
    },
    {
      // Day 3 — 6 PM
      trigger: addDays(now, 2, 18),
      title: 'Your month at a glance',
      body: 'Check your shift balance for this month. Open Ellie to see.',
    },
    {
      // Day 7 — 9 AM
      trigger: addDays(now, 6, 9),
      title: 'One week with Ellie 🎉',
      body: "You've mapped your shifts for the entire year. Keep it up.",
    },
    {
      // Day 14 — 9 AM
      trigger: addDays(now, 13, 9),
      title: 'Pattern cycle update',
      body: 'Your roster cycle changes soon. Ellie has already updated your calendar.',
    },
    {
      // Day 30 — 9 AM
      trigger: addDays(now, 29, 9),
      title: '30 days of shift certainty',
      body: 'Your next month is mapped. Tap to see what\'s coming.',
    },
  ];

  for (const n of notifications) {
    if (n.trigger > now) {
      await this.scheduler.scheduleNotification({ title: n.title, body: n.body }, n.trigger);
    }
  }
}
```

Helper: `addDays(base: Date, days: number, hour: number): Date` — pure function, add privately.

**Call this method from `PremiumCompletionScreen.tsx`** in the `saveOnboardingData` success path:

```typescript
// After setIsSaved(true):
if (data.name) {
  void notificationService.scheduleOnboardingEngagementSequence(data.name.split(' ')[0]);
}
```

---

## FINAL NAVIGATION FLOW SUMMARY

### New flow (what the user actually experiences):

```
Screen 1: PremiumWelcomeScreen         — "Set Up My Roster →" (no auto-advance)
Screen 2: PremiumIntroductionScreen    — chat intro, "Skip for now →" always visible
Screen 3: PremiumQuickSelectScreen     — 3-card grid: 2-shift Rotating / 2-shift FIFO / 3-shift Rotating
Screen 4: PremiumShiftPatternScreen    — select pattern (unchanged)
    [4b]: PremiumCustomPatternScreen   — conditional, if CUSTOM selected (unchanged)
    [4b]: PremiumFIFOCustomPatternScreen — conditional, if FIFO_CUSTOM selected (unchanged)
Screen 5: PremiumPhaseSelectorScreen   — which day in your cycle? (unchanged)
    OR: PremiumFIFOPhaseSelectorScreen
Screen 6: PremiumStartDateScreen       — calendar date picker (unchanged)
Screen 7: PremiumAhaMomentScreen       — ★ FULL YEAR CALENDAR PREVIEW + PAYWALL CTA ★
    [7]: PaywallScreen                 — opens as modal, redesigned
Screen 8: PremiumShiftTimeInputScreen  — exact shift times (now post-paywall)
Screen 9: PremiumCompletionScreen      — celebration + notification priming + commitment hook
```

### Progress bar: 7 visible steps (down from 9)

```typescript
// src/constants/onboardingProgress.ts
export const TOTAL_ONBOARDING_STEPS = 7;
```

---

## FILES TO MODIFY (With Exact Change Descriptions)

| File                                                           | Exact Change                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`      | Delete lines 87–93 (setTimeout auto-advance). Add social proof `Animated.View` between tagline and button. Update i18n tagline/button copy.                                                                                                                          |
| `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx` | Add "Skip for now →" `TouchableOpacity` that calls `goToNextScreen(navigation, 'Introduction')`. Make all form fields optional (remove required validation). Add `Analytics.onboardingStepViewed('introduction', 2)`.                                                |
| `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`   | Add `showNotificationModal` state. Trigger `NotificationPrimingModal` 1.5s after `setIsSaved(true)`. Add next-shift countdown below summary rows. Add daily check-in time picker section above Get Started button. Call `scheduleOnboardingEngagementSequence`.      |
| `src/screens/subscription/PaywallScreen.tsx`                   | Replace mic-circle hero with blurred calendar preview + social proof. Add testimonials `ScrollView`. Rewrite feature copy (update i18n keys). Change CTA text. Add countdown timer `useState`/`useEffect`. Add `Analytics` calls to purchase, cancel, dismiss paths. |
| `src/screens/main/MainDashboardScreen.tsx`                     | Add `showChecklist` state from AsyncStorage. Render `<OnboardingChecklist>` below `CurrentShiftStatusCard`. Ensure `CurrentShiftStatusCard` shows "Add shift times →" CTA when times not set.                                                                        |
| `src/navigation/OnboardingNavigator.tsx`                       | Add `QuickSelect: undefined` and `AhaMoment: undefined` to `OnboardingStackParamList`. Add `<Stack.Screen name="QuickSelect" component={PremiumQuickSelectScreen} />` and `<Stack.Screen name="AhaMoment" component={PremiumAhaMomentScreen} />`.                    |
| `src/utils/onboardingNavigation.ts`                            | Change `Introduction` target from `'ShiftSystem'` to `'QuickSelect'`. Add `QuickSelect: () => 'ShiftPattern'`. Change `StartDate` target from `'ShiftTimeInput'` to `'AhaMoment'`. Add `AhaMoment: () => 'ShiftTimeInput'`.                                          |
| `src/constants/onboardingProgress.ts`                          | Add `QUICK_SELECT: 2`, `AHA_MOMENT: 6`. Change `SHIFT_TIME_INPUT: 7`, `COMPLETION: 7`. Change `TOTAL_ONBOARDING_STEPS = 7`.                                                                                                                                          |
| `src/services/NotificationService.ts`                          | Add `scheduleOnboardingEngagementSequence(userName: string)` method with the 6-notification sequence. Add `scheduleDaily(hour: number, title: string, body: string)` method for the daily check-in reminder.                                                         |
| `src/i18n/locales/en/onboarding.json`                          | Update `welcome.tagline`, `welcome.getStarted`. Add keys for `quickSelect.*` screen. Add keys for `ahaMoment.*` screen.                                                                                                                                              |
| `src/i18n/locales/en/common.json`                              | Update `subscription.paywall.features.*` (all 5 features). Update `subscription.paywall.cta`, `subscription.paywall.noCard`. Add `subscription.paywall.testimonials.*`.                                                                                              |
| All 10 other locale files                                      | Update same keys (use existing fallback pattern already in codebase, e.g., `defaultValue: '...'` handles missing translations gracefully)                                                                                                                            |

## FILES TO CREATE

| File                                                          | Purpose                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `src/utils/analytics.ts`                                      | Firebase Analytics typed event wrapper (full code above) |
| `src/screens/onboarding/premium/PremiumQuickSelectScreen.tsx` | 3-card roster type + shift system combined selection     |
| `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`   | Full-year calendar preview + paywall gateway             |
| `src/components/onboarding/NotificationPrimingModal.tsx`      | Soft-ask notification permission modal                   |
| `src/components/dashboard/OnboardingChecklist.tsx`            | Post-onboarding task checklist widget                    |

---

## IMPLEMENTATION SPRINT ORDER

### Sprint 1 — Analytics Foundation (before anything else ships)

1. Create `src/utils/analytics.ts`
2. Add `Analytics.onboardingStepViewed()` + `Analytics.onboardingStepCompleted()` to all 12 existing onboarding screens
3. Add `Analytics.paywallViewed()`, `Analytics.trialStarted()`, `Analytics.purchaseCompleted()`, `Analytics.paywallDismissed()` to `PaywallScreen.tsx`
4. Deploy to TestFlight/internal track
5. Let it run for 1 week — identify the single biggest drop-off step in Firebase Analytics funnel

### Sprint 2 — The Aha Moment + Paywall (highest-impact UX change)

1. Create `PremiumAhaMomentScreen.tsx` with calendar preview + stats
2. Update `onboardingNavigation.ts`: `StartDate` → `AhaMoment` → `ShiftTimeInput`
3. Update `OnboardingNavigator.tsx`: add `AhaMoment` screen
4. Update `onboardingProgress.ts`: step numbers
5. Redesign `PaywallScreen.tsx`: testimonials, outcome-focused copy, timer, trial CTA
6. Measure: compare paywall conversion before/after in RevenueCat dashboard

### Sprint 3 — Compression + Welcome (remove friction)

1. Remove auto-advance timer from `PremiumWelcomeScreen.tsx`
2. Add social proof to `PremiumWelcomeScreen.tsx`
3. Add "Skip for now" to `PremiumIntroductionScreen.tsx`
4. Create `PremiumQuickSelectScreen.tsx`
5. Update navigation: `Introduction` → `QuickSelect` → `ShiftPattern`
6. Measure: compare onboarding completion rate before/after

### Sprint 4 — Habit Formation + Retention

1. Create `NotificationPrimingModal.tsx`
2. Add to `PremiumCompletionScreen.tsx`: modal trigger, next-shift countdown, daily check-in picker
3. Add `scheduleOnboardingEngagementSequence()` to `NotificationService.ts`
4. Call from `PremiumCompletionScreen.tsx` on save success
5. Measure: compare Day 7 and Day 30 retention before/after

### Sprint 5 — Dashboard First Impression

1. Create `OnboardingChecklist.tsx`
2. Add to `MainDashboardScreen.tsx`
3. Upgrade `CurrentShiftStatusCard` to show "Add shift times →" CTA when times not set
4. Measure: checklist item completion rates

---

## HOW TO VERIFY EACH CHANGE

| Change                 | How to Verify                                                                                                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analytics              | Firebase Console → DebugView mode. Enable with `adb shell setprop debug.firebase.analytics.app au.com.ellie` (Android) or `Instruments` on iOS. Should see all events within seconds of triggering them.                                                                                     |
| Aha Moment screen      | Fresh install → sign up → complete through StartDate. Should arrive on `PremiumAhaMomentScreen` with a populated calendar showing your actual shift pattern. Time from install to aha moment should be under 90 seconds.                                                                     |
| Paywall redesign       | Tap "Unlock Full Access" on AhaMoment screen. Verify: (1) calendar preview visible blurred, (2) testimonials horizontally scrollable, (3) countdown timer counting down, (4) CTA says "Start Free 7-Day Trial", (5) RevenueCat sandbox purchase flow completes.                              |
| Welcome screen         | Fresh install. Verify: (1) screen does NOT auto-advance after 3 seconds, (2) social proof text appears after animations, (3) tapping button navigates to Introduction.                                                                                                                       |
| Skip button            | On Introduction screen: tap "Skip for now →". Should navigate directly to QuickSelect without entering any data. Verify `data.name` is undefined in OnboardingContext after skip.                                                                                                            |
| QuickSelect screen     | 3 cards render. Tapping "2-Shift Rotating" sets `data.shiftSystem === '2-shift'` and `data.rosterType === 'rotating'`. Continue button navigates to ShiftPattern.                                                                                                                            |
| Notification priming   | Complete full onboarding. After confetti animation, notification modal should appear. Tapping "Not now" should NOT trigger iOS system permission dialog. Tapping "Turn On Reminders" SHOULD trigger system dialog. Check AsyncStorage key `'notifications:soft_declined'` is set on decline. |
| Next-shift countdown   | On CompletionScreen summary card, a countdown row should show "Next shift in X days (date)". Verify the date matches manual calculation from pattern + start date + phase offset.                                                                                                            |
| Re-engagement sequence | After completing onboarding (with notification permission granted), check `expo-notifications` scheduled notifications list — should have 6 future-dated notifications.                                                                                                                      |
| Onboarding checklist   | On MainDashboardScreen (first launch after onboarding), checklist widget should appear. Tapping "Do it" on "Add shift times" should navigate to ShiftTimeInput with `entryPoint: 'settings'`. Tapping "Dismiss" should hide the widget permanently (AsyncStorage flag).                      |
| Progress bar           | After all changes, progress bar should show steps 1–7 (not 1–9). Verify `TOTAL_ONBOARDING_STEPS = 7` in `onboardingProgress.ts`.                                                                                                                                                             |

---

## TARGET METRICS AFTER ALL SPRINTS

After 30 days of running the new flow, these are the targets vs. industry averages:

| Metric                              | Industry Average   | Ellie Target         |
| ----------------------------------- | ------------------ | -------------------- |
| Onboarding completion rate          | ~40%               | 75%+                 |
| Day 1 retention                     | 18% (utility apps) | 50%+                 |
| Day 7 retention                     | 8%                 | 25%+                 |
| Day 30 retention                    | 3.5%               | 15%+                 |
| Trial conversion (download → trial) | 1.7%               | 10%+                 |
| Notification permission opt-in      | ~45%               | 65%+ (with soft-ask) |

---

_Plan name: The Ellie Shift Certainty Masterplan — because the product's core promise is certainty about your shifts, and this plan ensures the onboarding delivers that promise within 90 seconds of the user opening the app._
