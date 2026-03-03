# Ellie — FIFO Calendar Visualization Enhancement

## Context

The FIFO (Fly-In Fly-Out) roster system has been implemented through Phases 1-9 (onboarding, types, calculation logic). However, the calendar currently renders FIFO days identically to rotating rosters — individual cells with "W"/"H" badges and no visual connection between days in the same block. FIFO workers think in **blocks** (e.g., "14 days on, 7 days off"), so the calendar should visually group consecutive work/rest days as connected ribbons, show block progress, and provide richer FIFO-specific information.

**Goal:** Transform the FIFO calendar into a block-aware, connected visualization with progress tracking, enhanced badges, interactive tooltips, and polished animations — all within the existing Sacred design system and Reanimated animation patterns.

---

## Phase 1: Data Layer — `fifoCalendarUtils.ts` (new file)

**File:** `src/utils/fifoCalendarUtils.ts`

Create a pure utility that pre-computes FIFO block position metadata for every day in a calendar month. This drives all visual enhancements.

```typescript
export interface FIFODayPosition {
  blockType: 'work' | 'rest';
  dayInBlock: number; // 1-based
  blockLength: number;
  isFirstDayOfBlock: boolean;
  isLastDayOfBlock: boolean;
  isFirstInRow: boolean; // block continues from previous row
  isLastInRow: boolean; // block continues to next row
  shiftType: ShiftType; // actual shift within work block
  isSwingTransitionDay: boolean;
  isFlyInDay: boolean; // first day of work block
  isFlyOutDay: boolean; // last day of work block
}
```

**Function:** `computeFIFOBlockPositions(year, month, shiftDays, shiftCycle, calendarGrid) → Record<number, FIFODayPosition>`

- Uses existing `getFIFOBlockInfo()` from `src/utils/shiftUtils.ts` per day
- Walks `calendarGrid` rows to determine `isFirstInRow` / `isLastInRow`
- Detects swing transitions by comparing consecutive work days' shift types
- Marks fly-in (first work day) and fly-out (last work day)
- Pure function, O(n) where n = days in month

---

## Phase 2: Connected Block Ribbons — `MonthlyCalendarCard.tsx`

**File:** `src/components/dashboard/MonthlyCalendarCard.tsx`

### 2A. Add `shiftCycle` prop

- Add `shiftCycle?: ShiftCycle` to `MonthlyCalendarCardProps`
- Dashboard already has `shiftCycle`, just pass it through

### 2B. Compute FIFO positions

```typescript
const fifoPositionMap = useMemo(() => {
  if (rosterType !== RosterType.FIFO || !shiftCycle) return null;
  return computeFIFOBlockPositions(year, month, shiftDays, shiftCycle, calendarGrid);
}, [rosterType, shiftCycle, year, month, shiftDays, calendarGrid]);
```

### 2C. Render connected block ribbons

For each calendar row, scan for contiguous runs of same block type and render absolutely-positioned ribbon backgrounds behind the cells:

- **Work ribbon**: `rgba(33, 150, 243, 0.18)` bg, `rgba(33, 150, 243, 0.25)` 1px border
- **Rest ribbon**: `rgba(120, 113, 108, 0.12)` bg, `rgba(120, 113, 108, 0.18)` 1px border
- **Border radius**: 8px on block-start/end edges, 0px on row-wrap edges
- Position: `left = startIndex * CELL_WIDTH + 2`, `width = runLength * CELL_WIDTH - 4`
- The `weekRow` needs `position: 'relative'` added

### 2D. Ribbon entrance animation

- Animate ribbon `width` from 0 to target using `withDelay(rowDelay + 30 * ribbonIdx, withSpring(1, { damping: 18, stiffness: 160 }))`
- Creates a left-to-right "painting" effect synced with existing row stagger

### 2E. Pass `fifoPosition` to each cell

```typescript
<ShiftCalendarDayCell
  ...existing props...
  fifoPosition={fifoPositionMap?.[day]}
/>
```

### 2F. Enhanced FIFO legend

Replace current 2-item FIFO legend with:

