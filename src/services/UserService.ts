/**
 * User Service
 *
 * Manages user profiles, shift cycles, preferences, and statistics.
 * Extends FirebaseService for type-safe Firestore operations.
 */

import { Unsubscribe } from 'firebase/firestore';
import { FirebaseService } from './firebase/FirebaseService';
import { asyncStorageService } from './AsyncStorageService';
import { networkService } from '@/services/NetworkService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { UserProfile as BaseUserProfile, ShiftCycle, NotificationSettings } from '@/types';
import {
  userProfileSchema,
  shiftCycleSchema,
  notificationSettingsSchema,
} from '@/types/validation';
import { DEFAULT_SMART_REMINDER_SETTINGS, type SmartReminderSettings } from '@/types/reminders';
import { NetworkError, ValidationError } from '@/utils/errorUtils';
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

interface PendingUserMutation {
  userId: string;
  type: 'upsert' | 'delete';
  profile?: UserProfile;
  queuedAt: string;
}

/**
 * UserService class
 */
export class UserService extends FirebaseService {
  private readonly USERS_COLLECTION = 'users';
  private syncChain: Promise<void> = Promise.resolve();
  private unsubscribePendingSync: (() => void) | null = null;

  constructor() {
    super();

    this.unsubscribePendingSync = networkService.subscribe((snapshot) => {
      if (snapshot.status === 'online') {
        void this.syncPendingUsers();
      }
    });
  }

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

    const normalizedProfile = validationResult.data as UserProfile;

