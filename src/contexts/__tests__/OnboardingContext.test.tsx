/**
 * OnboardingContext Tests
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { OnboardingProvider, useOnboarding, OnboardingData } from '../OnboardingContext';
import { ShiftPattern } from '@/types';
import { asyncStorageService } from '@/services/AsyncStorageService';

// Mock AsyncStorageService
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('OnboardingContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <OnboardingProvider>{children}</OnboardingProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful AsyncStorage operations by default
    (asyncStorageService.get as jest.Mock).mockResolvedValue(null);
    (asyncStorageService.set as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Provider', () => {
    it('should provide initial empty data', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.data).toEqual({});
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useOnboarding());
      }).toThrow('useOnboarding must be used within OnboardingProvider');

      console.error = originalError;
    });
  });

  describe('updateData', () => {
    it('should update data with new values', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'John Doe',
          occupation: 'Mining Engineer',
        });
      });

      expect(result.current.data.name).toBe('John Doe');
      expect(result.current.data.occupation).toBe('Mining Engineer');
    });

    it('should merge new data with existing data', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'John Doe',
        });
      });

      act(() => {
        result.current.updateData({
          occupation: 'Mining Engineer',
        });
      });

      expect(result.current.data.name).toBe('John Doe');
      expect(result.current.data.occupation).toBe('Mining Engineer');
    });

    it('should overwrite existing values', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'John Doe',
        });
      });

      act(() => {
        result.current.updateData({
          name: 'Jane Smith',
        });
      });

      expect(result.current.data.name).toBe('Jane Smith');
    });

    it('should handle complex objects', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      const country = 'Australia';

      act(() => {
        result.current.updateData({
          country,
        });
      });

      expect(result.current.data.country).toEqual(country);
    });

    it('should handle multiple updates in sequence', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({ name: 'John' });
        result.current.updateData({ occupation: 'Engineer' });
        result.current.updateData({ company: 'ABC Mining' });
      });

      expect(result.current.data).toEqual({
        name: 'John',
        occupation: 'Engineer',
        company: 'ABC Mining',
      });
    });
  });

  describe('resetData', () => {
    it('should reset data to empty object', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'John Doe',
          occupation: 'Mining Engineer',
          company: 'ABC Mining',
        });
      });

      expect(result.current.data).toEqual({
        name: 'John Doe',
        occupation: 'Mining Engineer',
        company: 'ABC Mining',
      });

      act(() => {
        result.current.resetData();
      });

      expect(result.current.data).toEqual({});
    });

    it('should allow new data after reset', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({ name: 'John Doe' });
      });

      act(() => {
        result.current.resetData();
      });

      act(() => {
        result.current.updateData({ name: 'Jane Smith' });
      });

      expect(result.current.data).toEqual({ name: 'Jane Smith' });
    });
  });

  describe('Full Onboarding Flow', () => {
    it('should handle complete onboarding data', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      const fullData: OnboardingData = {
        name: 'John Doe',
        occupation: 'Mining Engineer',
        company: 'ABC Mining Co.',
        country: 'Australia',
        patternType: ShiftPattern.STANDARD_5_5_5,
        startDate: new Date('2024-01-15'),
        shiftStartTime: '07:00',
        shiftEndTime: '19:00',
        shiftDuration: 12,
        shiftType: 'day',
      };

      act(() => {
        result.current.updateData(fullData);
      });

      expect(result.current.data).toEqual(fullData);
    });

    it('should handle partial data updates throughout flow', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Step 2: Introduction
      act(() => {
        result.current.updateData({
          name: 'John Doe',
          occupation: 'Mining Engineer',
          company: 'ABC Mining',
          country: 'Australia',
        });
      });

      expect(result.current.data.name).toBe('John Doe');
      expect(result.current.data.country).toBe('Australia');

      // Step 3: Shift Pattern
      act(() => {
        result.current.updateData({
          patternType: ShiftPattern.STANDARD_5_5_5,
        });
      });

      expect(result.current.data.patternType).toBe(ShiftPattern.STANDARD_5_5_5);
      expect(result.current.data.name).toBe('John Doe'); // Previous data preserved

      // Step 4: Custom Pattern (if custom selected)
      act(() => {
        result.current.updateData({
          customPattern: {
            daysOn: 5,
            nightsOn: 5,
            daysOff: 5,
          },
        });
      });

      expect(result.current.data.customPattern).toEqual({
        daysOn: 5,
        nightsOn: 5,
        daysOff: 5,
      });
      expect(result.current.data.patternType).toBe(ShiftPattern.STANDARD_5_5_5);
      expect(result.current.data.name).toBe('John Doe');
    });
  });

  describe('Type Safety', () => {
    it('should accept valid OnboardingData types', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          patternType: ShiftPattern.STANDARD_3_3_3,
        });
      });

      expect(result.current.data.patternType).toBe(ShiftPattern.STANDARD_3_3_3);
    });

    it('should handle optional fields', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'John',
          // company is optional
        });
      });

      expect(result.current.data.name).toBe('John');
      expect(result.current.data.company).toBeUndefined();
    });
  });

  describe('AsyncStorage Auto-Save', () => {
    it('should auto-save data when updateData is called', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'John Doe',
          occupation: 'Mining Engineer',
        });
      });

      // Wait for async auto-save to complete
      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith(
          'onboarding:data',
          expect.stringContaining('John Doe')
        );
      });
    });

    it('should save complete data including all fields', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      const testData = {
        name: 'John Doe',
        occupation: 'Mining Engineer',
        company: 'ABC Mining',
        country: 'Australia',
        patternType: ShiftPattern.STANDARD_4_4_4,
      };

      act(() => {
        result.current.updateData(testData);
      });

      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith(
          'onboarding:data',
          JSON.stringify(testData)
        );
      });
    });

    it('should not throw error if auto-save fails', () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Should not throw
      act(() => {
        result.current.updateData({ name: 'John Doe' });
      });

      expect(result.current.data.name).toBe('John Doe');
    });

    it('should auto-save on multiple updates', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({ name: 'John' });
      });

      act(() => {
        result.current.updateData({ occupation: 'Engineer' });
      });

      // Should be called twice
      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('AsyncStorage Restore', () => {
    it('should restore data from AsyncStorage on mount', async () => {
      const savedData: OnboardingData = {
        name: 'John Doe',
        occupation: 'Mining Engineer',
        company: 'ABC Mining',
        country: 'Australia',
        patternType: ShiftPattern.STANDARD_4_4_4,
      };

      (asyncStorageService.get as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(savedData);
      });
    });

    it('should start with empty data if no saved data exists', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual({});
      });
    });

    it('should handle restore errors gracefully', async () => {
      (asyncStorageService.get as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual({});
      });
    });

    it('should handle invalid JSON in saved data', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue('invalid json{]');

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual({});
      });
    });

    it('should restore complex data structures', async () => {
      const savedData = {
        name: 'John Doe',
        customPattern: {
          daysOn: 4,
          nightsOn: 4,
          daysOff: 4,
        },
        shiftTimes: {
          dayShift: {
            startTime: '06:00',
            endTime: '18:00',
            duration: 12,
          },
          nightShift: {
            startTime: '18:00',
            endTime: '06:00',
            duration: 12,
          },
        },
        startDate: new Date('2024-01-15').toISOString(), // Stored as string
      };

      (asyncStorageService.get as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data.customPattern).toEqual(savedData.customPattern);
        expect(result.current.data.shiftTimes).toEqual(savedData.shiftTimes);
      });
    });
  });
});
