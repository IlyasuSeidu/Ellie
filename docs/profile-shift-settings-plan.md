# Interactive Premium Shift Settings — Profile Tab

## Context

The Profile tab's Shift Configuration section is currently a **read-only display card** (`ShiftConfigCard`) with a footer note: _"Shift settings can be updated in Settings"_ — but no Settings screen exists. Users have no way to change their shift system, pattern, times, or FIFO config after onboarding without re-running the entire flow.

**Goal:** Replace the static card with a fully interactive, premium **Shift Settings Panel** that lets users view and edit all their shift configuration directly from the Profile tab — with beautiful animations, Ionicons, pill toggles, modal pattern selection, and inline time/FIFO editing.

---

## Design: "Shift Command Center"

### Read Mode (default)

A gradient header card showing current config summary, with a `✏️` edit button top-right. Below it, rows with colored Ionicons showing each setting value. Gold pill badges for System and Roster type.

```
┌──────────────────────────────────────────┐
│  [shift-color gradient]                  │
│  ⚙️  Shift Configuration          [✏️]  │
│  2-Shift System · Rotating Roster        │
└──────────────────────────────────────────┘
  ⏱  System         2-Shift (12h)  [gold]
  🔄  Roster         Rotating       [gold]
  📅  Pattern        3-3-3 Rotation
  ☀️  Day Shift      6:00 AM – 6:00 PM  ›
  🌙  Night Shift    6:00 PM – 6:00 AM  ›
```

### Edit Mode (tap ✏️)

Display rows cross-fade out; edit form cross-fades in with staggered entrance. Changes are **buffered locally** until Save is tapped.

```
┌──────────────────────────────────────────┐
│  ⚙️  Edit Shift Settings   [✕ Cancel]   │
└──────────────────────────────────────────┘

  SYSTEM
  [● 2-Shift (12h)] [  3-Shift (8h)  ]    ← animated pill selector

  ROSTER TYPE  (hidden when 3-shift)
  [● Rotating      ] [  FIFO          ]    ← animated pill selector

  PATTERN                           ›      ← tappable row → modal
  3 Days On, 3 Nights On, 3 Days Off

  SHIFT TIMES
  ☀️  Day Shift    6:00 AM – 6:00 PM  ›   ← opens TimePickerModal
  🌙  Night Shift  6:00 PM – 6:00 AM  ›   ← opens TimePickerModal

  ── FIFO DETAILS (only if FIFO roster) ──
  🏗  Work Block        [PatternBuilderSlider: 1–60]
  🏠  Rest Block        [PatternBuilderSlider: 1–60]
  ⚡  Work Pattern
  [Straight Days] [Nights] [Swing] [Custom] ← pill group
  📍  Site Name         [PremiumTextInput]

  ── CUSTOM PATTERN (only if CUSTOM/FIFO_CUSTOM) ──
  PatternBuilderSliders (same as onboarding custom screen)

  [    Save Changes ✓    ]
```

---

## Files to Create

### 1. `src/components/profile/ShiftSettingsPanel.tsx` ← **main new component**

The full interactive shift settings panel. Manages local edit state, animations, and sub-modal visibility.

**State:**

- `isEditing: boolean` — toggle between display/edit mode
- `localData: Partial<OnboardingData>` — buffered edit state, initialized from current profile data on edit open
- `patternSheetVisible: boolean` — controls PatternSelectorSheet modal
- `timePickerTarget: 'dayShift' | 'nightShift' | 'morningShift' | etc | null` — which shift time is being edited
- `isSaving: boolean` — brief loading state on save

**Animations:**

- `displayOpacity / displayTranslateY` — read-only rows fade+slide out on edit
- `editOpacity / editTranslateY` — edit form fades+slides in
- `saveButtonScale` — gold pulse when changes are pending
- `headerGradient` — derives color from current `shiftType` / system

**Key logic:**

- **System change** → if switched to 3-shift, auto-set `localData.rosterType = 'rotating'` and filter incompatible patterns
- **Roster change** → if switched to FIFO, auto-set `localData.patternType` to first valid FIFO pattern if current is rotating
- **Save** → calls `updateData(localData)` from OnboardingContext → AsyncStorage persists automatically → exit edit mode with success haptic
- **Cancel** → reset `localData`, close edit mode with light haptic

**Sub-components (defined in same file or separate):**

- `PillToggle` — animated dual/quad pill selector with spring-animated selection indicator
- `SettingRow` — pressable row with icon, label, value, and optional chevron

### 2. `src/components/profile/PatternSelectorSheet.tsx` ← **new modal**

Reusable pattern picker modal. Shows all patterns available for the user's current system + roster type, with:

- Modal slides up from bottom with spring animation (`translateY: screenHeight → 0`)
- Frosted/dark backdrop (`rgba(0,0,0,0.7)`) fades in
- Grid of pattern cards: Name, cycle days, work:rest ratio, shift icons (colored dots)
- Selected pattern: gold border + `checkmark-circle` Ionicon overlay
- Spring bounce on card tap + haptic
- Close button (X) top-right

**Pattern data source:** Derive from `ShiftPattern` enum — filter by `shiftSystem` and `rosterType` using the same pattern-to-config mapping as `getShiftPattern()` in `src/utils/shiftUtils.ts`

**Props:** `visible`, `onClose`, `shiftSystem`, `rosterType`, `selectedPattern`, `onSelect(pattern: ShiftPattern)`

---

## Files to Modify

### 3. `src/screens/main/ProfileScreen.tsx`

- Replace `<ShiftConfigCard ... />` with `<ShiftSettingsPanel data={profile.data} onUpdate={profile.updateData} />`
- Remove `ShiftConfigCard` import, add `ShiftSettingsPanel` import
- Remove `ProfileSectionHeader` for "Shift Configuration" (the panel has its own header)

