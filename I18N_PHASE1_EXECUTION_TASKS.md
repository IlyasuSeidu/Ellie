# I18N Phase 1 Execution Tasks

Source of truth:

- `I18N_IMPLEMENTATION_PLAN.md`
- This task file
- The app codebase

Scope lock:

- Implement Phase 1 exactly: Steps 1-22 from the source plan
- Languages in runtime UI: `en`, `es`, `pt-BR`
- Do not skip any step below

## Ordered Tasks

1. Install packages

- `expo-localization`
- `i18next`
- `react-i18next`

2. Create `src/i18n/languageDetector.ts`

- AsyncStorage + device locale detector + language cache key `@ellie_language`

3. Create `src/i18n/index.ts`

- i18next setup with namespaces: `common`, `onboarding`, `dashboard`, `profile`, `schedule`
- resources for `en`, `es`, `pt-BR`
- fallback to `en`
- dayjs locale sync on init + language change

4. Create `src/i18n/types.ts`

- i18next type augmentation for typed translation keys

5. Create `src/contexts/LanguageContext.tsx`

- expose `language`, `setLanguage`
- sync state with i18n initialization and changes

6. Update `index.ts`

- import i18n bootstrap before app register

7. Update `App.tsx`

- add `LanguageProvider` wrapping app content

8. Update `src/components/dashboard/PersonalizedHeader.tsx`

- greetings + avatar action sheet strings -> i18n keys

9. Update `src/screens/main/MainDashboardScreen.tsx`

- refresh labels, updated text, errors, fallback username, FIFO countdown -> i18n keys

10. Update `src/screens/main/ProfileScreen.tsx`

- section titles -> i18n keys
- add language row + open selector sheet
- render `LanguageSelectorSheet`

11. Update `src/components/profile/ProfileEditForm.tsx`

- labels/buttons/placeholders/fallback strings -> i18n keys

12. Update `src/components/profile/ShiftSettingsPanel.tsx`

- all read/edit labels + chips + buttons + cycle labels + placeholders -> i18n keys

13. Update `src/components/dashboard/CurrentShiftStatusCard.tsx`

- subtitles + FIFO labels + block-change labels -> i18n keys

14. Update `src/components/dashboard/MonthlyCalendarCard.tsx`

- remove hardcoded month names; use dayjs locale month formatting
- localize legend + accessibility labels

15. Update `src/components/dashboard/UpcomingShiftsCard.tsx`

- shift labels -> i18n keys

16. Update `src/components/dashboard/StatisticsCard.tsx`

- stat labels -> i18n keys

17. Update `src/components/profile/WorkStatsSummary.tsx`

- labels -> i18n keys

18. Update `src/screens/main/ScheduleScreen.tsx`

- placeholder strings -> i18n keys

19. Update `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`

- bot messages + validation errors -> i18n
- replace content-based dedup with `metadata.questionKey`

20. Update `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`

- tagline + CTA -> i18n keys

21. Update remaining onboarding screens

- `PremiumShiftSystemScreen`
- `PremiumShiftPatternScreen`
- `PremiumCompletionScreen`
- `PremiumRosterTypeScreen`
- `PremiumCustomPatternScreen`
- `PremiumFIFOCustomPatternScreen`
- `PremiumPhaseSelectorScreen`
- `PremiumFIFOPhaseSelectorScreen`
- `PremiumStartDateScreen`
- `PremiumShiftTimeInputScreen`

22. Create `src/components/profile/LanguageSelectorSheet.tsx`

- same motion pattern style as existing pattern sheet
- display only phase-1 languages (`en`, `es`, `pt-BR`)
- expose `LANGUAGE_NAMES`

## Locale Files to Create

- `src/i18n/locales/en/common.json`
- `src/i18n/locales/en/dashboard.json`
- `src/i18n/locales/en/profile.json`
- `src/i18n/locales/en/onboarding.json`
- `src/i18n/locales/en/schedule.json`
- `src/i18n/locales/es/common.json`
- `src/i18n/locales/es/dashboard.json`
- `src/i18n/locales/es/profile.json`
- `src/i18n/locales/es/onboarding.json`
- `src/i18n/locales/es/schedule.json`
- `src/i18n/locales/pt-BR/common.json`
- `src/i18n/locales/pt-BR/dashboard.json`
- `src/i18n/locales/pt-BR/profile.json`
- `src/i18n/locales/pt-BR/onboarding.json`
- `src/i18n/locales/pt-BR/schedule.json`

## Validation Tasks

1. `npm run type-check`
2. `npm run lint`
3. `npm test -- --runInBand --silent`

## Post-Phase 1 Extension (Implemented)

1. Expanded runtime language support in detector/resources to:
   - `en`, `es`, `pt-BR`, `fr`, `ar`, `zh-CN`, `ru`, `hi`, `af`, `zu`, `id`
2. Added locale file sets for all runtime languages across namespaces:
   - `common`, `onboarding`, `dashboard`, `profile`, `schedule`
3. Extended language selector UI to include all runtime languages.
4. Implemented Arabic RTL switching with restart behavior:
   - toggle `I18nManager.allowRTL/forceRTL` when switching into/out of Arabic
   - persist language, then trigger `expo-updates` reload
   - fallback blocking alert if reload is unavailable/fails
5. Extended date locale mapping for additional languages in onboarding/completion formatting flows.
6. Completed strict onboarding language polish for `es` and `pt-BR` and preserved interpolation-token integrity.
