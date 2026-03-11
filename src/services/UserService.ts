/**
 * User Service
 *
 * Manages user profiles, shift cycles, preferences, and statistics.
 * Extends FirebaseService for type-safe Firestore operations.
 */

import { Unsubscribe } from 'firebase/firestore';
import { FirebaseService } from './firebase/FirebaseService';
import { UserProfile as BaseUserProfile, ShiftCycle, NotificationSettings } from '@/types';
import {
  userProfileSchema,
  shiftCycleSchema,
  notificationSettingsSchema,
} from '@/types/validation';
import { ValidationError } from '@/utils/errorUtils';
import { logger } from '@/utils/logger';
import { getShiftStatistics, buildShiftCycle } from '@/utils/shiftUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';

/**
 * User preferences type
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  language: string;
  timezone: string;
}

/**
 * User statistics type
 */
export interface UserStats {
  totalShifts: number;
  totalDayShifts: number;
  totalNightShifts: number;
  totalDaysOff: number;
  totalWorkingHours: number;
  lastUpdated: string;
}

/**
 * Extended user profile with preferences
 */
export interface UserProfile extends BaseUserProfile {
  preferences?: UserPreferences;
}

/**
 * UserService class
 */
export class UserService extends FirebaseService {
  private readonly USERS_COLLECTION = 'users';