    try {
      await this.commitProfileMutation(
        userId,
        normalizedProfile,
        async () => {
          await this.create(this.USERS_COLLECTION, normalizedProfile, userId);
        },
        'create'
      );
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
      const localUser = await this.getCachedUser(userId);
      const hasPendingMutation = await this.hasPendingMutation(userId);

      if (hasPendingMutation) {
        if (networkService.getSnapshot().status === 'online') {
          void this.syncPendingUsers(userId);
        }
        logger.debug('User retrieved', {
          userId,
          found: localUser !== null,
          source: 'local-pending',
        });
        return localUser;
      }

      const user = await this.read<UserProfile>(this.USERS_COLLECTION, userId);
      if (user) {
        await this.cacheUser(user);
      } else if (localUser) {
        await this.removeCachedUser(userId);
      }
      logger.debug('User retrieved', { userId, found: user !== null });
      return user;
    } catch (error) {
      const localUser = await this.getCachedUser(userId);
      if (localUser) {
        logger.warn('UserService: failed to read remote user, serving local cache', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        return localUser;
      }
      logger.error('Failed to get user', error as Error, { userId });
      if (this.isRetryableSyncError(error)) {
        logger.warn('UserService: remote user unavailable, treating profile as missing', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }

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
      const currentProfile = await this.resolveUserForMutation(userId);
      const nextProfile = this.validateUserProfile({
        ...currentProfile,
        ...updates,
        id: userId,
        createdAt: currentProfile.createdAt,
        updatedAt: new Date().toISOString(),
      });

      await this.commitProfileMutation(
        userId,
        nextProfile,
        () => this.syncPatchOrCreate(userId, nextProfile, updates),
        'update'
      );
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
      await this.commitDeleteMutation(userId, () => this.delete(this.USERS_COLLECTION, userId));
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
      const currentProfile = await this.resolveUserForMutation(userId);
      const nextProfile = this.validateUserProfile({
        ...currentProfile,
        shiftCycle: cycle,
        updatedAt: new Date().toISOString(),
      });

      await this.commitProfileMutation(
        userId,
        nextProfile,
        () => this.syncPatchOrCreate(userId, nextProfile, { shiftCycle: cycle }),
        'save_shift_cycle'
      );
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
      const user = await this.getUser(userId);
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

      const currentProfile = await this.resolveUserForMutation(userId);
      const nextProfile = this.validateUserProfile({
        ...currentProfile,
        shiftCycle: updatedCycle,
        updatedAt: new Date().toISOString(),
      });

      await this.commitProfileMutation(
        userId,
        nextProfile,
        () =>
          this.syncPatchOrCreate(userId, nextProfile, {
            shiftCycle: updatedCycle,
          }),
        'update_shift_cycle'
      );
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
    const normalizedPrefs = this.normalizePreferences(prefs);

    // Validate notification settings
    const validationResult = notificationSettingsSchema.safeParse(normalizedPrefs.notifications);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid preferences: ${validationResult.error.message}`,
        'INVALID_PREFERENCES'
      );
    }

    try {
      const currentProfile = await this.resolveUserForMutation(userId);
      const nextProfile = this.validateUserProfile({
        ...currentProfile,
        preferences: normalizedPrefs,
        updatedAt: new Date().toISOString(),
      });

      await this.commitProfileMutation(
        userId,
        nextProfile,
        () => this.syncPatchOrCreate(userId, nextProfile, { preferences: normalizedPrefs }),
        'save_preferences'
      );
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
      const user = await this.getUser(userId);

      // Return defaults if no preferences found
      if (!user || !user.preferences) {
        logger.debug('Preferences not found, returning defaults', { userId });
        return this.getDefaultPreferences();
      }

      return this.normalizePreferences(user.preferences as UserPreferences);
    } catch (error) {
      logger.error('Failed to get preferences', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Read only the stored smart-reminder settings from the user document.
   *
   * Unlike getPreferences(), this does not normalize defaults, which lets
   * callers distinguish "not configured remotely yet" from "configured".
   */
  async getStoredSmartReminderSettings(userId: string): Promise<SmartReminderSettings | null> {
    try {
      const user = await this.getUser(userId);
      const storedSettings =
        user?.preferences?.notifications?.smartReminders ??
        user?.notificationSettings?.smartReminders;

      if (!storedSettings) {
        return null;
      }

      return {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        ...storedSettings,
      };
    } catch (error) {
      logger.error('Failed to get stored smart reminder settings', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
    const normalizedSettings = this.normalizeNotificationSettings(settings);

    // Validate notification settings
    const validationResult = notificationSettingsSchema.safeParse(normalizedSettings);
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
        notifications: normalizedSettings,
      };

      const currentProfile = await this.resolveUserForMutation(userId);
      const nextProfile = this.validateUserProfile({
        ...currentProfile,
        preferences: updatedPrefs,
        updatedAt: new Date().toISOString(),
      });

      await this.commitProfileMutation(
        userId,
        nextProfile,
        () =>
          this.syncPatchOrCreate(userId, nextProfile, {
            preferences: updatedPrefs,
          }),
        'update_notification_settings'
      );
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

    let isSubscribed = true;

    void this.getCachedUser(userId).then((cached) => {
      if (isSubscribed && cached) {
        callback(cached);
      }
    });

    const unsubscribe = this.subscribe<UserProfile>(this.USERS_COLLECTION, userId, (user) => {
      void (async () => {
        const hasPendingMutation = await this.hasPendingMutation(userId);
        if (hasPendingMutation) {
          return;
        }

        if (user) {
          await this.cacheUser(user);
        } else {
          await this.removeCachedUser(userId);
        }

        if (isSubscribed) {
          callback(user);
        }
      })();
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
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

  cleanup(): void {
    this.unsubscribePendingSync?.();
    this.unsubscribePendingSync = null;
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      notifications: this.getDefaultNotificationSettings(),
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getDefaultNotificationSettings(): NotificationSettings {
    return {
      shift24HoursBefore: true,
      shift4HoursBefore: true,
      holidayAlerts: true,
      patternChangeAlerts: true,
      soundEnabled: true,
      vibrationEnabled: true,
      smartReminders: DEFAULT_SMART_REMINDER_SETTINGS,
    };
  }

  private normalizeNotificationSettings(settings: NotificationSettings): NotificationSettings {
    return {
      ...this.getDefaultNotificationSettings(),
      ...settings,
      smartReminders: {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        ...(settings.smartReminders ?? {}),
      },
    };
  }

  private normalizePreferences(prefs: UserPreferences): UserPreferences {
    return {
      ...prefs,
      notifications: this.normalizeNotificationSettings(prefs.notifications),
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

  syncPendingUsers(userId?: string): Promise<void> {
    return this.enqueueSync(async () => {
      const userIds = userId ? [userId] : await this.getPendingUserIds();

      for (const pendingUserId of userIds) {
        const mutation = await this.getPendingMutation(pendingUserId);
        if (!mutation) {
          continue;
        }

        try {
          if (mutation.type === 'delete') {
            await this.delete(this.USERS_COLLECTION, pendingUserId);
          } else if (mutation.profile) {
            await this.upsert(this.USERS_COLLECTION, pendingUserId, mutation.profile);
          } else {
            await this.clearPendingMutation(pendingUserId);
            continue;
          }

          await this.clearPendingMutation(pendingUserId);
        } catch (error) {
          if (this.isRetryableSyncError(error)) {
            logger.warn('UserService: pending user sync still deferred', {
              userId: pendingUserId,
              type: mutation.type,
              error: error instanceof Error ? error.message : String(error),
            });
            continue;
          }

          logger.error('UserService: failed to replay pending user mutation', error as Error, {
            userId: pendingUserId,
            type: mutation.type,
          });
        }
      }
    });
  }

  private async commitProfileMutation(
    userId: string,
    nextProfile: UserProfile,
    remoteSync: () => Promise<void>,
    mutationName: string
  ): Promise<void> {
    const previousLocal = await this.getCachedUser(userId);
    await this.cacheUser(nextProfile);

    try {
      await remoteSync();
      await this.clearPendingMutation(userId);
    } catch (error) {
      if (this.isRetryableSyncError(error)) {
        await this.setPendingMutation({
          userId,
          type: 'upsert',
          profile: nextProfile,
          queuedAt: new Date().toISOString(),
        });
        logger.warn('UserService: queued user mutation for later sync', {
          userId,
          mutation: mutationName,
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      await this.restoreCachedUser(userId, previousLocal);
      throw error;
    }
  }

  private async commitDeleteMutation(
    userId: string,
    remoteDelete: () => Promise<void>
  ): Promise<void> {
    const previousLocal = await this.getCachedUser(userId);
    await this.removeCachedUser(userId);

    try {
      await remoteDelete();
      await this.clearPendingMutation(userId);
    } catch (error) {
      if (this.isRetryableSyncError(error)) {
        await this.setPendingMutation({
          userId,
          type: 'delete',
          queuedAt: new Date().toISOString(),
        });
        logger.warn('UserService: queued user deletion for later sync', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      await this.restoreCachedUser(userId, previousLocal);
      throw error;
    }
  }

  private async syncPatchOrCreate(
    userId: string,
    fullProfile: UserProfile,
    patch: Partial<UserProfile>
  ): Promise<void> {
    try {
      await this.update(this.USERS_COLLECTION, userId, patch);
    } catch (error) {
      if (!this.isMissingDocumentError(error)) {
        throw error;
      }

      await this.upsert(this.USERS_COLLECTION, userId, fullProfile);
    }
  }

  private async resolveUserForMutation(userId: string): Promise<UserProfile> {
    const existing = await this.getUser(userId);
    if (existing) {
      return existing;
    }

    return this.buildPlaceholderProfile(userId);
  }

  private buildPlaceholderProfile(userId: string): UserProfile {
    const now = new Date().toISOString();
    return {
      id: userId,
      name: 'User',
      occupation: 'Unknown',
      company: 'Unknown',
      country: 'US',
      email: `pending+${userId}@ellie.local`,
      createdAt: now,
      updatedAt: now,
    };
  }

  private validateUserProfile(profile: UserProfile): UserProfile {
    const validationResult = userProfileSchema.safeParse(profile);
    if (!validationResult.success) {
      throw new ValidationError(
        `Invalid user profile: ${validationResult.error.message}`,
        'INVALID_USER_PROFILE'
      );
    }

    return validationResult.data as UserProfile;
  }

  private getUserCacheKey(userId: string): string {
    return `${STORAGE_KEYS.users.profilePrefix}${userId}`;
  }

  private getPendingMutationKey(userId: string): string {
    return `${STORAGE_KEYS.users.pendingMutationPrefix}${userId}`;
  }

  private getCachedUser(userId: string): Promise<UserProfile | null> {
    return asyncStorageService.get<UserProfile>(this.getUserCacheKey(userId));
  }

  private async cacheUser(profile: UserProfile): Promise<void> {
    await asyncStorageService.set(this.getUserCacheKey(profile.id), profile);
  }

  private async removeCachedUser(userId: string): Promise<void> {
    await asyncStorageService.remove(this.getUserCacheKey(userId));
  }

  private async restoreCachedUser(
    userId: string,
    previousLocal: UserProfile | null
  ): Promise<void> {
    if (previousLocal) {
      await this.cacheUser(previousLocal);
      return;
    }

    await this.removeCachedUser(userId);
  }

  private getPendingMutation(userId: string): Promise<PendingUserMutation | null> {
    return asyncStorageService.get<PendingUserMutation>(this.getPendingMutationKey(userId));
  }

  private async setPendingMutation(mutation: PendingUserMutation): Promise<void> {
    await asyncStorageService.set(this.getPendingMutationKey(mutation.userId), mutation);
  }

  private async clearPendingMutation(userId: string): Promise<void> {
    await asyncStorageService.remove(this.getPendingMutationKey(userId));
  }

  private async hasPendingMutation(userId: string): Promise<boolean> {
    return (await this.getPendingMutation(userId)) !== null;
  }

  private async getPendingUserIds(): Promise<string[]> {
    const keys = await asyncStorageService.getAllKeys();
    return keys
      .filter((key) => key.startsWith(STORAGE_KEYS.users.pendingMutationPrefix))
      .map((key) => key.slice(STORAGE_KEYS.users.pendingMutationPrefix.length));
  }

  private enqueueSync(task: () => Promise<void>): Promise<void> {
    const run = this.syncChain.then(task);
    this.syncChain = run.catch(() => {});
    return run;
  }

  private isRetryableSyncError(error: unknown): boolean {
    if (error instanceof NetworkError) {
      return true;
    }

    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('unavailable') ||
      message.includes('deadline-exceeded')
    );
  }

  private isMissingDocumentError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return message.includes('not found') || message.includes('firestore_not_found');
  }
}

// Export singleton instance
export const userService = new UserService();
