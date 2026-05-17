/**
 * OnboardingContext
 *
 * Manages state across all premium onboarding flow screens.
 * Provides centralized data storage and updates for the premium onboarding process.
 *
 * ## Onboarding Flow (core path):
 *
 * 1. **Welcome** (PremiumWelcomeScreen)
 *    - No data collected
 *
 * 2. **Pain Hook** (PremiumPainHookScreen)
 *    - User identifies the biggest current roster pain point
 *    - Collects: painPoint
 *
 * 3. **Introduction** (PremiumIntroductionScreen)
 *    - Chat-based user profile collection
 *    - Collects: name, occupation, company, country
 *
 * 4. **Shift System** (PremiumShiftSystemScreen)
 *    - Select 2-shift (12h) or 3-shift (8h) system
 *    - Collects: shiftSystem
 *
 * 5. **Roster Type** (PremiumRosterTypeScreen)
 *    - Select Rotating Roster or FIFO Roster
 *    - Collects: rosterType
 *
 * 6. **Shift Pattern** (PremiumShiftPatternScreen)
 *    - Select from standard patterns (filtered by roster type) or create custom
 *    - Collects: patternType
 *    - Routes based on pattern type and roster type
 *
 * 6b-R. **Custom Pattern** (PremiumCustomPatternScreen - CONDITIONAL for Rotating)
 *       - Only shown if patternType === ShiftPattern.CUSTOM and rosterType === 'rotating'
 *       - Configure days on/off for each shift type
 *       - Collects: customPattern (daysOn, nightsOn, morningOn, afternoonOn, nightOn, daysOff)
 *
 * 6b-F. **FIFO Custom Pattern** (PremiumFIFOCustomPatternScreen - CONDITIONAL for FIFO)
 *       - Only shown if patternType === ShiftPattern.FIFO_CUSTOM and rosterType === 'fifo'
 *       - Configure work/rest blocks and work pattern
 *       - Collects: fifoConfig
 *
 * 7-R. **Phase Selector** (PremiumPhaseSelectorScreen - for Rotating)
 *      - Two-stage: Select current phase, then day within phase (if multi-day)
 *      - Collects: phaseOffset
 *
 * 7-F. **FIFO Phase Selector** (PremiumFIFOPhaseSelectorScreen - for FIFO)
 *      - Two-stage: Select work/rest block, then day within block
 *      - Collects: phaseOffset
 *
 * 8. **Start Date** (PremiumStartDateScreen)
 *    - Calendar-based date selection
 *    - Collects: startDate
 *
 * 9. **Shift Time Input** (PremiumShiftTimeInputScreen)
 *    - Multi-stage: Collect start/end times for each shift type
 *    - 2-shift: day shift + night shift times
 *    - 3-shift: morning + afternoon + night shift times
 *    - Collects: shiftTimes (new structure) + legacy fields for compatibility
 *
 * 10. **Aha Moment** (PremiumAhaMomentScreen)
 *    - Shows calendar payoff and value framing
 *
 * 11. **Completion** (PremiumCompletionScreen)
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
  useRef,
  ReactNode,
} from 'react';
import { ShiftPattern, FIFOConfig } from '@/types';
import i18n from '@/i18n';
import {
  clearPersistedOnboardingData,
  loadPersistedOnboardingData,
  persistOnboardingData,
} from '@/utils/onboardingPersistence';

export interface OnboardingData {
  // Step 2: Pain Hook (PremiumPainHookScreen)
  /** User's self-identified pain point — used for AhaMoment personalisation and analytics segmentation */
  painPoint?: 'cycle_lost' | 'wrong_alarm' | 'days_off' | 'family' | 'mental_math';

  // Step 3: Introduction (PremiumIntroductionScreen)
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

  // Step 4: Shift System Selection (PremiumShiftSystemScreen)
  shiftSystem?: '2-shift' | '3-shift'; // Determines 2-shift (12h) vs 3-shift (8h)

  // Step 5: Roster Type Selection (PremiumRosterTypeScreen)
  rosterType?: 'rotating' | 'fifo'; // Determines rotating roster vs FIFO roster

  // Step 6: Shift Pattern Selection (PremiumShiftPatternScreen)
  patternType?: ShiftPattern;

  // Step 6b-R: Custom Pattern Configuration (PremiumCustomPatternScreen - only if patternType === CUSTOM and rosterType === 'rotating')
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

  // Step 6b-F: FIFO Custom Pattern Configuration (PremiumFIFOCustomPatternScreen - only if patternType === FIFO_CUSTOM and rosterType === 'fifo')
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
  /** True once initial local restore has completed */
  hydrated: boolean;
  /** True when the latest local persistence attempt failed and the UI may be showing unsaved in-memory state */
  hasPendingPersistenceError: boolean;

  /** Update specific fields in onboarding data */
  updateData: (updates: Partial<OnboardingData>) => void;

  /** Update specific fields and wait for persistence to complete */
  updateDataAsync: (updates: Partial<OnboardingData>) => Promise<void>;

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

  /** Clear the observable persistence error flag after it has been surfaced to the user */
  clearPersistenceError: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>({});
  const [hydrated, setHydrated] = useState(false);
  const [hasPendingPersistenceError, setHasPendingPersistenceError] = useState(false);
  const dataRef = useRef<OnboardingData>({});

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const persistDataSnapshot = useCallback(async (newData: OnboardingData): Promise<void> => {
    try {
      await persistOnboardingData(newData);
      setHasPendingPersistenceError(false);
    } catch (error) {
      setHasPendingPersistenceError(true);
      throw error;
    }
  }, []);

  /**
   * Restore onboarding data from AsyncStorage on mount
   */
  useEffect(() => {
    const restoreData = async () => {
      try {
        const savedData = await loadPersistedOnboardingData();
        if (savedData) {
          dataRef.current = savedData as OnboardingData;
          setData(savedData as OnboardingData);
        }
      } catch (error) {
        console.warn('Failed to restore onboarding data:', error);
        setHasPendingPersistenceError(true);
        // Don't block - just start with empty data
      } finally {
        setHydrated(true);
      }
    };

    restoreData();
  }, []);

  /**
   * Update specific fields in onboarding data (merges with existing)
   * Also auto-saves to AsyncStorage to prevent data loss
   */
  const updateData = useCallback(
    (updates: Partial<OnboardingData>) => {
      const newData = { ...dataRef.current, ...updates };
      dataRef.current = newData;
      setData(newData);

      // Auto-save to AsyncStorage (non-blocking, don't await)
      void persistDataSnapshot(newData).catch((error) => {
        console.warn('Failed to auto-save onboarding data:', error);
        // Don't throw - auto-save failure shouldn't block UX
      });
    },
    [persistDataSnapshot]
  );

  const updateDataAsync = useCallback(
    async (updates: Partial<OnboardingData>) => {
      const newData = { ...dataRef.current, ...updates };
      dataRef.current = newData;
      setData(newData);
      await persistDataSnapshot(newData);
    },
    [persistDataSnapshot]
  );

  /**
   * Replace all onboarding data at once
   * Also saves to AsyncStorage
   */
  const setAllData = useCallback(
    (newData: OnboardingData) => {
      dataRef.current = newData;
      setData(newData);

      // Auto-save to AsyncStorage (non-blocking)
      void persistDataSnapshot(newData).catch((error) => {
        console.warn('Failed to save onboarding data:', error);
      });
    },
    [persistDataSnapshot]
  );

  /**
   * Clear a specific field from onboarding data
   */
  const clearField = (field: keyof OnboardingData) => {
    const updated = { ...dataRef.current };
    delete updated[field];
    dataRef.current = updated;
    setData(updated);
  };

  /**
   * Reset all onboarding data to empty state
   * Also clears AsyncStorage
   */
  const resetData = useCallback(() => {
    dataRef.current = {};
    setData({});

    // Clear AsyncStorage (non-blocking)
    void clearPersistedOnboardingData()
      .then(() => {
        setHasPendingPersistenceError(false);
      })
      .catch((error) => {
        console.warn('Failed to clear onboarding data:', error);
        setHasPendingPersistenceError(true);
      });
  }, []);

  const clearPersistenceError = useCallback(() => {
    setHasPendingPersistenceError(false);
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

    // Profile fields are optional in the compressed onboarding flow.
    // Users can complete them later from Profile/Introduction.

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
      // All FIFO patterns require a fifoConfig with at minimum workBlockDays and restBlockDays.
      // Preset patterns (FIFO_8_6 etc.) have these written by FIFOPhaseSelector; custom patterns
      // have them written by FIFOCustomPatternScreen.
      if (!data.fifoConfig) {
        missingFields.push(localizedField('fifoConfiguration', 'FIFO Configuration'));
      } else {
        if (!data.fifoConfig.workBlockDays) {
          missingFields.push(localizedField('fifoWorkBlockDays', 'Work Block Days'));
        }
        if (!data.fifoConfig.restBlockDays) {
          missingFields.push(localizedField('fifoRestBlockDays', 'Rest Block Days'));
        }
        if (!data.fifoConfig.workBlockPattern) {
          missingFields.push(localizedField('fifoWorkPattern', 'Work Pattern'));
        }
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
        hydrated,
        hasPendingPersistenceError,
        updateData,
        updateDataAsync,
        setAllData,
        clearField,
        resetData,
        validateData,
        isComplete,
        getMissingFields,
        clearPersistenceError,
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

/** Returns the onboarding context data when available, or undefined when called outside OnboardingProvider (e.g. from Settings). */
export const useOnboardingOptional = (): OnboardingContextValue | undefined =>
  useContext(OnboardingContext);
