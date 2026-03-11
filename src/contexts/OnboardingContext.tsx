/**
 * OnboardingContext
 *
 * Manages state across all premium onboarding flow screens.
 * Provides centralized data storage and updates for the 8-9 step onboarding process.
 *
 * ## Onboarding Flow (9-10 screens, 8-9 steps - depends on roster type):
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
 * 3.5. **Roster Type** (PremiumRosterTypeScreen - NEW)
 *      - Select Rotating Roster or FIFO Roster
 *      - Collects: rosterType
 *
 * 4. **Shift Pattern** (PremiumShiftPatternScreen)
 *    - Select from standard patterns (filtered by roster type) or create custom
 *    - Collects: patternType
 *    - Routes based on pattern type and roster type
 *
 * 4b-R. **Custom Pattern** (PremiumCustomPatternScreen - CONDITIONAL for Rotating)
 *       - Only shown if patternType === ShiftPattern.CUSTOM and rosterType === 'rotating'
 *       - Configure days on/off for each shift type
 *       - Collects: customPattern (daysOn, nightsOn, morningOn, afternoonOn, nightOn, daysOff)
 *
 * 4b-F. **FIFO Custom Pattern** (PremiumFIFOCustomPatternScreen - CONDITIONAL for FIFO - NEW)
 *       - Only shown if patternType === ShiftPattern.FIFO_CUSTOM and rosterType === 'fifo'
 *       - Configure work/rest blocks and work pattern
 *       - Collects: fifoConfig
 *
 * 5-R. **Phase Selector** (PremiumPhaseSelectorScreen - for Rotating)
 *      - Two-stage: Select current phase, then day within phase (if multi-day)
 *      - Collects: phaseOffset
 *
 * 5-F. **FIFO Phase Selector** (PremiumFIFOPhaseSelectorScreen - for FIFO - NEW)
 *      - Two-stage: Select work/rest block, then day within block
 *      - Collects: phaseOffset
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

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { ShiftPattern, FIFOConfig } from '@/types';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { migrateOnboardingDataToV2 } from '@/utils/migrationUtils';
import i18n from '@/i18n';

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

  /** URI of the user's profile avatar image (file:// URI in document directory) */
  avatarUri?: string;

  // Step 3: Shift System Selection (PremiumShiftSystemScreen)
  shiftSystem?: '2-shift' | '3-shift'; // Determines 2-shift (12h) vs 3-shift (8h)

  // Step 3.5: Roster Type Selection (PremiumRosterTypeScreen - NEW)
  rosterType?: 'rotating' | 'fifo'; // Determines rotating roster vs FIFO roster

  // Step 4: Shift Pattern Selection (PremiumShiftPatternScreen)
  patternType?: ShiftPattern;

  // Step 4b-R: Custom Pattern Configuration (PremiumCustomPatternScreen - only if patternType === CUSTOM and rosterType === 'rotating')
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

  // Step 4b-F: FIFO Custom Pattern Configuration (PremiumFIFOCustomPatternScreen - only if patternType === FIFO_CUSTOM and rosterType === 'fifo')
  fifoConfig?: FIFOConfig;

  // Step 5: Current Phase Selection (PremiumPhaseSelectorScreen or PremiumFIFOPhaseSelectorScreen)
  phaseOffset?: number; // Calculated from selected phase and day within phase (rotating) or block position (FIFO)

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

/**
 * Validation result from validateData()
 */
export interface ValidationResult {
  /** Whether all required fields are present and valid */
  isValid: boolean;
  /** Array of missing or invalid field names */
  missingFields: string[];
}

/**
 * OnboardingContext Interface
 *
 * Provides methods for managing onboarding data state
 */
interface OnboardingContextValue {
  /** Current onboarding data */
  data: OnboardingData;

  /** Update specific fields in onboarding data */
  updateData: (updates: Partial<OnboardingData>) => void;

  /** Replace all onboarding data at once */
  setAllData: (newData: OnboardingData) => void;

  /** Clear a specific field from onboarding data */
  clearField: (field: keyof OnboardingData) => void;

  /** Reset all onboarding data to empty state */
  resetData: () => void;

  /** Validate all required fields are present */
  validateData: () => ValidationResult;

  /** Check if all required fields are complete (quick boolean check) */
  isComplete: () => boolean;

