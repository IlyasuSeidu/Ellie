# 🎯 COMPREHENSIVE IMPLEMENTATION PLAN: DUAL-PARADIGM ROSTER SYSTEM

**Project:** Ellie Mining Shift Tracker
**Feature:** Support for Both Rotating and FIFO Roster Systems
**Status:** Planning Phase
**Estimated Duration:** 6 weeks (~216 hours)
**Created:** February 26, 2026

---

## Executive Summary

Your app currently supports **rotating shift rosters** (African/European style) but needs to also support **FIFO/block rosters** (Australian/Canadian style). These are fundamentally different roster paradigms that require architectural changes while maintaining backward compatibility.

---

## 📊 PART 1: UNDERSTANDING THE TWO PARADIGMS

### Paradigm A: **Rotating Shift Roster** (Current System)

**How it works:**

- Workers rotate through different shift times in a repeating cycle
- Pattern: Days → Nights → Off (or Morning → Afternoon → Night → Off)
- Each position in the cycle has a specific shift type

**Example: 5-5-5 Pattern**

```
Day 1-5:   Day shift (7am-7pm)
Day 6-10:  Night shift (7pm-7am)
Day 11-15: Off
[Cycle repeats]
```

**Current Support:** ✅ **Fully Supported**

- Works perfectly in your app
- Used in: South Africa, Zambia, DRC, Europe, some US operations

---

### Paradigm B: **FIFO/Block Roster** (Missing)

**How it works:**

- Workers work consecutive days at site, then consecutive days at home
- No rotation between day/night during the work block
- Pattern: Work Block → Rest Block
- Worker might be on "straight days" or "straight nights" for entire work block
- OR might swing (alternate weeks of days/nights) but the key is **blocks of time**

**Example: 8/6 FIFO**

```
Days 1-8:  At site, working 12-hour shifts
           (could be all day shifts, OR all night shifts, OR week days + week nights)
Days 9-14: At home, completely off
[Cycle repeats]
```

**Current Support:** ❌ **Not Supported**

- Your current system CAN'T represent this
- Used in: Australia, Canada, remote global mining

---

## 🔍 PART 2: KEY ARCHITECTURAL DIFFERENCES

| Aspect              | Rotating Roster                        | FIFO/Block Roster                                         |
| ------------------- | -------------------------------------- | --------------------------------------------------------- |
| **Cycle Structure** | Days → Nights → Off                    | Work Block → Rest Block                                   |
| **Shift Rotation**  | Mandatory rotation through shift times | Optional - might be straight days/nights                  |
| **Home/Site**       | Go home daily or frequently            | Continuous time on-site, then extended time home          |
| **Terminology**     | "5-5-5", "4-4-4"                       | "8/6", "14/14", "2:1 roster"                              |
| **Calendar View**   | Shows day/night/off pattern            | Shows work blocks vs rest blocks                          |
| **Calculation**     | Position maps to shift type            | Position maps to work/rest block, then shift within block |

---

## 🏗️ PART 3: REQUIRED ARCHITECTURAL CHANGES

### 3.1 Data Model Extensions

#### **Add Roster Type to ShiftCycle**

```typescript
// src/types/index.ts

export enum RosterType {
  ROTATING = 'rotating', // Current system (days → nights → off)
  FIFO = 'fifo', // Block roster (work block → rest block)
}

export interface ShiftCycle {
  // ... existing fields ...

  // NEW: Roster paradigm type
  rosterType: RosterType;

  // NEW: FIFO-specific configuration
  fifoConfig?: {
    workBlockDays: number; // e.g., 8 days
    restBlockDays: number; // e.g., 6 days

    // How shifts are organized during work block
    workBlockPattern: 'straight-days' | 'straight-nights' | 'swing' | 'custom';

    // For 'swing': define the swing pattern
    swingPattern?: {
      daysOnDayShift: number; // e.g., 7 days on day shift
      daysOnNightShift: number; // e.g., 7 days on night shift
    };

    // For 'custom': define exact sequence
    customWorkSequence?: ShiftType[]; // e.g., ['day', 'day', 'night', 'night', 'day', ...]

    // Optional: Fly-in/fly-out specific
    flyInDay?: number; // Day of cycle for travel to site (often day 0 or 1)
    flyOutDay?: number; // Day of cycle for travel home
    siteName?: string; // "Olympic Dam", "Mt Whaleback", etc.
  };
}
```

#### **New Shift Pattern Enums for FIFO**

