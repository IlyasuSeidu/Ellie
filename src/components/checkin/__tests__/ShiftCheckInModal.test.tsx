import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EnergyLevel } from '@/types';

const mockGetShiftLog = jest.fn();
const mockSaveShiftLog = jest.fn();
const mockBuildId = jest.fn(
  (userId: string, date: string, shiftType: string) => `${userId}:${date}:${shiftType}`
);

jest.mock('@/services/ShiftLogService', () => ({
  shiftLogService: {
    getShiftLog: (...args: unknown[]) => mockGetShiftLog(...args),
    saveShiftLog: (...args: unknown[]) => mockSaveShiftLog(...args),
    buildId: (userId: string, date: string, shiftType: string) =>
      mockBuildId(userId, date, shiftType),
  },
}));

import { ShiftCheckInModal } from '@/components/checkin/ShiftCheckInModal';

describe('ShiftCheckInModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetShiftLog.mockResolvedValue(null);
    mockSaveShiftLog.mockResolvedValue({
      entry: {
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
      syncStatus: 'synced',
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('loads an existing entry and uses update copy', async () => {
    mockGetShiftLog.mockResolvedValueOnce({
      id: 'user-1:2026-04-14:day',
      userId: 'user-1',
      date: '2026-04-14',
      shiftType: 'day',
      startTime: '07:00',
      endTime: '19:00',
      hoursWorked: 12,
      energyLevel: EnergyLevel.MEDIUM,
      notes: 'Long shift',
      loggedAt: '2026-04-14T20:00:00.000Z',
    });

    const { getByText } = render(
      <ShiftCheckInModal
        visible
        userId="user-1"
        firebaseUid="user-1"
        shiftDate="2026-04-14"
        shiftType="day"
        language="en"
        onDismiss={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockGetShiftLog).toHaveBeenCalledWith('user-1', '2026-04-14', 'day', 'user-1');
    });

    expect(getByText('Update check-in')).toBeTruthy();
  });

  it('saves the selected energy level and notes', async () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ShiftCheckInModal
        visible
        userId="user-1"
        firebaseUid="user-1"
        shiftDate="2026-04-14"
        shiftType="day"
        language="en"
        onboardingData={{
          shiftTimes: {
            dayShift: { startTime: '06:30', endTime: '18:30', duration: 12 },
          },
        }}
        onDismiss={onDismiss}
      />
    );

    await waitFor(() => {
      expect(mockGetShiftLog).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('shift-checkin-energy-high'));
    fireEvent.changeText(getByTestId('shift-checkin-notes-input'), 'Felt sharp throughout.');
    fireEvent.press(getByTestId('shift-checkin-submit'));

    await waitFor(() => {
      expect(mockSaveShiftLog).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1:2026-04-14:day',
          userId: 'user-1',
          date: '2026-04-14',
          shiftType: 'day',
          startTime: '06:30',
          endTime: '18:30',
          hoursWorked: 12,
          energyLevel: EnergyLevel.HIGH,
          notes: 'Felt sharp throughout.',
        }),
        'user-1'
      );
    });

    jest.advanceTimersByTime(900);
    expect(onDismiss).toHaveBeenCalled();
  });
});