### 4. `src/hooks/useProfileData.ts`

- Expose `updateData` from `useOnboarding()` directly on the hook's return value so `ProfileScreen` can pass it cleanly to `ShiftSettingsPanel`
- Currently: hook returns `data`, `isEditing`, `startEditing`, `saveChanges`, `cancelEditing`, `updateField`, `handleAvatarChange`, `editedFields`
- Add: `updateData: (updates: Partial<OnboardingData>) => void`

### 5. `src/components/profile/ShiftConfigCard.tsx`

- **Keep file but deprecate** — it's used in tests. Add a `@deprecated` JSDoc comment. The new `ShiftSettingsPanel` replaces it in `ProfileScreen`.

---

## Key Components to Reuse

| Component                   | File                                                         | Usage in ShiftSettingsPanel                                 |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `TimePickerModal`           | `src/components/onboarding/premium/TimePickerModal.tsx`      | Edit shift start/end times                                  |
| `PatternBuilderSlider`      | `src/components/onboarding/premium/PatternBuilderSlider.tsx` | Custom pattern days + FIFO block days                       |
| `PremiumTextInput`          | `src/components/onboarding/premium/PremiumTextInput.tsx`     | FIFO site name                                              |
| `PremiumButton`             | `src/components/onboarding/premium/PremiumButton.tsx`        | Save Changes button                                         |
| `getPatternDisplayName`     | `src/utils/profileUtils.ts`                                  | Pattern row display text                                    |
| `getShiftSystemDisplayName` | `src/utils/profileUtils.ts`                                  | System row display text                                     |
| `getRosterTypeDisplayName`  | `src/utils/profileUtils.ts`                                  | Roster row display text                                     |
| `formatShiftTime`           | `src/utils/profileUtils.ts`                                  | Format time strings in display rows                         |
| `getShiftPattern`           | `src/utils/shiftUtils.ts`                                    | Get cycle info per pattern (for PatternSelectorSheet cards) |

---

## Ionicons Used

| Row                 | Icon                                  | Color                 |
| ------------------- | ------------------------------------- | --------------------- |
| System              | `time-outline`                        | `#2196F3` (blue)      |
| Roster              | `swap-horizontal-outline`             | `#651FFF` (purple)    |
| Pattern             | `refresh-circle-outline`              | `sacredGold`          |
| Day Shift           | `sunny-outline`                       | `#2196F3`             |
| Night Shift         | `moon-outline`                        | `#651FFF`             |
| Morning Shift       | `partly-sunny-outline`                | `#F59E0B`             |
| Afternoon Shift     | `cloud-outline`                       | `#06B6D4`             |
| FIFO Work Block     | `construct-outline`                   | `#2196F3`             |
| FIFO Rest Block     | `home-outline`                        | `#78716c`             |
| FIFO Work Pattern   | `flash-outline`                       | `sacredGold`          |
| Site Name           | `location-outline`                    | `#06B6D4`             |
| Edit button         | `create-outline` / `checkmark-circle` | `dust` / `sacredGold` |
| Pattern sheet close | `close-circle`                        | `dust`                |
| Selected pattern    | `checkmark-circle`                    | `sacredGold`          |

---

## Gradient Header Colors (by system/roster)

- 2-shift Rotating: `['#1565C0', '#7B1FA2']` (blue → purple)
- 3-shift Rotating: `['#E65100', '#F57F17']` (amber → orange)
- FIFO: `['#1B5E20', '#1565C0']` (green → blue, matches FIFO work block colors)

---

## Animation Specs

| Interaction                  | Animation                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Enter edit mode              | Display rows: fade+translateY(-8) out 300ms; Edit form: fade+translateY(12→0) in 300ms staggered |
| Exit edit mode               | Reverse of above                                                                                 |
| Pill toggle selection        | Spring-animated highlight View slides to selected pill (damping:18, stiffness:280)               |
| Pattern card tap (sheet)     | Scale 0.96 → spring back 1.02 → 1.0; haptic impact                                               |
| Time row tap                 | Scale 0.97 → spring 1.0; haptic light                                                            |
| Save button                  | Gold pulse repeat when `hasChanges`; success haptic + flash on save                              |
| PatternSelectorSheet open    | `translateY: height → 0` spring; backdrop opacity 0 → 0.7                                        |
| PatternSelectorSheet close   | Reverse                                                                                          |
| Section headers in edit mode | `FadeInUp` with 60ms stagger per section                                                         |

---

## Verification

1. `npx tsc --noEmit` — zero type errors
2. `npx jest --testPathPattern="Profile"` — all profile tests pass
3. Update snapshots: `npx jest --testPathPattern="Profile" -u`
4. Manual testing:
   - **Read mode**: All current config shows correctly with icons + badges
   - **Edit → System toggle**: Switch 2-shift ↔ 3-shift; 3-shift auto-hides Roster section, auto-resets incompatible FIFO pattern
   - **Edit → Pattern**: Tap pattern row → sheet opens with correct patterns for system/roster; tap pattern → closes + updates row
   - **Edit → Time**: Tap time row → `TimePickerModal` opens; select time → row updates
   - **Edit → FIFO details**: Only visible for FIFO roster; sliders + pattern pills + site name all work
   - **Edit → Custom**: PatternBuilderSliders appear for CUSTOM/FIFO_CUSTOM patterns
   - **Save**: Changes persist after navigating away and back to Profile tab
   - **Cancel**: Changes discarded, display reverts to original values
   - **3-shift**: Roster row hidden; only rotating patterns shown in sheet
