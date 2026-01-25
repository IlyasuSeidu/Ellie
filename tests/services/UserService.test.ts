/**
 * UserService Tests
 *
 * Comprehensive tests for user management service
 */

import { UserService, UserProfile, UserPreferences } from '@/services/UserService';
import { ShiftCycle, NotificationSettings, ShiftPattern } from '@/types';
import { ValidationError } from '@/utils/errorUtils';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/services/firebase/FirebaseService');
jest.mock('@/utils/logger');
jest.mock('@/utils/shiftUtils', () => ({
  getShiftStatistics: jest.fn(() => ({
    dayShifts: 10,
    nightShifts: 10,
    daysOff: 9,
    totalDays: 29,
  })),
}));

describe('UserService', () => {
  let service: UserService;

  const mockUserId = 'user-123';
  const mockShiftCycle: ShiftCycle = {
    patternType: ShiftPattern.STANDARD_3_3_3,
    daysOn: 3,
    nightsOn: 3,
    daysOff: 3,
    startDate: '2024-01-01',
    phaseOffset: 0,
  };

  const mockUserProfile: UserProfile = {
    id: mockUserId,
    name: 'Test User',
    occupation: 'Software Engineer',
    company: 'Test Company',
    country: 'US',
    email: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    shiftCycle: mockShiftCycle,
  };

  const mockNotificationSettings: NotificationSettings = {
    shift24HoursBefore: true,
    shift4HoursBefore: true,
    holidayAlerts: true,
    patternChangeAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService();
  });

  describe('User Profile Operations', () => {
    describe('createUser', () => {
      it('should create a user with valid data', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createSpy = // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jest.spyOn(service as any, 'create').mockResolvedValue('user-123');

        await service.createUser(mockUserId, mockUserProfile);

        expect(createSpy).toHaveBeenCalledWith('users', mockUserProfile, mockUserId);
        expect(logger.info).toHaveBeenCalledWith('User created', { userId: mockUserId });
      });

      it('should throw ValidationError with invalid data', async () => {
        const invalidProfile = { ...mockUserProfile, name: '' };

        await expect(service.createUser(mockUserId, invalidProfile)).rejects.toThrow(
          ValidationError
        );
      });

      it('should log and rethrow errors', async () => {
        const error = new Error('Create failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'create').mockRejectedValue(error);

        await expect(service.createUser(mockUserId, mockUserProfile)).rejects.toThrow(
          'Create failed'
        );
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to create user',
          error,
          expect.objectContaining({ userId: mockUserId })
        );
      });
    });

    describe('getUser', () => {
      it('should get an existing user', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(mockUserProfile);

        const result = await service.getUser(mockUserId);

        expect(result).toEqual(mockUserProfile);
        expect(logger.debug).toHaveBeenCalledWith(
          'User retrieved',
          expect.objectContaining({ userId: mockUserId, found: true })
        );
      });

      it('should return null for non-existent user', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(null);

        const result = await service.getUser('non-existent');

        expect(result).toBeNull();
        expect(logger.debug).toHaveBeenCalledWith(
          'User retrieved',
          expect.objectContaining({ found: false })
        );
      });

      it('should handle and log errors', async () => {
        const error = new Error('Read failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockRejectedValue(error);

        await expect(service.getUser(mockUserId)).rejects.toThrow('Read failed');
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to get user',
          error,
          expect.objectContaining({ userId: mockUserId })
        );
      });
    });

    describe('updateUser', () => {
      it('should update user profile', async () => {
        const updates = { name: 'Updated Name' };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockResolvedValue(undefined);

        await service.updateUser(mockUserId, updates);

        expect(service['update']).toHaveBeenCalledWith('users', mockUserId, updates);
        expect(logger.info).toHaveBeenCalledWith(
          'User updated',
          expect.objectContaining({ userId: mockUserId, fields: ['name'] })
        );
      });

      it('should throw ValidationError for empty updates', async () => {
        await expect(service.updateUser(mockUserId, {})).rejects.toThrow(ValidationError);
        await expect(service.updateUser(mockUserId, {})).rejects.toThrow('No updates provided');
      });

      it('should handle and log errors', async () => {
        const error = new Error('Update failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockRejectedValue(error);

        await expect(service.updateUser(mockUserId, { name: 'Test' })).rejects.toThrow(
          'Update failed'
        );
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to update user',
          error,
          expect.objectContaining({ userId: mockUserId })
        );
      });
    });

    describe('deleteUser', () => {
      it('should delete user', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'delete').mockResolvedValue(undefined);

        await service.deleteUser(mockUserId);

        expect(service['delete']).toHaveBeenCalledWith('users', mockUserId);
        expect(logger.info).toHaveBeenCalledWith(
          'User deleted',
          expect.objectContaining({ userId: mockUserId })
        );
      });

      it('should handle and log errors', async () => {
        const error = new Error('Delete failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'delete').mockRejectedValue(error);

        await expect(service.deleteUser(mockUserId)).rejects.toThrow('Delete failed');
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to delete user',
          error,
          expect.objectContaining({ userId: mockUserId })
        );
      });
    });
  });

  describe('Shift Cycle Operations', () => {
    describe('saveShiftCycle', () => {
      it('should save valid shift cycle', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockResolvedValue(undefined);

        await service.saveShiftCycle(mockUserId, mockShiftCycle);

        expect(service['update']).toHaveBeenCalledWith('users', mockUserId, {
          shiftCycle: mockShiftCycle,
        });
        expect(logger.info).toHaveBeenCalledWith(
          'Shift cycle saved',
          expect.objectContaining({ userId: mockUserId, pattern: mockShiftCycle.patternType })
        );
      });

      it('should throw ValidationError for invalid shift cycle', async () => {
        const invalidCycle = { ...mockShiftCycle, daysOn: -1 };

        await expect(service.saveShiftCycle(mockUserId, invalidCycle)).rejects.toThrow(
          ValidationError
        );
      });

      it('should handle and log errors', async () => {
        const error = new Error('Save failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockRejectedValue(error);

        await expect(service.saveShiftCycle(mockUserId, mockShiftCycle)).rejects.toThrow(
          'Save failed'
        );
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to save shift cycle',
          error,
          expect.objectContaining({ userId: mockUserId })
        );
      });
    });

    describe('getShiftCycle', () => {
      it('should get existing shift cycle', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(mockUserProfile);

        const result = await service.getShiftCycle(mockUserId);

        expect(result).toEqual(mockUserProfile.shiftCycle);
      });

      it('should return null if user not found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(null);

        const result = await service.getShiftCycle(mockUserId);

        expect(result).toBeNull();
        expect(logger.debug).toHaveBeenCalledWith(
          'Shift cycle not found',
          expect.objectContaining({ userId: mockUserId })
        );
      });

      it('should return null if user has no shift cycle', async () => {
        const userWithoutCycle = { ...mockUserProfile, shiftCycle: undefined };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(userWithoutCycle);

        const result = await service.getShiftCycle(mockUserId);

        expect(result).toBeNull();
      });
    });

    describe('updateShiftCycle', () => {
      it('should update shift cycle', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(mockUserProfile);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockResolvedValue(undefined);

        const updates = { daysOn: 5 };
        await service.updateShiftCycle(mockUserId, updates);

        expect(service['update']).toHaveBeenCalledWith('users', mockUserId, {
          shiftCycle: { ...mockShiftCycle, ...updates },
        });
        expect(logger.info).toHaveBeenCalledWith(
          'Shift cycle updated',
          expect.objectContaining({ userId: mockUserId, fields: ['daysOn'] })
        );
      });

      it('should throw ValidationError if cycle not found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(null);

        await expect(service.updateShiftCycle(mockUserId, { daysOn: 5 })).rejects.toThrow(
          ValidationError
        );
        await expect(service.updateShiftCycle(mockUserId, { daysOn: 5 })).rejects.toThrow(
          'Shift cycle not found'
        );
      });

      it('should throw ValidationError for invalid updates', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(mockUserProfile);

        const invalidUpdates = { daysOn: -1 };
        await expect(service.updateShiftCycle(mockUserId, invalidUpdates)).rejects.toThrow(
          ValidationError
        );
      });
    });
  });

  describe('Preferences', () => {
    describe('savePreferences', () => {
      it('should save valid preferences', async () => {
        const prefs: UserPreferences = {
          theme: 'dark',
          notifications: mockNotificationSettings,
          language: 'en',
          timezone: 'UTC',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockResolvedValue(undefined);

        await service.savePreferences(mockUserId, prefs);

        expect(service['update']).toHaveBeenCalledWith('users', mockUserId, {
          preferences: prefs,
        });
        expect(logger.info).toHaveBeenCalledWith(
          'Preferences saved',
          expect.objectContaining({ userId: mockUserId })
        );
      });

      it('should throw ValidationError for invalid notifications', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidPrefs: any = {
          theme: 'dark',
          notifications: { ...mockNotificationSettings, shift24HoursBefore: 'invalid' },
          language: 'en',
          timezone: 'UTC',
        };

        await expect(service.savePreferences(mockUserId, invalidPrefs)).rejects.toThrow(
          ValidationError
        );
      });
    });

    describe('getPreferences', () => {
      it('should get existing preferences', async () => {
        const userWithPrefs = {
          ...mockUserProfile,
          preferences: {
            theme: 'dark' as const,
            notifications: mockNotificationSettings,
            language: 'en',
            timezone: 'UTC',
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(userWithPrefs);

        const result = await service.getPreferences(mockUserId);

        expect(result).toEqual(userWithPrefs.preferences);
      });

      it('should return defaults if user not found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(null);

        const result = await service.getPreferences(mockUserId);

        expect(result).toEqual({
          theme: 'auto',
          notifications: expect.objectContaining({
            shift24HoursBefore: true,
            shift4HoursBefore: true,
          }),
          language: 'en',
          timezone: expect.any(String),
        });
        expect(logger.debug).toHaveBeenCalledWith(
          'Preferences not found, returning defaults',
          expect.objectContaining({ userId: mockUserId })
        );
      });

      it('should return defaults if user has no preferences', async () => {
        const userWithoutPrefs = { ...mockUserProfile, preferences: undefined };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(userWithoutPrefs);

        const result = await service.getPreferences(mockUserId);

        expect(result.theme).toBe('auto');
        expect(result.notifications.shift24HoursBefore).toBe(true);
      });
    });

    describe('updateNotificationSettings', () => {
      it('should update notification settings', async () => {
        const userWithPrefs = {
          ...mockUserProfile,
          preferences: {
            theme: 'dark' as const,
            notifications: mockNotificationSettings,
            language: 'en',
            timezone: 'UTC',
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(userWithPrefs);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'update').mockResolvedValue(undefined);

        const newSettings: NotificationSettings = {
          ...mockNotificationSettings,
          holidayAlerts: false,
        };

        await service.updateNotificationSettings(mockUserId, newSettings);

        expect(service['update']).toHaveBeenCalledWith('users', mockUserId, {
          preferences: {
            ...userWithPrefs.preferences,
            notifications: newSettings,
          },
        });
        expect(logger.info).toHaveBeenCalledWith(
          'Notification settings updated',
          expect.objectContaining({ userId: mockUserId })
        );
      });

      it('should throw ValidationError for invalid settings', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidSettings: any = {
          ...mockNotificationSettings,
          shift24HoursBefore: 'invalid',
        };

        await expect(
          service.updateNotificationSettings(mockUserId, invalidSettings)
        ).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('Stats Calculations', () => {
    describe('getTotalShifts', () => {
      it('should calculate total shifts in date range', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(mockUserProfile);

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const result = await service.getTotalShifts(mockUserId, startDate, endDate);

        expect(result).toBe(20); // From mocked getShiftStatistics
        expect(logger.debug).toHaveBeenCalledWith(
          'Total shifts calculated',
          expect.objectContaining({ userId: mockUserId, totalShifts: 20 })
        );
      });

      it('should return 0 if no shift cycle found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(null);

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const result = await service.getTotalShifts(mockUserId, startDate, endDate);

        expect(result).toBe(0);
        expect(logger.debug).toHaveBeenCalledWith(
          'No shift cycle found for stats',
          expect.objectContaining({ userId: mockUserId })
        );
      });
    });

    describe('getWorkingHours', () => {
      it('should calculate working hours in date range', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(mockUserProfile);

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const result = await service.getWorkingHours(mockUserId, startDate, endDate);

        expect(result).toBe(240); // From mocked getShiftStatistics
        expect(logger.debug).toHaveBeenCalledWith(
          'Working hours calculated',
          expect.objectContaining({ userId: mockUserId, totalHours: 240 })
        );
      });

      it('should return 0 if no shift cycle found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service as any, 'read').mockResolvedValue(null);

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        const result = await service.getWorkingHours(mockUserId, startDate, endDate);

        expect(result).toBe(0);
      });
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to user changes', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, 'subscribe').mockReturnValue(unsubscribe);

      const result = service.subscribeToUserChanges(mockUserId, callback);

      expect(service['subscribe']).toHaveBeenCalledWith('users', mockUserId, callback);
      expect(logger.info).toHaveBeenCalledWith(
        'Subscribing to user changes',
        expect.objectContaining({ userId: mockUserId })
      );
      expect(result).toBe(unsubscribe);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network unavailable');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, 'read').mockRejectedValue(networkError);

      await expect(service.getUser(mockUserId)).rejects.toThrow('Network unavailable');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle permission denied errors', async () => {
      const permissionError = new Error('Permission denied');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, 'create').mockRejectedValue(permissionError);

      await expect(service.createUser(mockUserId, mockUserProfile)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should validate data before operations', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalidData: any = { name: '', createdAt: 'invalid', updatedAt: 'invalid' };

      await expect(service.createUser(mockUserId, invalidData)).rejects.toThrow(ValidationError);
    });
  });
});
