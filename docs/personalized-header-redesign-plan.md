# PersonalizedHeader Redesign Plan

## Context

The current `PersonalizedHeader` is functional but basic — a single `FadeInDown` animation, a small 56px avatar with minimal glow, and static "Good morning/afternoon/evening/night" greetings. The user wants it to feel premium, engaging, and interactive with the best possible UI/UX. The screenshot shows the current state: flat layout, no stagger, no interactivity.

## Files to Modify

- `/Users/Shared/Ellie/src/components/dashboard/PersonalizedHeader.tsx` — full rewrite of component internals
- `/Users/Shared/Ellie/src/components/dashboard/__tests__/PersonalizedHeader.test.tsx` — update mocks + greeting variants

## Files Referenced (no changes)

- `/Users/Shared/Ellie/src/utils/theme.ts` — color/spacing/typography tokens
- `/Users/Shared/Ellie/src/screens/main/MainDashboardScreen.tsx` — consumer (same props, no changes needed)

## What Changes

### 1. Staggered Entrance Animations (replaces single FadeInDown)

Each element animates independently with 150ms stagger gaps using shared values:

| Delay  | Element      | Animation                                 |
| ------ | ------------ | ----------------------------------------- |
| +0ms   | Avatar       | Scale 0.3→1.0 (spring) + fade in          |
| +150ms | Greeting row | Slide from left (-20→0, spring) + fade in |
| +300ms | Name         | Slide from right (30→0, spring) + fade in |
| +480ms | Occupation   | Slide up (8→0, spring) + fade in          |

Total entrance: ~900ms to full visual completion. Snappy, not sluggish.

**APIs:** `useSharedValue` + `useAnimatedStyle` + `withDelay` + `withSpring` + `withTiming`

### 2. Enhanced Avatar (56px → 66px)

- **Size:** 66px circle with 2.5px gold border (was 56px, 2px border)
- **Initials font:** 26px (was 24px) to fill proportionally
- **Pulsing glow ring:** Background layer with opacity pulsing 0.15↔0.35 over 2.4s
- **Breathing outer ring:** Decorative ring scaling 1.0↔1.06 over 3s
- **Float animation:** Kept from current (translateY 0↔-3 over 4s)
- **Three-layer structure:** Glow ring (behind) → outer ring → avatar circle (front)

### 3. Interactive Avatar Tap

Using `Gesture.Tap()` from react-native-gesture-handler (same pattern as `PremiumShiftPatternScreen.tsx`):

- **onBegin:** Scale to 0.92 (instant press feedback)
- **onEnd:** Scale 0.92 → 1.05 → 1.0 (overshoot bounce via `withSequence` + `withSpring`)
- **Haptic:** `Haptics.ImpactFeedbackStyle.Medium` via `runOnJS`
- **onFinalize:** Safety reset to 1.0

Only the inner avatar circle bounces — glow rings stay still for a "badge press" feel.

### 4. Enhanced Greeting Logic

Expand from 4 static messages to 16 with personality, deterministic per hour (`hour % array.length`):

- **Morning (5-11):** "Rise and shine", "Good morning", "Top of the morning", "Ready to conquer the day"
- **Afternoon (12-16):** "Good afternoon", "Keep it going", "Halfway through", "Powering through"
- **Evening (17-20):** "Good evening", "Winding down", "Almost there", "Evening check-in"
- **Night (21-4):** "Good night", "Burning the midnight oil", "Night owl mode", "Late night shift"

### 5. Time-Aware Icon Color

Each time period gets a distinct icon tint instead of always sacredGold:

| Period    | Color                   | Feel           |
| --------- | ----------------------- | -------------- |
| Morning   | `#f97316` (orange-500)  | Warm sunrise   |
| Afternoon | `#d97706` (bright gold) | Peak energy    |
| Evening   | `#8b5cf6` (violet-500)  | Cool wind-down |
| Night     | `#6366f1` (indigo-500)  | Deep calm      |

### 6. Typography Upgrade

- **Name:** Size 26 (was 24), weight 900/black (was 700/bold), letterSpacing 0.3 — more commanding
- **Greeting:** Unchanged (sm/14, medium, dust color)
- **Occupation:** Unchanged (sm/14, shadow color)

### 7. Test Updates

- Add `react-native-gesture-handler` mock (`GestureDetector` as passthrough View, `Gesture.Tap()` chain)
- Add `withSpring`, `withDelay`, `runOnJS` to Reanimated mock
- Expand greeting assertions to accept all 16 variants

## What Does NOT Change

- Props interface (`name`, `occupation`, `animationDelay`, `testID`)
- How MainDashboardScreen passes props
- The `refreshKey` re-mount pattern for pull-to-refresh re-entrance
- No new npm dependencies

## Implementation Order

1. Update `getGreeting()` with expanded messages + `iconColor`
2. Replace single FadeInDown with 8 shared values for staggered entrance
3. Rebuild avatar section (larger, 3-layer glow, continuous animations)
4. Add tap gesture + haptics
5. Update text styles (name size/weight/spacing)
6. Update StyleSheet
7. Update tests
8. Manual QA on Expo Go

## Verification

1. `npx tsc --noEmit` — TypeScript clean
2. `npx jest --no-coverage` — all tests pass
3. Visual QA on Expo Go:
   - Header entrance should feel staggered and springy, not abrupt
   - Avatar should gently float and glow
   - Tapping avatar should produce satisfying bounce + haptic
   - Greeting should match time of day with appropriate icon color
   - Name should feel bold and prominent