  /** Get list of missing required fields */
  getMissingFields: () => string[];
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export interface OnboardingProviderProps {
  children: ReactNode;
}

function normalizeStartDate(data: OnboardingData): OnboardingData {
  const rawStartDate = data.startDate as Date | string | undefined;
  if (!rawStartDate) {
    return data;
  }

  const parsed = typeof rawStartDate === 'string' ? new Date(rawStartDate) : rawStartDate;
  if (Number.isNaN(parsed.getTime())) {
    return { ...data, startDate: undefined };
  }

  return { ...data, startDate: parsed };
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>({});

  /**
   * Restore onboarding data from AsyncStorage on mount
   */
  useEffect(() => {
    const restoreData = async () => {
      try {
        // asyncStorageService.get() auto-deserializes JSON, so no JSON.parse needed
        const savedData = await asyncStorageService.get<OnboardingData>('onboarding:data');
        if (savedData && typeof savedData === 'object') {
          const migrated = migrateOnboardingDataToV2(savedData);
          setData(normalizeStartDate(migrated));
        }
      } catch (error) {
        console.warn('Failed to restore onboarding data:', error);
        // Don't block - just start with empty data
      }
    };

    restoreData();
  }, []);

  /**
   * Update specific fields in onboarding data (merges with existing)
   * Also auto-saves to AsyncStorage to prevent data loss
   */
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prevData) => {
      const newData = normalizeStartDate({ ...prevData, ...updates });

      // Auto-save to AsyncStorage (non-blocking, don't await)
      // Pass object directly - asyncStorageService handles serialization
      asyncStorageService.set('onboarding:data', newData).catch((error) => {
        console.warn('Failed to auto-save onboarding data:', error);
        // Don't throw - auto-save failure shouldn't block UX
      });

      return newData;
    });
  }, []);

  /**
   * Replace all onboarding data at once
   * Also saves to AsyncStorage
   */
  const setAllData = useCallback((newData: OnboardingData) => {
    const normalizedData = normalizeStartDate(newData);
    setData(normalizedData);

    // Auto-save to AsyncStorage (non-blocking)
    asyncStorageService.set('onboarding:data', normalizedData).catch((error) => {
      console.warn('Failed to save onboarding data:', error);
    });
  }, []);

  /**
   * Clear a specific field from onboarding data
   */
  const clearField = (field: keyof OnboardingData) => {
    setData((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  /**
   * Reset all onboarding data to empty state
   * Also clears AsyncStorage
   */
  const resetData = useCallback(() => {
    setData({});

    // Clear AsyncStorage (non-blocking)
    asyncStorageService.set('onboarding:data', {}).catch((error) => {
      console.warn('Failed to clear onboarding data:', error);
    });
  }, []);

  /**
   * Validate all required onboarding fields
   *
   * @returns Object with isValid boolean and array of missing field names
   */
  const validateData = (): ValidationResult => {
    const missingFields: string[] = [];
    const localizedField = (key: string, fallback: string): string =>
      String(
        i18n.t(`completion.validation.fields.${key}`, {
          ns: 'onboarding',
          defaultValue: fallback,
        })
      );

    // Step 2: Profile data (required)
    if (!data.name || data.name.trim().length === 0) {
      missingFields.push(localizedField('name', 'Name'));
    }
    if (!data.occupation || data.occupation.trim().length === 0) {
      missingFields.push(localizedField('occupation', 'Occupation'));
    }
    if (!data.company || data.company.trim().length === 0) {
      missingFields.push(localizedField('company', 'Company'));
    }
    if (!data.country || data.country.trim().length === 0) {
      missingFields.push(localizedField('country', 'Country'));
    }

    // Step 3: Shift system (required)
    if (!data.shiftSystem) {
      missingFields.push(localizedField('shiftSystem', 'Shift System'));
    }

    // Step 3.5: Roster type (optional - defaults to rotating if not set)
    // No validation needed - backward compatible

    // Step 4: Pattern type (required)
    if (!data.patternType) {
      missingFields.push(localizedField('shiftPattern', 'Shift Pattern'));
    }

    // Step 4b: Custom pattern validation (depends on roster type)
    if (data.rosterType === 'fifo') {
      // FIFO custom pattern
      if (data.patternType === ShiftPattern.FIFO_CUSTOM && !data.fifoConfig) {
        missingFields.push(localizedField('fifoConfiguration', 'FIFO Configuration'));
      }
    } else {
      // Rotating custom pattern (default behavior)
      if (data.patternType === ShiftPattern.CUSTOM && !data.customPattern) {
        missingFields.push(
          localizedField('customPatternConfiguration', 'Custom Pattern Configuration')
        );
      }
    }

    // Step 5: Phase offset (required)
    if (data.phaseOffset === undefined) {
      missingFields.push(localizedField('phaseOffset', 'Phase Offset'));
    }

    // Step 6: Start date (required)
    if (!data.startDate) {
      missingFields.push(localizedField('startDate', 'Start Date'));
    }

    // Step 7: Shift times (required - either new or legacy structure)
    const hasNewStructure = data.shiftTimes && Object.keys(data.shiftTimes).length > 0;
    const hasLegacyStructure = data.shiftStartTime && data.shiftEndTime;

    if (!hasNewStructure && !hasLegacyStructure) {
      missingFields.push(localizedField('shiftTimes', 'Shift Times'));
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  /**
   * Quick boolean check if all required fields are complete
   *
   * @returns True if all required fields are present
   */
  const isComplete = (): boolean => {
    return validateData().isValid;
  };

  /**
   * Get list of missing required fields
   *
   * @returns Array of missing field names
   */
  const getMissingFields = (): string[] => {
    return validateData().missingFields;
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        setAllData,
        clearField,
        resetData,
        validateData,
        isComplete,
        getMissingFields,
      }}
    >
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
