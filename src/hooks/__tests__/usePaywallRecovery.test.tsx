import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { usePaywallRecovery } from '../usePaywallRecovery';
import { appStateStorageService } from '@/services/AppStateStorageService';

jest.mock('@/services/AppStateStorageService', () => ({
  appStateStorageService: {
    getPaywallDeclinedAt: jest.fn(),
    clearPaywallDeclinedAt: jest.fn(),
  },
}));

const dismissNudgeRef: { current: (() => Promise<void>) | null } = { current: null };

function HookHarness({ isPro }: { isPro: boolean }) {
  const { shouldNudge, dismissNudge } = usePaywallRecovery(isPro);
  dismissNudgeRef.current = dismissNudge;
  return <Text>{shouldNudge ? 'visible' : 'hidden'}</Text>;
}

describe('usePaywallRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T00:00:00Z'));
    dismissNudgeRef.current = null;
    jest.mocked(appStateStorageService.getPaywallDeclinedAt).mockResolvedValue(null);
    jest.mocked(appStateStorageService.clearPaywallDeclinedAt).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the nudge for non-pro users inside the recovery window', async () => {
    jest
      .mocked(appStateStorageService.getPaywallDeclinedAt)
      .mockResolvedValue(Date.now() - 10 * 60 * 1000);

    const { getByText } = render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(getByText('visible')).toBeTruthy();
    });
  });

  it('does not show the nudge before the minimum delay', async () => {
    jest
      .mocked(appStateStorageService.getPaywallDeclinedAt)
      .mockResolvedValue(Date.now() - 2 * 60 * 1000);

    const { getByText } = render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(getByText('hidden')).toBeTruthy();
    });
  });

  it('removes expired decline timestamps', async () => {
    jest
      .mocked(appStateStorageService.getPaywallDeclinedAt)
      .mockResolvedValue(Date.now() - 8 * 24 * 60 * 60 * 1000);

    render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(appStateStorageService.clearPaywallDeclinedAt).toHaveBeenCalled();
    });
  });

  it('clears storage and hides the nudge when dismissed', async () => {
    jest
      .mocked(appStateStorageService.getPaywallDeclinedAt)
      .mockResolvedValue(Date.now() - 10 * 60 * 1000);

    const { getByText } = render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(getByText('visible')).toBeTruthy();
    });

    await act(async () => {
      await dismissNudgeRef.current?.();
    });

    expect(appStateStorageService.clearPaywallDeclinedAt).toHaveBeenCalled();
    expect(getByText('hidden')).toBeTruthy();
  });

  it('never shows the nudge for pro users and clears stale storage', async () => {
    const { getByText } = render(<HookHarness isPro />);

    await waitFor(() => {
      expect(getByText('hidden')).toBeTruthy();
    });

    expect(appStateStorageService.getPaywallDeclinedAt).not.toHaveBeenCalled();
    expect(appStateStorageService.clearPaywallDeclinedAt).toHaveBeenCalled();
  });
});