```typescript
// src/types/index.ts

export enum ShiftPattern {
  // ... existing rotating patterns ...

  // NEW: FIFO Patterns (Australia/Canada)
  FIFO_7_7 = 'FIFO_7_7', // 7 days work, 7 days home (even-time)
  FIFO_8_6 = 'FIFO_8_6', // 8 days work, 6 days home
  FIFO_14_14 = 'FIFO_14_14', // 14 days work, 14 days home (even-time)
  FIFO_14_7 = 'FIFO_14_7', // 14 days work, 7 days home (2:1)
  FIFO_21_7 = 'FIFO_21_7', // 21 days work, 7 days home (3:1)
  FIFO_28_14 = 'FIFO_28_14', // 28 days work, 14 days home (2:1)
  FIFO_CUSTOM = 'FIFO_CUSTOM', // Custom FIFO roster
}
```

---

### 3.2 Calculation Logic Changes

#### **Update calculateShiftDay() Function**

File: `src/utils/shiftUtils.ts`

```typescript
export function calculateShiftDay(date: Date, shiftCycle: ShiftCycle): ShiftDay {
  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate);
  daysSinceStart += shiftCycle.phaseOffset;

  // NEW: Branch based on roster type
  if (shiftCycle.rosterType === RosterType.FIFO && shiftCycle.fifoConfig) {
    return calculateFIFOShiftDay(date, daysSinceStart, shiftCycle);
  } else {
    // Existing rotating roster logic
    return calculateRotatingShiftDay(date, daysSinceStart, shiftCycle);
  }
}

// NEW FUNCTION: FIFO Calculation
function calculateFIFOShiftDay(
  date: Date,
  daysSinceStart: number,
  shiftCycle: ShiftCycle
): ShiftDay {
  const config = shiftCycle.fifoConfig!;
  const cycleLength = config.workBlockDays + config.restBlockDays;

  // Handle negative days
  if (daysSinceStart < 0) {
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  const positionInCycle = daysSinceStart % cycleLength;

  // Determine if in work block or rest block
  if (positionInCycle < config.workBlockDays) {
    // IN WORK BLOCK
    const dayInWorkBlock = positionInCycle;

    // Determine shift type based on work block pattern
    let shiftType: ShiftType;
    let isNightShift: boolean;

    switch (config.workBlockPattern) {
      case 'straight-days':
        shiftType = 'day';
        isNightShift = false;
        break;

      case 'straight-nights':
        shiftType = 'night';
        isNightShift = true;
        break;

      case 'swing':
        if (config.swingPattern) {
          // Swing between days and nights
          if (dayInWorkBlock < config.swingPattern.daysOnDayShift) {
            shiftType = 'day';
            isNightShift = false;
          } else {
            shiftType = 'night';
            isNightShift = true;
          }
        } else {
          // Default swing: alternate weeks
          const weekInBlock = Math.floor(dayInWorkBlock / 7);
          if (weekInBlock % 2 === 0) {
            shiftType = 'day';
            isNightShift = false;
          } else {
            shiftType = 'night';
            isNightShift = true;
          }
        }
        break;

      case 'custom':
        if (config.customWorkSequence && config.customWorkSequence.length > 0) {
          const sequenceIndex = dayInWorkBlock % config.customWorkSequence.length;
          shiftType = config.customWorkSequence[sequenceIndex];
          isNightShift = shiftType === 'night';
        } else {
          shiftType = 'day';
          isNightShift = false;
        }
        break;

      default:
        shiftType = 'day';
        isNightShift = false;
    }

    return {
      date: toDateString(date),
      isWorkDay: true,
      isNightShift,
      shiftType,
    };
  } else {
    // IN REST BLOCK
    return {
      date: toDateString(date),
      isWorkDay: false,
      isNightShift: false,
      shiftType: 'off',
    };
  }
}

// REFACTORED: Existing logic extracted to separate function
function calculateRotatingShiftDay(
  date: Date,
  daysSinceStart: number,
  shiftCycle: ShiftCycle
): ShiftDay {
  // ... existing rotating roster calculation logic ...
  // (This is the current implementation - just extracted to separate function)
}
```

---

### 3.3 Pattern Definitions

#### **Update getShiftPattern() Function**

File: `src/utils/shiftUtils.ts`

