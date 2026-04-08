import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/system/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders while offline', () => {
    jest.mocked(useNetworkStatus).mockReturnValue({
      status: 'offline',
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown',
      updatedAt: Date.now(),
    });

    const { getByTestId, getByText } = render(<OfflineBanner />);

    expect(getByTestId('offline-banner')).toBeTruthy();
    expect(getByText('Offline. Your shift data is still available.')).toBeTruthy();
  });

  it('does not render while online', () => {
    jest.mocked(useNetworkStatus).mockReturnValue({
      status: 'online',
      isConnected: true,
      isInternetReachable: true,
      type: 'unknown',
      updatedAt: Date.now(),
    });

    const { queryByTestId } = render(<OfflineBanner />);

    expect(queryByTestId('offline-banner')).toBeNull();
  });
});