- Connected block preview (3 small linked rectangles per block type)
- Cycle label: "14/7 cycle" from `fifoConfig.workBlockDays/restBlockDays`

### 2G. Tooltip state management

- Add `tooltipDay: number | null` state
- Add `onLongPress` callback prop to `ShiftCalendarDayCell`
- Render `FIFODayTooltip` positioned above/below the pressed cell
- Auto-dismiss after 2500ms or on next tap

---

## Phase 3: Day Cell Enhancements — `ShiftCalendarDayCell.tsx`

**File:** `src/components/dashboard/ShiftCalendarDayCell.tsx`

### 3A. Accept `fifoPosition` prop

Add `fifoPosition?: FIFODayPosition` to `ShiftCalendarDayCellProps`

### 3B. Transparent background in FIFO mode

When `fifoPosition` is provided, set cell background to `'transparent'` so the parent ribbon shows through. Keep badge and text rendering as-is.

### 3C. Enhanced FIFO badges

Replace "W"/"H" text with shift-specific icons:

| Condition               | Badge                                   |
| ----------------------- | --------------------------------------- |
| Work block, day shift   | Sun icon (existing `DAY_SHIFT_ICON`)    |
| Work block, night shift | Moon icon (existing `NIGHT_SHIFT_ICON`) |
| Rest block              | Rest icon (existing `OFF_SHIFT_ICON`)   |

### 3D. Fly-in/fly-out indicators

Small airplane indicator at top-right of cell (14x14px circle):

- Fly-in: `Ionicons "airplane"` at 10px, pointing right
- Fly-out: `Ionicons "airplane"` rotated 180deg
- Only on first/last day of work block
- Background: `rgba(33, 150, 243, 0.2)`

### 3E. Swing transition bar