```typescript
export function getShiftPattern(patternType: ShiftPattern): {
  config: ShiftPatternConfig;
  defaultShiftSystem: ShiftSystem;
  supportsShiftSystem: ShiftSystem[];
  rosterType: RosterType;  // NEW
} {
  const patterns: Record<ShiftPattern, ...> = {
    // ... existing rotating patterns ...

    // NEW: FIFO Patterns
    [ShiftPattern.FIFO_7_7]: {
      config: {
        // For FIFO, we repurpose fields differently
        daysOn: 7,     // workBlockDays
        nightsOn: 0,   // not used in FIFO
        daysOff: 7,    // restBlockDays
        totalCycleDays: 14,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },

    [ShiftPattern.FIFO_8_6]: {
      config: {
        daysOn: 8,
        nightsOn: 0,
        daysOff: 6,
        totalCycleDays: 14,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },

    [ShiftPattern.FIFO_14_14]: {
      config: {
        daysOn: 14,
        nightsOn: 0,
        daysOff: 14,
        totalCycleDays: 28,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },

    [ShiftPattern.FIFO_14_7]: {
      config: {
        daysOn: 14,
        nightsOn: 0,
        daysOff: 7,
        totalCycleDays: 21,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },

    [ShiftPattern.FIFO_21_7]: {
      config: {
        daysOn: 21,
        nightsOn: 0,
        daysOff: 7,
        totalCycleDays: 28,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },

    [ShiftPattern.FIFO_28_14]: {
      config: {
        daysOn: 28,
        nightsOn: 0,
        daysOff: 14,
        totalCycleDays: 42,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },

    [ShiftPattern.FIFO_CUSTOM]: {
      config: {
        daysOn: 0,
        nightsOn: 0,
        daysOff: 0,
        totalCycleDays: 0,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
      rosterType: RosterType.FIFO,
    },
  };

  return patterns[patternType];
}
```

---

## 🎨 PART 4: UI/UX IMPLEMENTATION

### 4.1 Add Roster Type Selection Screen

**NEW SCREEN: PremiumRosterTypeScreen** (Step 3.5 - after Shift System, before Shift Pattern)

File: `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx`

```typescript
/**
 * PremiumRosterTypeScreen Component
 *
 * Lets user choose between Rotating Roster and FIFO Roster paradigms
 * This determines which pattern options are shown next
 */

const ROSTER_TYPES = [
  {
    id: 'rotating',
    type: RosterType.ROTATING,
    icon: '🔄',
    title: 'Rotating Roster',
    subtitle: 'Days → Nights → Off pattern',
    description: 'You rotate through different shift times in a repeating cycle',
    examples: ['5-5-5 (South Africa)', '4-4-4 (common globally)', '7-7-7 (long cycle)'],
    regions: ['South Africa', 'Zambia', 'DRC', 'Europe', 'Some US operations'],
  },
  {
    id: 'fifo',
    type: RosterType.FIFO,
    icon: '✈️',
    title: 'FIFO / Swing Roster',
    subtitle: 'Work blocks → Home blocks',
    description: 'You work consecutive days on-site, then get extended time at home',
    examples: ['8/6 (common WA)', '14/14 (even-time)', '21/7 (remote sites)'],
    regions: ['Australia', 'Canada', 'Remote global mining'],
  },
];
```

**Implementation:**

- Similar swipe card UI to ShiftSystemScreen and ShiftPatternScreen
- Save selection to `onboardingData.rosterType`
- Filter available patterns based on roster type selection

---

### 4.2 Update Pattern Selection Screen

**File: `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`**

**Changes:**

1. Filter patterns based on `rosterType`:

```typescript
const { data } = useOnboarding();
const rosterType = data.rosterType || RosterType.ROTATING; // Default to rotating

const filteredPatterns = SHIFT_PATTERNS.filter((pattern) => {
  const patternInfo = getShiftPattern(pattern.type);
  return patternInfo.rosterType === rosterType && pattern.supportedSystems.includes(shiftSystem);
});
```

2. **Update pattern cards:**

**For FIFO Patterns:**

```typescript
{
  id: 'fifo-8-6',
  type: ShiftPattern.FIFO_8_6,
  icon: '⛏️',
  iconImage: require('../../../../assets/onboarding/icons/fifo-8-6.png'),
  name: 'FIFO 8/6',
  schedule: '8 days work • 6 days home',
  description: 'Work 8 consecutive days on-site, then 6 days at home—popular in WA mining',
  supportedSystems: [ShiftSystem.TWO_SHIFT],
  detailedInfo: {
    workRestRatio: '8 days at site, 6 days at home (14-day cycle)',
    useCases: ['Western Australian mining', 'Remote operations', 'FIFO camps'],
    pros: ['Good work-life balance', 'Enough time to recover', 'Easy to plan around'],
    cons: ['Travel days can be tiring', 'Away from home for over a week'],
  },
},

{
  id: 'fifo-14-14',
  type: ShiftPattern.FIFO_14_14,
  icon: '🏠',
  name: 'FIFO 14/14 (Even-Time)',
  schedule: '2 weeks work • 2 weeks home',
  description: 'Two weeks on-site, two weeks at home—perfect work-life balance',
  supportedSystems: [ShiftSystem.TWO_SHIFT],
  detailedInfo: {
    workRestRatio: '14 days at site, 14 days at home (28-day cycle)',
    useCases: ['Remote mining', 'Offshore operations', 'Long-distance FIFO'],
    pros: ['Perfect 50/50 balance', '2 full weeks at home', 'Predictable schedule'],
    cons: ['2 weeks away is tough on family', 'Long travel distances'],
  },
},

// ... other FIFO patterns
```

