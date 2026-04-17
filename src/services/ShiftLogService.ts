import { asyncStorageService } from '@/services/AsyncStorageService';
import { FirebaseService } from '@/services/firebase/FirebaseService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/utils/logger';
import { ValidationError } from '@/utils/errorUtils';
import type { ShiftLogEntry, ShiftType } from '@/types';
import { validateShiftLogEntry } from '@/types/validation';

export type ShiftLogSaveResult = {
  entry: ShiftLogEntry;
  syncStatus: 'synced' | 'pending';
};

function buildShiftLogId(userId: string, date: string, shiftType: ShiftType): string {
  return `${userId}:${date}:${shiftType}`;
}

function isShiftType(value: unknown): value is ShiftType {
  return (
    value === 'day' ||
    value === 'night' ||
    value === 'morning' ||
    value === 'afternoon' ||
    value === 'off'
  );
}

export class ShiftLogService extends FirebaseService {
  private readonly SHIFT_LOGS_COLLECTION = 'shiftLogs';

  private getEntryKey(id: string): string {
    return `${STORAGE_KEYS.shiftLogs.entryPrefix}${id}`;
  }

  private getPendingKey(id: string): string {
    return `${STORAGE_KEYS.shiftLogs.pendingPrefix}${id}`;
  }

  buildId(userId: string, date: string, shiftType: ShiftType): string {
    return buildShiftLogId(userId, date, shiftType);
  }

  async getShiftLog(
    userId: string,
    date: string,
    shiftType: ShiftType,
    firebaseUid?: string | null
  ): Promise<ShiftLogEntry | null> {
    const id = this.buildId(userId, date, shiftType);
    const cached = await asyncStorageService.get<ShiftLogEntry>(this.getEntryKey(id));

    if (!this.canSyncRemotely(userId, firebaseUid)) {
      return cached;
    }

    try {
      const remote = await this.read<ShiftLogEntry>(this.SHIFT_LOGS_COLLECTION, id);
      if (remote) {
        await this.cacheEntry(remote);
        return remote;
      }
    } catch (error) {
      logger.warn(
        'ShiftLogService: failed to read remote shift log, using local cache if available',
        {
          userId,
          date,
          shiftType,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }

    return cached;
  }

  async saveShiftLog(
    entry: ShiftLogEntry,
    firebaseUid?: string | null
  ): Promise<ShiftLogSaveResult> {
    const validated = this.normalizeEntry(entry);
    await this.cacheEntry(validated);

    if (!this.canSyncRemotely(validated.userId, firebaseUid)) {
      await this.markPending(validated.id);
      return {
        entry: validated,
        syncStatus: 'pending',
      };
    }

    try {
      await this.syncEntry(validated);
      await this.clearPending(validated.id);
      return {
        entry: validated,
        syncStatus: 'synced',
      };
    } catch (error) {
      logger.warn(
        'ShiftLogService: failed to sync shift log remotely, keeping local pending copy',
        {
          userId: validated.userId,
          entryId: validated.id,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      await this.markPending(validated.id);
      return {
        entry: validated,
        syncStatus: 'pending',
      };
    }
  }

  async syncPendingLogs(firebaseUid?: string | null): Promise<void> {
    if (!firebaseUid) {
      return;
    }

    const allKeys = await asyncStorageService.getAllKeys();
    const pendingIds = allKeys
      .filter((key) => key.startsWith(STORAGE_KEYS.shiftLogs.pendingPrefix))
      .map((key) => key.slice(STORAGE_KEYS.shiftLogs.pendingPrefix.length));

    for (const id of pendingIds) {
      const entry = await asyncStorageService.get<ShiftLogEntry>(this.getEntryKey(id));
      if (!entry) {
        await this.clearPending(id);
        continue;
      }

      if (!this.canSyncRemotely(entry.userId, firebaseUid)) {
        continue;
      }

      try {
        await this.syncEntry(entry);
        await this.clearPending(id);
      } catch (error) {
        logger.warn('ShiftLogService: failed to sync pending shift log', {
          userId: entry.userId,
          entryId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async syncEntry(entry: ShiftLogEntry): Promise<void> {
    await this.create(this.SHIFT_LOGS_COLLECTION, entry, entry.id);
  }

  private async cacheEntry(entry: ShiftLogEntry): Promise<void> {
    await asyncStorageService.set(this.getEntryKey(entry.id), entry);
  }

  private async markPending(id: string): Promise<void> {
    await asyncStorageService.set(this.getPendingKey(id), true);
  }

  private async clearPending(id: string): Promise<void> {
    await asyncStorageService.remove(this.getPendingKey(id));
  }

  private normalizeEntry(entry: ShiftLogEntry): ShiftLogEntry {
    const id = entry.id || buildShiftLogId(entry.userId, entry.date, entry.shiftType);
    if (!entry.userId) {
      throw new ValidationError('Shift log userId is required', 'INVALID_SHIFT_LOG_USER');
    }
    if (!entry.date) {
      throw new ValidationError('Shift log date is required', 'INVALID_SHIFT_LOG_DATE');
    }
    if (!isShiftType(entry.shiftType)) {
      throw new ValidationError('Shift log shiftType is invalid', 'INVALID_SHIFT_LOG_SHIFT_TYPE');
    }

    return validateShiftLogEntry({
      ...entry,
      id,
      loggedAt: entry.loggedAt || new Date().toISOString(),
    });
  }

  private canSyncRemotely(userId: string, firebaseUid?: string | null): boolean {
    return Boolean(firebaseUid && userId === firebaseUid);
  }
}

export const shiftLogService = new ShiftLogService();