When `fifoPosition.isSwingTransitionDay` is true, render a 2px horizontal gradient bar at bottom of badge area: `LinearGradient` from day color (#2196F3) to night color (#651FFF).

### 3F. Enhanced FIFO today glow

When `isToday && fifoPosition`:

- Increase glow opacity range: 0.2 → 0.5 (vs default 0.15 → 0.35)
- Glow color follows block type: work = blue (#2196F3), rest = stone (#a8a29e)

### 3G. Long-press handler

Add `onLongPress?: (day: number) => void` prop. Use a timer-based approach within the existing `AnimatedTouchable`:

- `onLongPress` native prop (400ms default)
- Triggers haptic (Light impact) and calls parent callback

---

## Phase 4: Block Progress in Status Card — `CurrentShiftStatusCard.tsx`

**File:** `src/components/dashboard/CurrentShiftStatusCard.tsx`

### 4A. Linear progress bar

Below the subtitle ("Work Block Day 5 of 14"), add a thin horizontal progress bar:

- Track: `rgba(255,255,255,0.1)`, height 4px, borderRadius 2
- Fill: work block = `#64B5F6`, rest block = `#a8a29e`
- Animated width from 0% to target% with `withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) })`
- Percentage label on right: "36%"

### 4B. Block transition indicator

When `fifoBlockInfo.daysUntilBlockChange <= 1`:

- Show text: "Block change tomorrow!" in gold (#d97706) if 1 day left
- Show text: "Block change today!" in gold if 0 days left
- Subtle gold shimmer behind the text using existing shimmer pattern

---

## Phase 5: Tooltip Component — `FIFODayTooltip.tsx` (new file)

**File:** `src/components/dashboard/FIFODayTooltip.tsx`

Small floating tooltip rendered within `MonthlyCalendarCard`:

- Content: "Work Block Day 5/14 — Day Shift" or "Rest Block Day 3/7 — Home"
- Shows fly-in/fly-out status if applicable
- Style: `softStone` bg, 2px `sacredGold` top border, 8px borderRadius, shadow
- Animated entrance: `withSpring` scale 0.8→1, opacity 0→1
- Dismiss: after 2500ms timeout or on any other tap
- Position: calculated from cell row/column (above cell, or below if top row)
- Haptic: Light impact on show

---

## Phase 6: Dashboard Integration — `MainDashboardScreen.tsx`

**File:** `src/screens/main/MainDashboardScreen.tsx`

Pass `shiftCycle` to `MonthlyCalendarCard`:

```typescript
<MonthlyCalendarCard
  ...existing props...
  shiftCycle={shiftCycle}
/>
```

---

## Critical Files Summary

| File                                                  | Action     | Purpose                                                       |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| `src/utils/fifoCalendarUtils.ts`                      | **Create** | FIFO block position computation utility                       |
| `src/components/dashboard/FIFODayTooltip.tsx`         | **Create** | Long-press tooltip for day details                            |
| `src/components/dashboard/MonthlyCalendarCard.tsx`    | **Modify** | Add ribbons, FIFO positions, legend, tooltip state            |
| `src/components/dashboard/ShiftCalendarDayCell.tsx`   | **Modify** | FIFO badges, transparent bg, fly icons, swing bar, long-press |
| `src/components/dashboard/CurrentShiftStatusCard.tsx` | **Modify** | Progress bar, block transition indicator                      |
| `src/screens/main/MainDashboardScreen.tsx`            | **Modify** | Pass shiftCycle prop                                          |

### Existing utilities to reuse:

- `getFIFOBlockInfo()` from `src/utils/shiftUtils.ts` — block position data
- `fifoBlockColors` from `src/constants/shiftStyles.ts` — consistent FIFO colors
- `LinearGradient` from `expo-linear-gradient` — swing transition bar
- All existing 3D shift icons — reuse in FIFO badges
- Existing animation patterns (spring configs, stagger delays)

---

## Animation Specification Summary

| Animation           | Trigger            | Spec                                                                                       |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| Ribbon fill         | Month load/change  | `width` 0→target, `withDelay(rowDelay + 30*i, withSpring(1, {damping:18, stiffness:160}))` |
| Progress bar fill   | Mount + day change | `width` 0%→target%, `withTiming(target, {duration:800, easing:Easing.out(cubic)})`         |
| Tooltip appear      | Long press         | `scale` 0.8→1, `opacity` 0→1, `withSpring({damping:14, stiffness:200})`                    |
| Tooltip dismiss     | Timeout/tap        | `opacity` 1→0, `withTiming(0, {duration:200})`                                             |
| Fly-in icon         | Mount              | `translateX` -8→0, `opacity` 0→1, `withDelay(rowDelay+200, withSpring(...))`               |
| Enhanced FIFO today | isToday            | Same pulse pattern but opacity 0.2→0.5, block-colored glow                                 |

---

## Edge Cases

| Case                                  | Handling                                                       |
| ------------------------------------- | -------------------------------------------------------------- |
| Block wraps across weeks              | Ribbon ends at row edge (radius 0), new ribbon starts next row |
| Partial months (block starts mid-row) | Ribbon starts at correct column offset                         |
| Single-day blocks                     | Full border radius both sides, show fly-in only                |
| Month boundary mid-block              | `getFIFOBlockInfo` handles correctly via cycle start date      |
| Custom work sequences                 | Uses `ShiftDay.shiftType` directly for badge icon              |
| FIFO with swing pattern               | Consecutive work days compared to detect shift type transition |

---

## Verification

1. `npx tsc --noEmit` — zero type errors
2. `npx jest --no-coverage` — all existing tests pass
3. Manual verification on device/simulator:
   - Set up a FIFO roster (e.g., 14/7 with swing pattern) through onboarding
   - Calendar shows connected work (blue) and rest (stone) block ribbons
   - Ribbons wrap correctly across week boundaries
   - Day cells show shift-specific icons (sun/moon) instead of "W"/"H"
   - First/last work days show airplane indicators
   - Swing transition day shows gradient bar
   - Today cell has enhanced blue/stone glow matching block type
   - Long-press any day shows tooltip with block info
   - Status card shows progress bar with percentage
   - Block transition day shows gold indicator text
   - Month navigation replays ribbon fill animation
   - All existing rotating roster functionality unchanged
