import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';
import { PAYWALL_DECLINED_KEY, usePaywallRecovery } from '../usePaywallRecovery';

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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the nudge for non-pro users inside the recovery window', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(String(Date.now() - 10 * 60 * 1000));

    const { getByText } = render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(getByText('visible')).toBeTruthy();
    });
  });

  it('does not show the nudge before the minimum delay', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(String(Date.now() - 2 * 60 * 1000));

    const { getByText } = render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(getByText('hidden')).toBeTruthy();
    });
  });

  it('removes expired decline timestamps', async () => {
    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem').mockResolvedValue();
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockResolvedValue(String(Date.now() - 8 * 24 * 60 * 60 * 1000));

    render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalledWith(PAYWALL_DECLINED_KEY);
    });
  });

  it('clears storage and hides the nudge when dismissed', async () => {
    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem').mockResolvedValue();
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(String(Date.now() - 10 * 60 * 1000));

    const { getByText } = render(<HookHarness isPro={false} />);

    await waitFor(() => {
      expect(getByText('visible')).toBeTruthy();
    });

    await act(async () => {
      await dismissNudgeRef.current?.();
    });

    expect(removeItemSpy).toHaveBeenCalledWith(PAYWALL_DECLINED_KEY);
    expect(getByText('hidden')).toBeTruthy();
  });

  it('never shows the nudge for pro users and clears stale storage', async () => {
    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem').mockResolvedValue();
    const getItemSpy = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(String(Date.now()));

    const { getByText } = render(<HookHarness isPro />);

    await waitFor(() => {
      expect(getByText('hidden')).toBeTruthy();
    });

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).toHaveBeenCalledWith(PAYWALL_DECLINED_KEY);
  });
});
