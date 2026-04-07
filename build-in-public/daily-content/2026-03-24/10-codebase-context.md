# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- PaywallScreen.tsx is part of the current codebase around this feature area.
- Aha moment that turns setup effort into a visible long-range schedule payoff.
- Roster-type split that distinguishes rotating patterns from FIFO reality before setup gets deeper.
- guided onboarding path
- swipeable shift-pattern cards
- calendar-based shift setup

## Touched Files Reviewed

- `src/screens/subscription/PaywallScreen.tsx`: PaywallScreen.tsx is part of the current codebase around this feature area. (country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, and calendar-based shift setup)
- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`: Aha moment that turns setup effort into a visible long-range schedule payoff. (guided onboarding path, country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx`: Roster-type split that distinguishes rotating patterns from FIFO reality before setup gets deeper. (guided onboarding path, country selection built into setup, swipeable shift-pattern cards, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`: Roster-pattern choice rebuilt into swipeable cards so people can recognize their schedule faster. (guided onboarding path, swipeable shift-pattern cards, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumShiftSystemScreen.tsx`: Shift-system choice that separates two-shift and three-shift realities early. (guided onboarding path, swipeable shift-pattern cards, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`: First screen that frames Ellie as a premium shift companion from the opening moment. (physics-based motion that needs to feel solid, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and premium first impression on first open)

## Related Files Reviewed

- `src/services/RevenueCatRuntime.ts`: RevenueCatRuntime.ts is part of the current codebase around this feature area. (service and sync layer underneath the app)
- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
- `src/utils/analytics.ts`: analytics.ts is part of the current codebase around this feature area. (validated setup inputs and calendar-based shift setup)
- `src/contexts/OnboardingContext.tsx`: OnboardingContext Manages state across all premium onboarding flow screens. (country selection built into setup, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
