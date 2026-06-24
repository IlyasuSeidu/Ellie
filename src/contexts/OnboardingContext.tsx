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
 * 2. **Setup Intro** (PremiumSetupIntroScreen)
 *    - Explains the simple chat setup path
 *
 * 3. **Guided Shift Chat** (PremiumGuidedShiftChatScreen)
 *    - User describes their repeating pattern in plain English
 *    - Parser creates a draft schedule for confirmation
 *
 * 4. **Shift Times** (PremiumShiftTimesScreen)
 *    - User confirms plain AM/PM shift start and finish times
 *
 * 5. **Known Date And Shift** (PremiumKnownShiftDateScreen, PremiumKnownShiftTypeScreen)
 *    - User anchors the pattern with one date and the shift they had
 *
 * 6. **Schedule Preview** (PremiumSchedulePreviewScreen)
 *    - Shows the next calculated shifts
 *    - Collects: universalSchedule after the user confirms it looks right
 *
 * 7. **Setup Summary And Reminders**
 *    - Saves the confirmed schedule and optional reminders
 *
 * 8. **Aha Moment And Completion**
 *    - Lets the user try Ryvro by voice, then enters the app
 *    - Validates all collected data
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
 *     updateData({ name: 'Sam' });
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
import type { UniversalShiftSchedule } from '@/types';
import i18n from '@/i18n';
import {
  clearPersistedOnboardingData,
  loadPersistedOnboardingData,
  persistOnboardingData,
} from '@/utils/onboardingPersistence';

export interface OnboardingData {
  /** Optional personalization signal kept for older saved onboarding data */
  painPoint?: 'cycle_lost' | 'wrong_alarm' | 'days_off' | 'family' | 'mental_math';

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

  /** Full universal shift schedule created by the Universal Builder */
  universalSchedule?: UniversalShiftSchedule;
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

    // Profile fields are optional. Ryvro only needs the schedule to answer by voice.

    if (
      !data.universalSchedule?.name ||
      !data.universalSchedule.anchorDate ||
      !data.universalSchedule.sequence?.length ||
      !data.universalSchedule.shiftDefinitions?.length
    ) {
      missingFields.push(localizedField('universalSchedule', 'Shift Schedule'));
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
