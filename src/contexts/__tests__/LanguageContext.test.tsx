import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@/i18n', () => {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {
    initialized: [],
    languageChanged: [],
  };

  const i18n = {
    language: 'en',
    isInitialized: true,
    changeLanguage: jest.fn(async (nextLanguage: string) => {
      i18n.language = nextLanguage;
      for (const handler of handlers.languageChanged) {
        handler(nextLanguage);
      }
    }),
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] ??= [];
      handlers[event].push(handler);
    }),
    off: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((candidate) => candidate !== handler);
    }),
  };

  return {
    __esModule: true,
    default: i18n,
  };
});

import { Alert, I18nManager } from 'react-native';
import i18n from '@/i18n';
import { reloadAsync } from 'expo-updates';
import { LanguageProvider, useLanguage } from '../LanguageContext';

describe('LanguageContext', () => {
  let alertSpy: jest.SpyInstance;
  const originalIsRTL = I18nManager.isRTL;
  const mockI18n = i18n as unknown as {
    language: string;
    changeLanguage: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.language = 'en';
    Object.defineProperty(I18nManager, 'isRTL', {
      configurable: true,
      value: false,
    });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    alertSpy.mockRestore();
    Object.defineProperty(I18nManager, 'isRTL', {
      configurable: true,
      value: originalIsRTL,
    });
  });

  const setup = (): { setLanguage: (language: string) => Promise<void> } => {
    let captured: { setLanguage: (language: string) => Promise<void> } | null = null;

    const Probe = () => {
      captured = useLanguage();
      return null;
    };

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    if (!captured) {
      throw new Error('Failed to capture language context');
    }

    return captured as { setLanguage: (language: string) => Promise<void> };
  };

  it('switches language without reload when direction does not change', async () => {
    const ctx = setup();

    await ctx.setLanguage('fr');

    await waitFor(() => {
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('fr');
      expect(reloadAsync).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('switches to Arabic language in settings flow', async () => {
    const ctx = setup();

    await ctx.setLanguage('ar');

    await waitFor(() => {
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('ar');
      expect(reloadAsync).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('switches from Arabic to LTR language in settings flow', async () => {
    mockI18n.language = 'ar';
    Object.defineProperty(I18nManager, 'isRTL', {
      configurable: true,
      value: true,
    });
    const ctx = setup();

    await ctx.setLanguage('en');

    await waitFor(() => {
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en');
      expect(reloadAsync).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