**For Rotating Patterns (update descriptions to clarify):**

```typescript
{
  id: '5-5-5',
  type: ShiftPattern.STANDARD_5_5_5,
  icon: '📅',
  name: '5-5-5 Rotation',
  schedule: '5 days • 5 nights • 5 off',  // Keep as-is
  description: 'Work 5 day shifts, then 5 night shifts, then 5 days off—standard rotation',
  // ... rest stays the same
}
```

---

### 4.3 Create FIFO Custom Pattern Screen

**NEW SCREEN: PremiumFIFOCustomPatternScreen**

File: `src/screens/onboarding/premium/PremiumFIFOCustomPatternScreen.tsx`

```typescript
/**
 * PremiumFIFOCustomPatternScreen Component
 *
 * Custom FIFO roster builder
 * Shown when user selects FIFO_CUSTOM pattern
 */

interface FIFOCustomConfig {
  workBlockDays: number; // 1-60 days
  restBlockDays: number; // 1-60 days
  workBlockPattern: 'straight-days' | 'straight-nights' | 'swing';
  swingConfig?: {
    daysOnDayShift: number;
    daysOnNightShift: number;
  };
}

// Slider inputs:
// 1. "Days at Site" slider (1-60)
// 2. "Days at Home" slider (1-60)
// 3. "Shift Pattern" selector:
//    - Straight Days (work only day shifts)
//    - Straight Nights (work only night shifts)
//    - Swing Roster (alternate between days/nights)
// 4. If Swing selected:
//    - "Days on Day Shift" slider
//    - "Days on Night Shift" slider

// Live Preview: Show work/rest blocks visually
```

---

### 4.4 Update Existing Custom Pattern Screen

**File: `src/screens/onboarding/premium/PremiumCustomPatternScreen.tsx`**

**Add routing logic:**

```typescript
const { data } = useOnboarding();

// If FIFO roster type, redirect to FIFO custom screen
if (data.rosterType === RosterType.FIFO) {
  return <PremiumFIFOCustomPatternScreen />;
}

// Otherwise, show existing rotating custom pattern screen
// ... existing implementation
```

---

### 4.5 Calendar Visualization Updates

**File: `src/components/dashboard/MonthlyCalendarCard.tsx`**

**For FIFO rosters:**

- Color entire work blocks with same color
- Add "Work Block" / "Rest Block" labels
- Show block numbers (e.g., "Work Block 1 of 2")

**Example visual:**

```
FIFO 8/6 Roster:
┌──────────────────────────────┐
│  Work Block (Days 1-8)       │
│  [DAY][DAY][DAY][DAY][DAY]   │ ← All same blue color
│  [DAY][DAY][DAY]             │
│                              │
│  Rest Block (Days 9-14)      │
│  [OFF][OFF][OFF][OFF][OFF]   │ ← All same gray color
│  [OFF]                       │
└──────────────────────────────┘
```

---

## 🔧 PART 5: DETAILED IMPLEMENTATION STEPS

### Phase 1: Data Model & Core Logic (Week 1)

#### Task 1.1: Update Type Definitions

**File:** `src/types/index.ts`

- [ ] Add `RosterType` enum
- [ ] Add `fifoConfig` to `ShiftCycle` interface
- [ ] Add new `FIFO_*` patterns to `ShiftPattern` enum
- [ ] Update `ShiftPatternConfig` to include `rosterType`
- [ ] Write unit tests for new types

**Estimated Time:** 2 hours

---

#### Task 1.2: Implement FIFO Calculation Logic

**File:** `src/utils/shiftUtils.ts`

- [ ] Create `calculateFIFOShiftDay()` function
- [ ] Create `calculateRotatingShiftDay()` function (extract existing logic)
- [ ] Update `calculateShiftDay()` to branch based on roster type
- [ ] Update `getShiftPattern()` to include FIFO patterns
- [ ] Update helper functions (`getShiftCycle`, `getNextShift`, etc.) to handle FIFO
- [ ] Write comprehensive unit tests (100+ test cases)

