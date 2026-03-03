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

  describe('validation and utility methods', () => {
    it('setAllData replaces data and persists snapshot', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const snapshot: OnboardingData = {
        name: 'Taylor',
        occupation: 'Operator',
        company: 'Mine Co',
        country: 'AU',
        shiftSystem: '2-shift',
        patternType: ShiftPattern.STANDARD_4_4_4,
        phaseOffset: 1,
        startDate: new Date('2026-02-01'),
        shiftTimes: {
          dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
          nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 },
        },
      };

      act(() => {
        result.current.setAllData(snapshot);
      });

      expect(result.current.data).toEqual(snapshot);
      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith('onboarding:data', snapshot);
      });
    });

    it('clearField removes one field without clearing others', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: 'Alex',
          occupation: 'Engineer',
          company: 'Site A',
        });
      });

      act(() => {
        result.current.clearField('occupation');
      });

      expect(result.current.data.name).toBe('Alex');
      expect(result.current.data.company).toBe('Site A');
      expect(result.current.data.occupation).toBeUndefined();
    });

    it('validateData reports missing required fields for blank values', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.updateData({
          name: '   ',
          occupation: '',
          company: '',
          country: '',
          shiftSystem: undefined,
          patternType: undefined,
          phaseOffset: undefined,
          startDate: undefined,
        });
      });

      const validation = result.current.validateData();
      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toEqual(
        expect.arrayContaining([
          'Name',
          'Occupation',
          'Company',
          'Country',
          'Shift System',
          'Shift Pattern',
          'Phase Offset',
          'Start Date',
          'Shift Times',
        ])
      );
      expect(result.current.isComplete()).toBe(false);
      expect(result.current.getMissingFields()).toEqual(validation.missingFields);
    });

    it('requires rotating custom pattern config when CUSTOM is selected', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setAllData({
          name: 'A',
          occupation: 'B',
          company: 'C',
          country: 'D',
          shiftSystem: '2-shift',
          rosterType: 'rotating',
          patternType: ShiftPattern.CUSTOM,
          phaseOffset: 0,
          startDate: new Date('2026-02-01'),
          shiftStartTime: '07:00',
          shiftEndTime: '19:00',
        });
      });

      const validation = result.current.validateData();
      expect(validation.missingFields).toContain('Custom Pattern Configuration');
    });

    it('requires fifoConfig when FIFO_CUSTOM is selected for FIFO roster', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setAllData({
          name: 'A',
          occupation: 'B',
          company: 'C',
          country: 'D',
          shiftSystem: '2-shift',
          rosterType: 'fifo',
          patternType: ShiftPattern.FIFO_CUSTOM,
          phaseOffset: 0,
          startDate: new Date('2026-02-01'),
          shiftStartTime: '07:00',
          shiftEndTime: '19:00',
        });
      });

      const validation = result.current.validateData();
      expect(validation.missingFields).toContain('FIFO Configuration');
    });

    it('accepts legacy shift time fields as valid shift times', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setAllData({
          name: 'Valid',
          occupation: 'Role',
          company: 'Org',
          country: 'US',
          shiftSystem: '2-shift',
          rosterType: 'rotating',
          patternType: ShiftPattern.STANDARD_4_4_4,
          phaseOffset: 1,
          startDate: new Date('2026-02-01'),
          shiftStartTime: '07:00',
          shiftEndTime: '19:00',
        });
      });

      const validation = result.current.validateData();
      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
      expect(result.current.isComplete()).toBe(true);
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

      // Wait for async auto-save to complete (object passed directly, not JSON string)
      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith(
          'onboarding:data',
          expect.objectContaining({ name: 'John Doe' })
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
        // updateData passes object directly to asyncStorageService.set
        expect(asyncStorageService.set).toHaveBeenCalledWith(
          'onboarding:data',
          expect.objectContaining(testData)
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

      // asyncStorageService.get() auto-deserializes, returns object directly
      (asyncStorageService.get as jest.Mock).mockResolvedValue(savedData);

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual({
          ...savedData,
          rosterType: 'rotating',
        });
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

    it('should handle non-object saved data gracefully', async () => {
      // If get() returns a non-object (e.g., string), restoreData ignores it
      (asyncStorageService.get as jest.Mock).mockResolvedValue('not-an-object');

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

      // asyncStorageService.get() auto-deserializes, returns object directly
      (asyncStorageService.get as jest.Mock).mockResolvedValue(savedData);

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.data.customPattern).toEqual(savedData.customPattern);
        expect(result.current.data.shiftTimes).toEqual(savedData.shiftTimes);
      });
    });
  });
});
