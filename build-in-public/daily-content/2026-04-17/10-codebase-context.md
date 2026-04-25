# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- calendar-based shift setup
- setup state carried across screens
- shift and date math underneath the answer
- MainDashboardScreen Main screen orchestrator for the dashboard.
- Aha moment that turns setup effort into a visible long-range schedule payoff.

## Touched Files Reviewed

- `src/screens/main/MainDashboardScreen.tsx`: MainDashboardScreen Main screen orchestrator for the dashboard. (physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`: Aha moment that turns setup effort into a visible long-range schedule payoff. (guided onboarding path, country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`: Premium Completion Screen Celebration and completion screen for onboarding flow. (guided onboarding path, country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, premium first impression on first open, calendar-based shift setup, and tests around the interaction and logic)
- `src/screens/subscription/PaywallScreen.tsx`: PaywallScreen.tsx is part of the current codebase around this feature area. (country selection built into setup, physics-based motion that needs to feel solid, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, and calendar-based shift setup)
- `src/components/voice/VoiceAssistantModal.tsx`: VoiceAssistantModal Full-screen modal for the Ellie voice assistant. (physics-based motion that needs to feel solid, localized copy and language-aware UI, calendar-based shift setup, and tests around the interaction and logic)
- `src/contexts/__tests__/VoiceAssistantContext.test.tsx`: VoiceAssistantContext Tests Comprehensive tests for the VoiceAssistantProvider and useVoiceAssistant hook. (setup state carried across screens, shift and date math underneath the answer, calendar-based shift setup, and tests around the interaction and logic)

## Related Files Reviewed

- `src/hooks/useSubscription.ts`: useSubscription.ts is part of the current codebase around this feature area.
- `src/hooks/usePaywallRecovery.ts`: usePaywallRecovery Surfaces a soft recovery nudge for users who declined the paywall during (shift and date math underneath the answer)
- `src/contexts/OnboardingContext.tsx`: OnboardingContext Manages state across all premium onboarding flow screens. (country selection built into setup, setup state carried across screens, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and calendar-based shift setup)
- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