**Estimated Time:** 8 hours

**Test Cases to Cover:**

```typescript
describe('FIFO Roster Calculations', () => {
  describe('8/6 Pattern - Straight Days', () => {
    it('should return day shift for days 1-8', () => {});
    it('should return off for days 9-14', () => {});
    it('should cycle correctly after day 14', () => {});
  });

  describe('14/14 Pattern - Swing Roster', () => {
    it('should return day shifts for first 7 days', () => {});
    it('should return night shifts for days 8-14', () => {});
    it('should return off for days 15-28', () => {});
  });

  describe('Phase Offset with FIFO', () => {
    it('should correctly offset work/rest blocks', () => {});
  });

  describe('Edge Cases', () => {
    it('should handle dates before cycle start', () => {});
    it('should handle leap years', () => {});
  });
});
```

---

#### Task 1.3: Migration & Backward Compatibility

**File:** `src/utils/migrationUtils.ts` (NEW)

- [ ] Create function to detect old data and migrate
- [ ] Add `rosterType: RosterType.ROTATING` to all existing shift cycles
- [ ] Ensure all existing patterns still work
- [ ] Write migration tests

```typescript
export function migrateShiftCycleToV2(oldCycle: any): ShiftCycle {
  if (oldCycle.rosterType) {
    return oldCycle; // Already migrated
  }

  return {
    ...oldCycle,
    rosterType: RosterType.ROTATING,
    // No fifoConfig for rotating patterns
  };
}
```

**Estimated Time:** 3 hours

---

### Phase 2: Onboarding UI (Week 2)

#### Task 2.1: Create Roster Type Selection Screen

**File:** `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx` (NEW)

- [ ] Create swipeable card UI for roster type selection
- [ ] Add animations (similar to ShiftSystemScreen)
- [ ] Implement haptic feedback
- [ ] Save selection to OnboardingContext
- [ ] Write component tests

**Estimated Time:** 6 hours

---

#### Task 2.2: Update Pattern Selection Screen

**File:** `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`

- [ ] Filter patterns based on `rosterType`
- [ ] Add FIFO pattern card data
- [ ] Create FIFO pattern icons/images
- [ ] Update card descriptions for FIFO terminology
- [ ] Update tests

**Estimated Time:** 4 hours

---

#### Task 2.3: Create FIFO Custom Pattern Screen

**File:** `src/screens/onboarding/premium/PremiumFIFOCustomPatternScreen.tsx` (NEW)

- [ ] Create slider for work block days
- [ ] Create slider for rest block days
- [ ] Create shift pattern selector (straight days/nights/swing)
- [ ] Add conditional swing configuration inputs
- [ ] Implement live visual preview
- [ ] Save FIFO config to OnboardingContext
- [ ] Write component tests

**Estimated Time:** 8 hours

---

#### Task 2.4: Update Existing Custom Pattern Screen

**File:** `src/screens/onboarding/premium/PremiumCustomPatternScreen.tsx`

- [ ] Add routing logic to detect FIFO vs Rotating
- [ ] Redirect to FIFO custom screen if needed
- [ ] Update tests

**Estimated Time:** 2 hours

---

#### Task 2.5: Update Onboarding Navigator

**File:** `src/navigation/OnboardingNavigator.tsx`

- [ ] Add `RosterType` screen to navigation stack
- [ ] Update navigation flow (after ShiftSystem, before ShiftPattern)
- [ ] Add `FIFOCustomPattern` screen to stack
- [ ] Update `goToNextScreen()` helper logic

**Estimated Time:** 2 hours

---

#### Task 2.6: Update Onboarding Context

**File:** `src/contexts/OnboardingContext.tsx`

- [ ] Add `rosterType` to OnboardingData interface
- [ ] Add `fifoConfig` to OnboardingData interface
- [ ] Update persistence logic
- [ ] Update auto-save
- [ ] Write tests

**Estimated Time:** 3 hours

---

### Phase 3: Dashboard & Calendar UI (Week 3)

#### Task 3.1: Update Calendar Component

**File:** `src/components/dashboard/MonthlyCalendarCard.tsx`

- [ ] Detect FIFO roster type
- [ ] Render work/rest blocks with consistent coloring
- [ ] Add block labels ("Work Block", "Rest Block")
- [ ] Update legend for FIFO rosters
- [ ] Update animations
- [ ] Write visual regression tests

**Estimated Time:** 6 hours

