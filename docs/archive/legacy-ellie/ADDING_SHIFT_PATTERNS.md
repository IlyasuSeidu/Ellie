# Adding New Shift Patterns

This guide covers how to add a new rotating or FIFO pattern safely.

## 1. Add the enum value

- File: `src/types/index.ts`
- Add the new `ShiftPattern` entry.
- If it is FIFO, ensure `rosterType` for the pattern is `fifo`.

## 2. Add default config

- File: `src/utils/shiftUtils.ts`
- Update `getShiftPattern(...)`.
- For FIFO presets, update `getDefaultFIFOConfig(...)`.

## 3. Wire onboarding cards

- File: `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`
- Add a card entry with:
  - `type`
  - `rosterType`
  - `supportedSystems`
  - `iconImage`
  - description text

## 4. Update onboarding phase helpers

- FIFO patterns:
  - `src/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen.tsx`
  - `src/screens/onboarding/premium/PremiumStartDateScreen.tsx`
- Rotating patterns:
  - `src/screens/onboarding/premium/PremiumPhaseSelectorScreen.tsx`
  - `src/screens/onboarding/premium/PremiumStartDateScreen.tsx`

## 5. Update voice tooling

- Client: `src/utils/shiftQueryTools.ts`
- Backend: `backend/functions/src/shift-tools.ts`
- Prompt/tool catalog:
  - `src/utils/voiceAssistantPrompts.ts`
  - `backend/functions/src/ellie-brain.ts`

## 6. Add tests (required)

- `src/utils/__tests__/shiftUtils.fifo.test.ts` (or rotating equivalent)
- `src/utils/__tests__/shiftQueryTools.test.ts`
- `backend/functions/src/__tests__/shift-tools.test.ts`
- Onboarding navigation test updates if path changes

## 7. Validate before merge

1. `npm run type-check`
2. `npm test -- --runInBand`
3. Manual smoke on iOS + Android for the new pattern
