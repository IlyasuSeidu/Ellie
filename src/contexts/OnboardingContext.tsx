/**
 * OnboardingContext
 *
 * Manages state across all premium onboarding flow screens.
 * Provides centralized data storage and updates for the 8-step onboarding process.
 *
 * ## Onboarding Flow (9 screens, 8 steps):
 *
 * 1. **Welcome** (PremiumWelcomeScreen)
 *    - Auto-advances after 3 seconds
 *    - No data collected
 *
 * 2. **Introduction** (PremiumIntroductionScreen)
 *    - Chat-based user profile collection
 *    - Collects: name, occupation, company, country
 *
 * 3. **Shift System** (PremiumShiftSystemScreen)
 *    - Select 2-shift (12h) or 3-shift (8h) system
 *    - Collects: shiftSystem
 *
 * 4. **Shift Pattern** (PremiumShiftPatternScreen)
 *    - Select from standard patterns or create custom
 *    - Collects: patternType
 *    - Routes to CustomPattern if CUSTOM selected, else PhaseSelector
 *
 * 4b. **Custom Pattern** (PremiumCustomPatternScreen - CONDITIONAL)
 *     - Only shown if patternType === ShiftPattern.CUSTOM
 *     - Configure days on/off for each shift type
 *     - Collects: customPattern (daysOn, nightsOn, morningOn, afternoonOn, nightOn, daysOff)
 *
 * 5. **Phase Selector** (PremiumPhaseSelectorScreen)
 *    - Two-stage: Select current phase, then day within phase (if multi-day)
 *    - Collects: phaseOffset
 *
 * 6. **Start Date** (PremiumStartDateScreen)
 *    - Calendar-based date selection
 *    - Collects: startDate
 *
 * 7. **Shift Time Input** (PremiumShiftTimeInputScreen)
 *    - Multi-stage: Collect start/end times for each shift type
 *    - 2-shift: day shift + night shift times
 *    - 3-shift: morning + afternoon + night shift times
 *    - Collects: shiftTimes (new structure) + legacy fields for compatibility
 *
 * 8. **Completion** (PremiumCompletionScreen)
 *    - Validates all collected data
 *    - Displays summary
 *    - Saves to AsyncStorage
 *
 * ## Usage:
 *
 * ```typescript
 * import { useOnboarding } from '@/contexts/OnboardingContext';
 *
 * const MyScreen = () => {
 *   const { data, updateData, resetData } = useOnboarding();
 *
 *   const handleContinue = () => {
 *     updateData({ shiftSystem: '2-shift' });
 *     navigation.navigate('NextScreen');
 *   };
 * };
 * ```
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ShiftPattern } from '@/types';

export interface OnboardingData {
  // Step 2: Introduction (PremiumIntroductionScreen)
  /** User's full name */
  name?: string;

  /** User's occupation/job title - Currently for display only, may be used for backend analytics */
  occupation?: string;

  /** User's company/employer name */
  company?: string;

  /** User's country - Currently for display only, may be used for backend analytics or locale settings */
  country?: string;

  // Step 3: Shift System Selection (PremiumShiftSystemScreen)
  shiftSystem?: '2-shift' | '3-shift'; // Determines 2-shift (12h) vs 3-shift (8h)

  // Step 4: Shift Pattern Selection (PremiumShiftPatternScreen)
  patternType?: ShiftPattern;

  // Step 4b: Custom Pattern Configuration (PremiumCustomPatternScreen - only if patternType === CUSTOM)
  customPattern?: {
    // For 2-shift system
    daysOn: number; // Day shifts
    nightsOn: number; // Night shifts

    // For 3-shift system (optional)
    morningOn?: number; // Morning shifts (6 AM - 2 PM)
    afternoonOn?: number; // Afternoon shifts (2 PM - 10 PM)
    nightOn?: number; // Night shifts (10 PM - 6 AM)

    // Common
    daysOff: number; // Days off (both systems)
  };

  // Step 5: Current Phase Selection (PremiumPhaseSelectorScreen)
  phaseOffset?: number; // Calculated from selected phase and day within phase

  // Step 6: Start Date Selection (PremiumStartDateScreen)
  startDate?: Date;

  // Step 7: Shift Time Configuration (PremiumShiftTimeInputScreen - NEW: supports multiple shift types per cycle)
  shiftTimes?: {
    // For 2-shift systems (12-hour)
    dayShift?: {
      startTime: string; // HH:MM (24-hour)
      endTime: string; // HH:MM (24-hour)
      duration: 8 | 12;
    };
    nightShift?: {
      startTime: string; // HH:MM (24-hour)
      endTime: string; // HH:MM (24-hour)
      duration: 8 | 12;
    };

    // For 3-shift systems (8-hour)
    morningShift?: {
      startTime: string; // HH:MM (24-hour)
      endTime: string; // HH:MM (24-hour)
      duration: 8 | 12;
    };
    afternoonShift?: {
      startTime: string; // HH:MM (24-hour)
      endTime: string; // HH:MM (24-hour)
      duration: 8 | 12;
    };
    nightShift3?: {
      // Separate from 2-shift night
      startTime: string; // HH:MM (24-hour)
      endTime: string; // HH:MM (24-hour)
      duration: 8 | 12;
    };
  };

  // Legacy fields (DEPRECATED - kept for backwards compatibility only)
  /** @deprecated Use shiftTimes.dayShift or shiftTimes.nightShift instead */
  shiftStartTime?: string; // HH:MM format (24-hour)
  /** @deprecated Use shiftTimes.dayShift.endTime or shiftTimes.nightShift.endTime instead */
  shiftEndTime?: string; // HH:MM format (24-hour)
  /** @deprecated Use shiftTimes.dayShift.duration or shiftTimes.nightShift.duration instead */
  shiftDuration?: 8 | 12; // Hours (locked based on shift system)
  /** @deprecated Use shiftTimes keys instead */
  shiftType?: 'day' | 'night' | 'morning' | 'afternoon'; // Auto-detected from start time
  /** @deprecated Use shiftTimes instead */
  isCustomShiftTime?: boolean; // True if user selected custom time
}

interface OnboardingContextValue {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  resetData: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>({});

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData({});
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, resetData }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
