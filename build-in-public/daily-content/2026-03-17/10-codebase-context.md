# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- setup state carried across screens
- calendar-based shift setup
- shift and date math underneath the answer
- Aha moment that turns setup effort into a visible long-range schedule payoff.
- Shift-time step that translates a selected roster into the hours a worker actually lives by.

## Touched Files Reviewed

- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`: Aha moment that turns setup effort into a visible long-range schedule payoff. (guided onboarding path, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumShiftTimeInputScreen.tsx`: Shift-time step that translates a selected roster into the hours a worker actually lives by. (guided onboarding path, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, and calendar-based shift setup)
- `src/screens/subscription/PaywallScreen.tsx`: PaywallScreen.tsx is part of the current codebase around this feature area. (physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, and calendar-based shift setup)
- `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`: First screen that frames Ellie as a premium shift companion from the opening moment. (physics-based motion that needs to feel solid, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and premium first impression on first open)
- `src/components/dashboard/OnboardingChecklist.tsx`: OnboardingChecklist.tsx is part of the current codebase around this feature area. (setup state carried across screens, localized copy and language-aware UI, and service and sync layer underneath the app)
- `src/components/onboarding/premium/TimePickerModal.tsx`: Custom time picker for earnings screen using stone and gold theme (localized copy and language-aware UI and tests around the interaction and logic)

## Related Files Reviewed

- `src/contexts/OnboardingContext.tsx`: OnboardingContext Manages state across all premium onboarding flow screens. (country selection built into setup, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
- `src/contexts/VoiceAssistantContext.tsx`: VoiceAssistantContext React Context that connects the VoiceAssistantService orchestrator (setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and tests around the interaction and logic)
- `src/utils/shiftUtils.ts`: Shift Calculation Utilities Functions for calculating shift schedules, patterns, and related data. (setup state carried across screens, shift and date math underneath the answer, and calendar-based shift setup)
- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
