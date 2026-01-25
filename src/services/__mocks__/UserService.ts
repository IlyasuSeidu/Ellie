/**
 * Mock UserService for Testing
 */

import { Unsubscribe } from 'firebase/firestore';
import { ShiftCycle, NotificationSettings } from '@/types';
import { UserProfile, UserPreferences } from '../UserService';

export class MockUserService {
  private users: Map<string, UserProfile> = new Map();
  private subscriptions: Map<string, (user: UserProfile | null) => void> = new Map();
  public shouldFailNextOperation = false;
  public failureError: Error | null = null;

  /**
   * Reset mock state
   */
  reset(): void {
    this.users.clear();
    this.subscriptions.clear();
    this.shouldFailNextOperation = false;
    this.failureError = null;
  }

  /**
   * Set mock user data
   */
  setMockUser(userId: string, profile: UserProfile): void {
    this.users.set(userId, profile);
  }

  /**
   * Simulate failure
   */
  simulateFailure(error?: Error): void {
    this.shouldFailNextOperation = true;
    this.failureError = error || new Error('Mock failure');
  }

  private checkForFailure(): void {
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw this.failureError || new Error('Mock failure');
    }
  }

  async createUser(userId: string, profile: UserProfile): Promise<void> {
    await Promise.resolve();
    this.checkForFailure();
    this.users.set(userId, {
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async getUser(userId: string): Promise<UserProfile | null> {
    await Promise.resolve();
    this.checkForFailure();
    return this.users.get(userId) || null;
  }

  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await Promise.resolve();
    this.checkForFailure();
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    this.users.set(userId, {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await Promise.resolve();
    this.checkForFailure();
    if (!this.users.has(userId)) {
      throw new Error('User not found');
    }
    this.users.delete(userId);
  }

  async saveShiftCycle(userId: string, cycle: ShiftCycle): Promise<void> {
    await Promise.resolve();
    this.checkForFailure();
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    this.users.set(userId, { ...user, shiftCycle: cycle });
  }

  async getShiftCycle(userId: string): Promise<ShiftCycle | null> {
    await Promise.resolve();
    this.checkForFailure();
    const user = this.users.get(userId);
    return user?.shiftCycle || null;
  }

  async updateShiftCycle(
    userId: string,
    updates: Partial<ShiftCycle>
  ): Promise<void> {
    await Promise.resolve();
    this.checkForFailure();
    const user = this.users.get(userId);
    if (!user || !user.shiftCycle) {
      throw new Error('Shift cycle not found');
    }
    this.users.set(userId, {
      ...user,
      shiftCycle: { ...user.shiftCycle, ...updates },
    });
  }

  async savePreferences(userId: string, prefs: UserPreferences): Promise<void> {
    await Promise.resolve();
    this.checkForFailure();
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    this.users.set(userId, { ...user, preferences: prefs });
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    await Promise.resolve();
    this.checkForFailure();
    const user = this.users.get(userId);
    return (
      user?.preferences ||
      ({
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
        timezone: 'UTC',
      } as UserPreferences)
    );
  }

  async updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<void> {
    this.checkForFailure();
    await Promise.resolve();
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const prefs = user.preferences || {
      theme: 'auto',
      language: 'en',
      timezone: 'UTC',
      notifications: settings,
    };
    this.users.set(userId, {
      ...user,
      preferences: { ...(prefs as UserPreferences), notifications: settings },
    });
  }

  async getTotalShifts(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startDate: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _endDate: Date
  ): Promise<number> {
    await Promise.resolve();
    this.checkForFailure();
    // Mock calculation
    return 20;
  }

  async getWorkingHours(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startDate: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _endDate: Date
  ): Promise<number> {
    await Promise.resolve();
    this.checkForFailure();
    // Mock calculation
    return 240; // 20 shifts * 12 hours
  }

  subscribeToUserChanges(
    userId: string,
    callback: (user: UserProfile | null) => void
  ): Unsubscribe {
    this.subscriptions.set(userId, callback);
    // Immediately call with current data
    Promise.resolve().then(() => {
      const user = this.users.get(userId) || null;
      callback(user);
    });
    return () => {
      this.subscriptions.delete(userId);
    };
  }

  // Test helper to trigger subscription
  triggerSubscription(userId: string, user: UserProfile | null): void {
    const callback = this.subscriptions.get(userId);
    if (callback) {
      callback(user);
    }
  }
}

export const UserService = MockUserService;
export const userService = new MockUserService();
