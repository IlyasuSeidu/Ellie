# Ryvro Legacy UI Archive

Archived on 2026-06-23.

Ryvro is now a voice-first shift assistant:

- Configure your shift once.
- Ask Ryvro by voice anytime.
- Get the correct shift answer instantly.

The shipped app should not feel like a calendar app, roster manager, dashboard, statistics product, profile workspace, or technical schedule editor. The current shipped surfaces are:

- Ask
- Settings
- Simple setup and repair screens
- Auth
- Paywall

## Archived Code

These files were moved out of `src` so they are not part of shipped app code:

- `src/components/dashboard`
- `src/components/navigation/CustomTabBar.tsx`
- `src/components/onboarding/NotificationPrimingModal.tsx`
- unused `src/components/onboarding/premium` primitives other than `PremiumButton`
- `src/components/profile`
- `src/components/shift-builder`
- `src/components/subscription/PadlockOverlay.tsx`
- `src/components/system/SyncStatusIndicator.tsx`
- `src/components/voice`
- `src/navigation/MainTabNavigator.tsx`
- `src/screens/main/MainDashboardScreen.tsx`
- `src/screens/main/ProfileScreen.tsx`
- `src/screens/main/ScheduleScreen.tsx`
- `src/screens/main/StatsScreen.tsx`
- `src/screens/main/UniversalShiftBuilderScreen.tsx`
- `src/screens/onboarding/premium/PremiumPainHookScreen.tsx`
- `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`
- `src/hooks/useShiftAccent.ts`
- `src/constants/shiftStyles.ts`
- Tests that only covered those archived surfaces

## Why This Was Archived

These surfaces supported the older product model:

- calendar-first dashboard
- bottom tabs
- profile workspace
- statistics and schedule management
- full advanced shift builder
- legacy onboarding pain hook and profile chat

That model conflicts with the new product promise:

Open Ryvro, tap the mic, ask a shift question, and get a clear answer.

## What Stayed In Shipped Code

The schedule engine stayed in `src` because it is still required for accurate voice answers and simple setup:

- universal shift calculation utilities
- voice assistant services
- natural language shift question handling
- simple setup and repair screens
- reminder scheduling
- subscription and paywall logic

Do not restore archived UI into shipped code unless the product direction changes back to a broader schedule management app.