  /**
   * Create a new user profile
   */
  async createUser(userId: string, profile: UserProfile): Promise<void> {
    // Validate profile data
    const validationResult = userProfileSchema.safeParse(profile);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid user profile: ${validationResult.error.message}`,
        'INVALID_USER_PROFILE'
      );
    }

    try {
      await this.create(this.USERS_COLLECTION, profile, userId);
      logger.info('User created', { userId });
    } catch (error) {
      logger.error('Failed to create user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUser(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.read<UserProfile>(this.USERS_COLLECTION, userId);
      logger.debug('User retrieved', { userId, found: user !== null });
      return user;
    } catch (error) {
      logger.error('Failed to get user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    // Validate updates if provided
    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No updates provided', 'EMPTY_UPDATES');
    }

    try {
      await this.update(this.USERS_COLLECTION, userId, updates);
      logger.info('User updated', { userId, fields: Object.keys(updates) });
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Delete user profile
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.delete(this.USERS_COLLECTION, userId);
      logger.info('User deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Save user's shift cycle
   */
  async saveShiftCycle(userId: string, cycle: ShiftCycle): Promise<void> {
    // Validate shift cycle
    const validationResult = shiftCycleSchema.safeParse(cycle);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid shift cycle: ${validationResult.error.message}`,
        'INVALID_SHIFT_CYCLE'
      );
    }

    try {
      await this.update(this.USERS_COLLECTION, userId, { shiftCycle: cycle });
      logger.info('Shift cycle saved', { userId, pattern: cycle.patternType });
    } catch (error) {
      logger.error('Failed to save shift cycle', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get user's shift cycle
   */
  async getShiftCycle(userId: string): Promise<ShiftCycle | null> {
    try {
      const user = await this.read<UserProfile>(this.USERS_COLLECTION, userId);
      if (!user || !user.shiftCycle) {
        logger.debug('Shift cycle not found', { userId });
        return null;
      }
      return user.shiftCycle;
    } catch (error) {
      logger.error('Failed to get shift cycle', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update user's shift cycle
   */
  async updateShiftCycle(userId: string, updates: Partial<ShiftCycle>): Promise<void> {
    try {
      // Get current cycle
      const currentCycle = await this.getShiftCycle(userId);
      if (!currentCycle) {
        throw new ValidationError('Shift cycle not found', 'CYCLE_NOT_FOUND');
      }

      // Merge updates
      const updatedCycle = { ...currentCycle, ...updates };

      // Validate merged cycle
      const validationResult = shiftCycleSchema.safeParse(updatedCycle);
      if (!validationResult.success) {
        throw new ValidationError(
          `Invalid shift cycle updates: ${validationResult.error.message}`,
          'INVALID_CYCLE_UPDATES'
        );
      }

      await this.update(this.USERS_COLLECTION, userId, {
        shiftCycle: updatedCycle,
      });
      logger.info('Shift cycle updated', {
        userId,
        fields: Object.keys(updates),
      });
    } catch (error) {
      logger.error('Failed to update shift cycle', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Save user preferences
   */
  async savePreferences(userId: string, prefs: UserPreferences): Promise<void> {
    // Validate notification settings
    const validationResult = notificationSettingsSchema.safeParse(prefs.notifications);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid preferences: ${validationResult.error.message}`,
        'INVALID_PREFERENCES'
      );
    }

    try {
      await this.update(this.USERS_COLLECTION, userId, { preferences: prefs });
      logger.info('Preferences saved', { userId });
    } catch (error) {
      logger.error('Failed to save preferences', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get user preferences (returns defaults if not found)
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    try {
      const user = await this.read<UserProfile>(this.USERS_COLLECTION, userId);

      // Return defaults if no preferences found
      if (!user || !user.preferences) {
        logger.debug('Preferences not found, returning defaults', { userId });
        return this.getDefaultPreferences();
      }

      return user.preferences as UserPreferences;
    } catch (error) {
      logger.error('Failed to get preferences', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
    // Validate notification settings
    const validationResult = notificationSettingsSchema.safeParse(settings);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid notification settings: ${validationResult.error.message}`,
        'INVALID_NOTIFICATION_SETTINGS'
      );
    }

    try {
      // Get current preferences
      const currentPrefs = await this.getPreferences(userId);

      // Update notifications
      const updatedPrefs: UserPreferences = {
        ...currentPrefs,
        notifications: settings,
      };

      await this.update(this.USERS_COLLECTION, userId, {
        preferences: updatedPrefs,
      });
      logger.info('Notification settings updated', { userId });
    } catch (error) {
      logger.error('Failed to update notification settings', error as Error, {
        userId,
      });
      throw error;
    }
  }

  /**
   * Get total shifts in date range
   */
  async getTotalShifts(userId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const shiftCycle = await this.getShiftCycle(userId);
      if (!shiftCycle) {
        logger.debug('No shift cycle found for stats', { userId });
        return 0;
      }

      const stats = getShiftStatistics(startDate, endDate, shiftCycle);
      const totalShifts = stats.dayShifts + stats.nightShifts;

      logger.debug('Total shifts calculated', {
        userId,
        totalShifts,
      });

      return totalShifts;
    } catch (error) {
      logger.error('Failed to calculate total shifts', error as Error, {
        userId,
      });
      throw error;
    }
  }

  /**
   * Get total working hours in date range
   */
  async getWorkingHours(userId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const shiftCycle = await this.getShiftCycle(userId);
      if (!shiftCycle) {
        logger.debug('No shift cycle found for hours calculation', { userId });
        return 0;
      }

      const stats = getShiftStatistics(startDate, endDate, shiftCycle);
      // Calculate hours: assuming 12 hours per shift (day or night)
      const totalHours = (stats.dayShifts + stats.nightShifts) * 12;

      logger.debug('Working hours calculated', {
        userId,
        totalHours,
      });

      return totalHours;
    } catch (error) {
      logger.error('Failed to calculate working hours', error as Error, {
        userId,
      });
      throw error;
    }
  }

  /**
   * Subscribe to user changes
   */
  subscribeToUserChanges(
    userId: string,
    callback: (user: UserProfile | null) => void
  ): Unsubscribe {
    logger.info('Subscribing to user changes', { userId });
    return this.subscribe<UserProfile>(this.USERS_COLLECTION, userId, callback);
  }

  /**
   * Create or sync a profile from onboarding data.
   *
   * This is safe to call multiple times:
   * - existing user: update changed onboarding fields
   * - missing user: create with onboarding values and placeholder email
   */
  async createOrSyncUserProfile(userId: string, onboarding: OnboardingData): Promise<void> {
    const now = new Date().toISOString();
    const normalizedCountry = this.normalizeCountryCode(onboarding.country);

    const profileUpdates: Partial<UserProfile> = {
      id: userId,
      name: this.normalizeRequiredText(onboarding.name, 'User'),
      occupation: this.normalizeRequiredText(onboarding.occupation, 'Unknown'),
      company: this.normalizeRequiredText(onboarding.company, 'Unknown'),
      country: normalizedCountry,
      updatedAt: now,
    };

    const cycle = buildShiftCycle(onboarding);
    if (cycle) {
      profileUpdates.shiftCycle = cycle;
    }

    try {
      const existing = await this.getUser(userId);

      if (existing) {
        await this.updateUser(userId, profileUpdates);
        logger.info('UserService: synced existing user profile from onboarding', { userId });
        return;
      }

      const createPayload: UserProfile = {
        id: userId,
        name: profileUpdates.name ?? 'User',
        occupation: profileUpdates.occupation ?? 'Unknown',
        company: profileUpdates.company ?? 'Unknown',
        country: profileUpdates.country ?? 'US',
        // Replaced after auth-sync in PremiumCompletionScreen.
        email: `pending+${userId}@ellie.local`,
        createdAt: now,
        updatedAt: now,
        shiftCycle: profileUpdates.shiftCycle,
      };

      await this.createUser(userId, createPayload);
      logger.info('UserService: created new user profile from onboarding', { userId });
    } catch (error) {
      logger.error('UserService: failed to sync user profile', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      notifications: {
        shift24HoursBefore: true,
        shift4HoursBefore: true,
        holidayAlerts: true,
        patternChangeAlerts: true,
        soundEnabled: true,
        vibrationEnabled: true,
      },
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private normalizeRequiredText(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : fallback;
  }

  private normalizeCountryCode(value: string | undefined): string {
    const normalized = value?.trim().toUpperCase() ?? '';
    return /^[A-Z]{2}$/.test(normalized) ? normalized : 'US';
  }
}

// Export singleton instance
export const userService = new UserService();
