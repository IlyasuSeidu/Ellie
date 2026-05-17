# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- Aha moment that turns setup effort into a visible long-range schedule payoff.
- PaywallScreen.tsx is part of the current codebase around this feature area.
- MainDashboardScreen Main screen orchestrator for the dashboard.
- guided onboarding path
- setup state carried across screens
- calendar-based shift setup

## Touched Files Reviewed

- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`: Aha moment that turns setup effort into a visible long-range schedule payoff. (guided onboarding path, country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/subscription/PaywallScreen.tsx`: PaywallScreen.tsx is part of the current codebase around this feature area. (country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, and calendar-based shift setup)
- `src/screens/main/MainDashboardScreen.tsx`: MainDashboardScreen Main screen orchestrator for the dashboard. (physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
- `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`: Premium Completion Screen Celebration and completion screen for onboarding flow. (guided onboarding path, country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, premium first impression on first open, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen.tsx`: Three-stage FIFO phase selector with swipe parity to PremiumPhaseSelectorScreen. Stage 1 (standard FIFO only): Select work pattern (days/nights/swing) (guided onboarding path, swipeable shift-pattern cards, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumPhaseSelectorScreen.tsx`: Tinder-style swipeable card interface for phase selection (Step 5 of 11) Features two-stage selection: Phase → Day-within-phase (if multi-day) (guided onboarding path, swipeable shift-pattern cards, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)

## Related Files Reviewed

- `src/contexts/OnboardingContext.tsx`: OnboardingContext Manages state across all premium onboarding flow screens. (country selection built into setup, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
- `src/services/RevenueCatRuntime.ts`: RevenueCatRuntime.ts is part of the current codebase around this feature area. (service and sync layer underneath the app)
- `src/hooks/useSubscription.ts`: useSubscription.ts is part of the current codebase around this feature area.
- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
