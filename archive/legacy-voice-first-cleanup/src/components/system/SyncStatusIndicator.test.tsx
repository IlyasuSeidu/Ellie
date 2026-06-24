import React from 'react';
import { render } from '@testing-library/react-native';
import { SyncStatusIndicator } from '@/components/system/SyncStatusIndicator';
import { usePendingSyncStatus } from '@/hooks/usePendingSyncStatus';

jest.mock('@/hooks/usePendingSyncStatus', () => ({
  usePendingSyncStatus: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stays hidden when there is nothing pending or failed', () => {
    jest.mocked(usePendingSyncStatus).mockReturnValue({
      pendingCount: 0,
      failedCount: 0,
      isOnline: true,
    });

    const { queryByTestId } = render(<SyncStatusIndicator />);

    expect(queryByTestId('sync-status-indicator')).toBeNull();
  });

  it('shows locally saved updates while offline', () => {
    jest.mocked(usePendingSyncStatus).mockReturnValue({
      pendingCount: 2,
      failedCount: 0,
      isOnline: false,
    });

    const { getByTestId, getByText } = render(<SyncStatusIndicator />);

    expect(getByTestId('sync-status-indicator')).toBeTruthy();
    expect(getByText('2 update saved locally. It will sync when you are online.')).toBeTruthy();
  });

  it('prioritizes failed sync warnings', () => {
    jest.mocked(usePendingSyncStatus).mockReturnValue({
      pendingCount: 1,
      failedCount: 1,
      isOnline: true,
    });

    const { getByText } = render(<SyncStatusIndicator />);

    expect(getByText('1 update needs review before it can sync.')).toBeTruthy();
  });
});
