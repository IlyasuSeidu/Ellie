# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

- Premium button with haptic feedback and animations using stone and gold theme Features: shimmer effect, pulse glow, bouncy interactions, and smooth press animations
- Base card component with shadow and animations using stone and gold theme
- Floating label text input with animations using stone and gold theme
- guided onboarding path
- physics-based motion that needs to feel solid
- chat-style introduction that asks one thing at a time

## Touched Files Reviewed

- `src/components/onboarding/premium/PremiumButton.tsx`: Premium button with haptic feedback and animations using stone and gold theme Features: shimmer effect, pulse glow, bouncy interactions, and smooth press animations (physics-based motion that needs to feel solid)
- `src/components/onboarding/premium/PremiumCard.tsx`: Base card component with shadow and animations using stone and gold theme (physics-based motion that needs to feel solid)
- `src/components/onboarding/premium/PremiumTextInput.tsx`: Floating label text input with animations using stone and gold theme (physics-based motion that needs to feel solid)
- `src/components/onboarding/premium/ProgressHeader.tsx`: Progress header that makes a long setup feel finite and directed. (guided onboarding path, physics-based motion that needs to feel solid, and localized copy and language-aware UI)
- `src/components/onboarding/premium/index.ts`: Premium Onboarding Components Export all premium onboarding components (guided onboarding path, chat-style introduction that asks one thing at a time, country selection built into setup, and calendar-based shift setup)
- `src/components/onboarding/premium/LivePatternPreview.tsx`: Visual preview of custom shift pattern using stone and gold theme (physics-based motion that needs to feel solid, localized copy and language-aware UI, shift and date math underneath the answer, and calendar-based shift setup)

## Related Files Reviewed

- `src/utils/theme.ts`: Theme Configuration Comprehensive theme system with colors, typography, spacing, and design tokens. (calendar-based shift setup)
- `src/utils/hapticsDiagnostics.ts`: hapticsDiagnostics.ts is part of the current codebase around this feature area. (shift and date math underneath the answer)
