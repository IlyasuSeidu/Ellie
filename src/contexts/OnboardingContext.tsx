/**
 * OnboardingContext
 *
 * Manages state across the onboarding flow screens
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Country } from '@/components/onboarding/premium/PremiumCountrySelector';
import { ShiftPattern } from '@/types';

export interface OnboardingData {
  // Step 2: Introduction
  name?: string;
  occupation?: string;
  company?: string;
  country?: Country;

  // Step 3: Shift Pattern
  patternType?: ShiftPattern;

  // Step 4 (new): Shift System Selection
  shiftSystem?: '2-shift' | '3-shift'; // Determines 2-shift (12h) vs 3-shift (8h)

  // Step 5: Custom Pattern (supports both systems)
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

  // Step 6: Start Date & Phase
  startDate?: Date;
  phaseOffset?: number; // Calculated from selected phase

  // Step 7: Shift Times
  shiftStartTime?: string; // HH:MM format (24-hour)
  shiftEndTime?: string; // HH:MM format (24-hour)
  shiftDuration?: 8 | 12; // Hours (locked based on shift system)
  shiftType?: 'day' | 'night' | 'morning' | 'afternoon'; // Auto-detected from start time
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