---

#### Task 3.2: Update Day Cell Component

**File:** `src/components/dashboard/ShiftCalendarDayCell.tsx`

- [ ] Add FIFO-specific styling (block colors)
- [ ] Update badge labels for FIFO (W for Work, H for Home)
- [ ] Update tests

**Estimated Time:** 2 hours

---

#### Task 3.3: Update Current Shift Status Card

**File:** `src/components/dashboard/CurrentShiftStatusCard.tsx`

- [ ] Show "Work Block Day X of Y" for FIFO
- [ ] Show "Rest Block Day X of Y" for FIFO
- [ ] Add countdown to next block change
- [ ] Update tests

**Estimated Time:** 4 hours

---

### Phase 4: Voice Assistant Integration (Week 4)

#### Task 4.1: Add FIFO Query Tools

**File:** `src/utils/shiftQueryTools.ts`

- [ ] Add `get_next_work_block` tool
- [ ] Add `get_next_rest_block` tool
- [ ] Add `days_until_work` tool
- [ ] Add `days_until_rest` tool
- [ ] Add `current_block_info` tool
- [ ] Update existing tools to handle FIFO
- [ ] Write tests

**Estimated Time:** 4 hours

---

#### Task 4.2: Update Voice Assistant Context

**File:** `src/contexts/VoiceAssistantContext.tsx`

- [ ] Include `rosterType` in user context
- [ ] Include `fifoConfig` in user context
- [ ] Update context serialization
- [ ] Write tests

**Estimated Time:** 2 hours

---

### Phase 5: Assets & Visual Design (Week 4-5)

#### Task 5.1: Create FIFO Pattern Icons

**Directory:** `assets/onboarding/icons/consolidated/`

- [ ] Design `shift-pattern-fifo-8-6.png`
- [ ] Design `shift-pattern-fifo-7-7.png`
- [ ] Design `shift-pattern-fifo-14-14.png`
- [ ] Design `shift-pattern-fifo-14-7.png`
- [ ] Design `shift-pattern-fifo-21-7.png`
- [ ] Design `shift-pattern-fifo-28-14.png`
- [ ] Design `shift-pattern-fifo-custom.png`
- [ ] Design roster type icons (rotating vs FIFO)

**Estimated Time:** 6 hours (with designer)

---

#### Task 5.2: Update Color Schemes

**File:** `src/constants/shiftStyles.ts`

- [ ] Add FIFO work block colors
- [ ] Add FIFO rest block colors
- [ ] Ensure accessibility (contrast ratios)
- [ ] Update theme constants

**Estimated Time:** 2 hours

---

### Phase 6: Testing & QA (Week 5)

#### Task 6.1: Unit Tests

- [ ] Shift calculation tests (100+ cases)
- [ ] Pattern generation tests
- [ ] Date range tests
- [ ] Migration tests
- [ ] Context tests
- [ ] Query tool tests

**Estimated Time:** 8 hours

---

#### Task 6.2: Integration Tests

- [ ] Onboarding flow tests (rotating)
- [ ] Onboarding flow tests (FIFO)
- [ ] Calendar rendering tests
- [ ] Voice assistant tests
- [ ] Navigation tests

**Estimated Time:** 6 hours

---

#### Task 6.3: Visual Regression Tests

- [ ] Calendar screenshots (rotating)
- [ ] Calendar screenshots (FIFO)
- [ ] Pattern selection screenshots
- [ ] Custom pattern screenshots

**Estimated Time:** 4 hours

---

#### Task 6.4: Manual QA Testing

- [ ] Test all onboarding paths
- [ ] Test all pattern types
- [ ] Test calendar visualization
- [ ] Test voice assistant queries
- [ ] Test on iOS devices
- [ ] Test on Android devices (if applicable)
- [ ] Test accessibility features

**Estimated Time:** 8 hours

---

### Phase 7: Documentation & Deployment (Week 6)

#### Task 7.1: Update Documentation

- [ ] Update README with FIFO support
- [ ] Document roster type architecture
- [ ] Create developer guide for adding new patterns
- [ ] Update API documentation
- [ ] Create user guide

**Estimated Time:** 4 hours

---

#### Task 7.2: Performance Testing

- [ ] Profile calculation performance with large date ranges
- [ ] Test memory usage with multiple patterns
- [ ] Optimize if needed

**Estimated Time:** 3 hours

---

#### Task 7.3: Deployment

- [ ] Create release branch
- [ ] Run full test suite
- [ ] Build iOS app
- [ ] Test on physical devices
- [ ] Create release notes
- [ ] Deploy to TestFlight/App Store

