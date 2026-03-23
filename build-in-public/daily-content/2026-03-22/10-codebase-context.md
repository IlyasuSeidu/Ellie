# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- calendar-based shift setup
- setup state carried across screens
- shift and date math underneath the answer
- country selection built into setup
- Aha moment that turns setup effort into a visible long-range schedule payoff.
- PaywallScreen.tsx is part of the current codebase around this feature area.

## Touched Files Reviewed

- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`: Aha moment that turns setup effort into a visible long-range schedule payoff. (guided onboarding path, country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/subscription/PaywallScreen.tsx`: PaywallScreen.tsx is part of the current codebase around this feature area. (country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, and calendar-based shift setup)
- `src/contexts/OnboardingContext.tsx`: OnboardingContext Manages state across all premium onboarding flow screens. (country selection built into setup, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
- `src/screens/onboarding/premium/__tests__/PremiumAhaMomentScreen.test.tsx`: PremiumAhaMomentScreen.test.tsx is part of the current codebase around this feature area. (setup state carried across screens, shift and date math underneath the answer, service and sync layer underneath the app, calendar-based shift setup, and tests around the interaction and logic)
- `src/utils/analytics.ts`: analytics.ts is part of the current codebase around this feature area. (validated setup inputs and calendar-based shift setup)

## Related Files Reviewed

- `src/contexts/VoiceAssistantContext.tsx`: VoiceAssistantContext React Context that connects the VoiceAssistantService orchestrator (setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and tests around the interaction and logic)
- `src/utils/shiftUtils.ts`: Shift Calculation Utilities Functions for calculating shift schedules, patterns, and related data. (setup state carried across screens, shift and date math underneath the answer, and calendar-based shift setup)
- `src/services/RevenueCatRuntime.ts`: RevenueCatRuntime.ts is part of the current codebase around this feature area. (service and sync layer underneath the app)
- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
