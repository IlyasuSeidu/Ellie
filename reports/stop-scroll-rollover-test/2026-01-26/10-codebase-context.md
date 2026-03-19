# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- One-question-at-a-time introduction flow that makes profile setup feel conversational instead of administrative.
- First screen that frames Ellie as a premium shift companion from the opening moment.
- Phase selection that helps people place themselves correctly inside a repeating roster cycle.
- guided onboarding path
- physics-based motion that needs to feel solid
- country selection built into setup

## Touched Files Reviewed

- `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`: One-question-at-a-time introduction flow that makes profile setup feel conversational instead of administrative. (guided onboarding path, chat-style introduction that asks one thing at a time, country selection built into setup, setup state carried across screens, validated setup inputs, localized copy and language-aware UI, and shift and date math underneath the answer)
- `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`: First screen that frames Ellie as a premium shift companion from the opening moment. (physics-based motion that needs to feel solid, localized copy and language-aware UI, shift and date math underneath the answer, service and sync layer underneath the app, and premium first impression on first open)
- `src/components/onboarding/premium/PhaseSelector.tsx`: Phase selection that helps people place themselves correctly inside a repeating roster cycle. (physics-based motion that needs to feel solid, localized copy and language-aware UI, and calendar-based shift setup)
- `src/components/onboarding/premium/PremiumButton.tsx`: Premium button with haptic feedback and animations using stone and gold theme Features: shimmer effect, pulse glow, bouncy interactions, and smooth press animations (physics-based motion that needs to feel solid)
- `src/components/onboarding/premium/PremiumCountrySelector.tsx`: Country selection folded into setup so localization and future defaults start cleaner. (country selection built into setup, physics-based motion that needs to feel solid, and localized copy and language-aware UI)
- `src/components/onboarding/premium/PremiumCountrySelectorModal.tsx`: PremiumCountrySelectorModal.tsx is part of the current codebase around this feature area. (country selection built into setup and localized copy and language-aware UI)

## Related Files Reviewed

- `src/navigation/AppNavigator.tsx`: AppNavigator Root navigator with three route groups: (guided onboarding path, shift and date math underneath the answer, and service and sync layer underneath the app)
- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
- `src/components/onboarding/premium/ProgressHeader.tsx`: Progress header that makes a long setup feel finite and directed. (guided onboarding path, physics-based motion that needs to feel solid, and localized copy and language-aware UI)
- `src/utils/hapticsDiagnostics.ts`: hapticsDiagnostics.ts is part of the current codebase around this feature area. (shift and date math underneath the answer)