**Estimated Time:** 4 hours

---

## 📋 PART 6: COMPLETE FILE CHANGE CHECKLIST

### Files to Modify:

| File                                                           | Changes                                     | Priority      |
| -------------------------------------------------------------- | ------------------------------------------- | ------------- |
| `src/types/index.ts`                                           | Add RosterType, fifoConfig, FIFO patterns   | P0 (Critical) |
| `src/utils/shiftUtils.ts`                                      | FIFO calculation logic, pattern definitions | P0            |
| `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx` | FIFO pattern cards, filtering               | P0            |
| `src/contexts/OnboardingContext.tsx`                           | rosterType field, fifoConfig field          | P0            |
| `src/navigation/OnboardingNavigator.tsx`                       | Add RosterType screen                       | P0            |
| `src/components/dashboard/MonthlyCalendarCard.tsx`             | FIFO block visualization                    | P1            |
| `src/components/dashboard/ShiftCalendarDayCell.tsx`            | FIFO styling                                | P1            |
| `src/utils/shiftQueryTools.ts`                                 | FIFO query tools                            | P1            |
| `src/constants/shiftStyles.ts`                                 | FIFO colors                                 | P2            |
| `src/services/AsyncStorageService.ts`                          | Migration support                           | P2            |

### Files to Create:

| File                                                                | Purpose                    | Priority |
| ------------------------------------------------------------------- | -------------------------- | -------- |
| `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx`        | Roster type selection UI   | P0       |
| `src/screens/onboarding/premium/PremiumFIFOCustomPatternScreen.tsx` | FIFO custom roster builder | P0       |
| `src/utils/migrationUtils.ts`                                       | Data migration utilities   | P1       |
| `assets/onboarding/icons/fifo-*.png`                                | FIFO pattern icons         | P1       |

---

## ⚠️ PART 7: POTENTIAL GOTCHAS & EDGE CASES

### 1. Shift Time Handling in FIFO

**Issue:** FIFO rosters might have different day/night shift times
**Solution:** Allow separate time configuration for day shifts vs night shifts in FIFO swing rosters

### 2. Travel Days

**Issue:** FIFO workers have travel days (fly-in/fly-out)
**Solution:**

- Add optional `flyInDay` and `flyOutDay` to `fifoConfig`
- Display differently in calendar (e.g., ✈️ icon)
- Don't count as work days for statistics

### 3. Roster Changes Mid-Cycle

**Issue:** What if user changes roster type after setup?
**Solution:**

- Show warning dialog before allowing change
- Clear incompatible configuration
- Recalculate all shift days

### 4. Multi-Crew Coordination

**Issue:** FIFO sites often have multiple crews with staggered rosters
**Solution:**

- Use existing `phaseOffset` mechanism
- Document how to configure Team A, B, C offsets

### 5. Long Cycles & Performance

**Issue:** 28-day or 42-day cycles = large date ranges
**Solution:**

- Optimize `calculateShiftDay` for O(1) performance
- Cache calculated shift days
- Use virtualization for calendar

### 6. Backward Compatibility

**Issue:** Existing users with rotating rosters
**Solution:**

- Auto-migrate all existing data to `rosterType: ROTATING`
- Version AsyncStorage schema
- Test migration thoroughly

---

## 📊 PART 8: TESTING STRATEGY

### Unit Test Coverage Goals:

- **Shift Calculation:** 95%+ coverage
- **Pattern Generation:** 100% coverage
- **Type Definitions:** 100% coverage
- **UI Components:** 80%+ coverage

### Key Test Scenarios:

```typescript
// Rotating Roster Tests
✓ 5-5-5 pattern calculates correctly
✓ 4-4-4 pattern with phase offset
✓ Continental 3-shift pattern
✓ Custom rotating pattern

// FIFO Roster Tests
✓ 8/6 straight days
✓ 8/6 straight nights
✓ 14/14 with swing (week days, week nights)
✓ 21/7 pattern
✓ FIFO with travel days
✓ FIFO with custom swing pattern

// Edge Cases
✓ Date before cycle start
✓ Large phase offsets
✓ Leap year handling
✓ Cycle boundary crossing
✓ Timezone changes (if applicable)

// Migration Tests
✓ Old rotating data migrates correctly
✓ No data loss during migration
✓ Schema versioning works
```

---

## 🎯 PART 9: SUCCESS CRITERIA

### Definition of Done:

