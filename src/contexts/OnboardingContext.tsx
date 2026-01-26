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
  customPattern?: {
    daysOn: number;
    nightsOn: number;
    daysOff: number;
  };

  // Future steps...
  startDate?: Date;
  shiftTimes?: {
    dayStart: string;
    dayEnd: string;
    nightStart: string;
    nightEnd: string;
  };
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
