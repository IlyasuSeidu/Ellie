import { EnergyLevel } from '@/types';

const mockCreate = jest.fn();
const mockRead = jest.fn();

const mockStorage = new Map<string, unknown>();

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn((key: string) =>
      Promise.resolve(mockStorage.has(`app:${key}`) ? mockStorage.get(`app:${key}`) : null)
    ),
    set: jest.fn((key: string, value: unknown) => {
      mockStorage.set(`app:${key}`, value);
      return Promise.resolve();
    }),
    remove: jest.fn((key: string) => {
      mockStorage.delete(`app:${key}`);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() =>
      Promise.resolve(Array.from(mockStorage.keys()).map((key) => key.replace(/^app:/, '')))
    ),
  },
}));

jest.mock('@/services/firebase/FirebaseService', () => ({
  FirebaseService: class {
    protected async create(...args: unknown[]) {
      return mockCreate(...args);
    }

    protected async read(...args: unknown[]) {
      return mockRead(...args);
    }
  },
}));

import { shiftLogService } from '@/services/ShiftLogService';

describe('ShiftLogService', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
    mockRead.mockResolvedValue(null);
  });

  it('saves a shift log locally and remotely for the authenticated user', async () => {
    const result = await shiftLogService.saveShiftLog(
      {
        id: 'user-1:2026-04-14:day',
        userId: 'user-1',
        date: '2026-04-14',
        shiftType: 'day',
        startTime: '07:00',
        endTime: '19:00',
        hoursWorked: 12,
        energyLevel: EnergyLevel.MEDIUM,
        notes: 'Busy shift',
        loggedAt: '2026-04-14T20:00:00.000Z',
      },
      'user-1'
    );

    expect(result.syncStatus).toBe('synced');
    expect(mockCreate).toHaveBeenCalledWith(
      'shiftLogs',
      expect.objectContaining({
        userId: 'user-1',
        date: '2026-04-14',
        energyLevel: EnergyLevel.MEDIUM,
      }),
      'user-1:2026-04-14:day'
    );
  });

  it('keeps a local pending copy when remote sync fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('offline'));

    const result = await shiftLogService.saveShiftLog(
      {
        id: 'user-1:2026-04-14:night',
        userId: 'user-1',
        date: '2026-04-14',
        shiftType: 'night',
        startTime: '19:00',
        endTime: '07:00',
        hoursWorked: 12,
        energyLevel: EnergyLevel.LOW,
        loggedAt: '2026-04-15T08:00:00.000Z',
      },
      'user-1'
    );

    expect(result.syncStatus).toBe('pending');
    expect(mockStorage.get('app:shift-logs:pending:user-1:2026-04-14:night')).toBe(true);
  });

  it('loads a cached shift log when remote data is unavailable', async () => {
    await shiftLogService.saveShiftLog(
      {
        id: 'user-1:2026-04-14:day',
        userId: 'user-1',
        date: '2026-04-14',
        shiftType: 'day',
        startTime: '07:00',
        endTime: '19:00',
        hoursWorked: 12,
        energyLevel: EnergyLevel.HIGH,
        loggedAt: '2026-04-14T20:00:00.000Z',
      },
      null
    );

    const entry = await shiftLogService.getShiftLog('user-1', '2026-04-14', 'day', null);

    expect(entry?.energyLevel).toBe(EnergyLevel.HIGH);
    expect(mockRead).not.toHaveBeenCalled();
  });

  it('syncs pending logs once the authenticated user becomes available', async () => {
    mockCreate.mockRejectedValueOnce(new Error('offline'));

    await shiftLogService.saveShiftLog(
      {
        id: 'user-1:2026-04-14:day',
        userId: 'user-1',
        date: '2026-04-14',
        shiftType: 'day',
        startTime: '07:00',
        endTime: '19:00',
        hoursWorked: 12,
        energyLevel: EnergyLevel.MEDIUM,
        loggedAt: '2026-04-14T20:00:00.000Z',
      },
      'user-1'
    );

    mockCreate.mockResolvedValue(undefined);

    await shiftLogService.syncPendingLogs('user-1');

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockStorage.has('app:shift-logs:pending:user-1:2026-04-14:day')).toBe(false);
  });
});