- [ ] All rotating rosters work exactly as before (no regressions)
- [ ] All 6 FIFO patterns are selectable and calculate correctly
- [ ] Custom FIFO rosters can be configured
- [ ] Calendar displays FIFO rosters correctly
- [ ] Voice assistant understands FIFO queries
- [ ] All unit tests pass (95%+ coverage)
- [ ] All integration tests pass
- [ ] Visual regression tests pass
- [ ] Manual QA sign-off on iOS
- [ ] Documentation complete
- [ ] Migration tested with real user data

---

## 📅 PART 10: IMPLEMENTATION TIMELINE

### 6-Week Sprint Plan

| Week       | Focus                    | Deliverables                    | Hours         |
| ---------- | ------------------------ | ------------------------------- | ------------- |
| **Week 1** | Data Model & Core Logic  | Types, calculations, tests      | 40h           |
| **Week 2** | Onboarding UI            | New screens, updated flows      | 40h           |
| **Week 3** | Dashboard & Calendar     | Visual updates, block display   | 40h           |
| **Week 4** | Voice Assistant & Assets | Queries, icons, polish          | 32h           |
| **Week 5** | Testing & QA             | Unit, integration, manual tests | 40h           |
| **Week 6** | Documentation & Deploy   | Docs, performance, release      | 24h           |
| **TOTAL**  |                          |                                 | **216 hours** |

### Phased Rollout (Recommended):

**Phase 1 (Weeks 1-2):** Core FIFO logic + basic onboarding

- Users can select FIFO 8/6, 14/14 (straight days/nights only)
- Basic calendar display works
- **Beta release to small group**

**Phase 2 (Weeks 3-4):** Full features + swing rosters

- Custom FIFO patterns
- Swing roster support
- Voice assistant queries
- **Beta release to wider group**

**Phase 3 (Weeks 5-6):** Polish + production

- All visual polish
- Full testing
- **Production release**

---

## 💡 PART 11: FUTURE ENHANCEMENTS (Out of Scope)

Consider for future releases:

1. **Multi-Team Roster Visualization**
   - Show Team A, B, C on same calendar
   - Crew coordination tools

2. **Roster Swap Functionality**
   - Request roster swaps with teammates
   - Approval workflows

3. **Fatigue Management**
   - Track consecutive night shifts
   - Alert on safety limits

4. **Leave Integration**
   - Annual leave planning
   - Adjust roster for leave periods

5. **Site-Specific Configurations**
   - Save presets per mine site
   - Company-wide roster templates

6. **Advanced Statistics**
   - Hours worked vs regulatory limits
   - FIFO loading calculations
   - Earnings projections

---

## 🔗 PART 12: RELEVANT RESOURCES

### Web Research Sources:

- [Navigating FIFO Rosters in Mining](https://www.mining-international.org/navigating-fifo-rosters-in-mining/)
- [Mining industry insights | Shifts, swings and rosters](https://www.mynr.com.au/shifts-swings-rosters)
- [What is the best FIFO roster?](https://globe24-7.com/news-insights/what-is-the-best-fifo-roster/)
- [Understanding Roster Types in FIFO Careers](https://www.fifoaus.com/post/understanding-roster-types-in-fifo-careers)
- [Optimization of shift cycles in South African mining](https://scielo.org.za/scielo.php?script=sci_arttext&pid=S2225-62532021000800010)

---

## ✅ PART 13: NEXT STEPS

To begin implementation:

1. **Review & Approve Plan**: Stakeholder sign-off on architecture
2. **Set Up Project Board**: Create tickets for all tasks
3. **Create Feature Branch**: `feature/dual-paradigm-roster-system`
4. **Start Week 1 Tasks**: Begin with data model changes
5. **Daily Standups**: Track progress, unblock issues

---

## 📝 SUMMARY

This plan provides a **comprehensive, production-ready implementation** for supporting both **Rotating Rosters** (current system) and **FIFO Rosters** (new requirement).

**Key Points:**

- ✅ Zero breaking changes to existing functionality
- ✅ Clean architectural separation of concerns
- ✅ Backward compatible with existing data
- ✅ Fully tested (200+ test cases)
- ✅ Well-documented
- ✅ Phased rollout strategy
- ✅ 6-week timeline (~216 hours)

**The implementation will enable your mining app to serve:**

- 🌍 African miners (rotating rosters) - **Already working**
- 🇦🇺 Australian miners (FIFO rosters) - **New support**
- 🇨🇦 Canadian miners (FIFO rosters) - **New support**
- 🌐 Global mining operations - **Both paradigms**

---

**Document Version:** 1.0
**Last Updated:** February 26, 2026
**Author:** Claude Sonnet 4.5
**Status:** Ready for Implementation
