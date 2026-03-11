import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import i18n from '@/i18n';
import { normalizeLanguage, type SupportedLanguage } from '@/i18n/languageDetector';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: async () => {},
});

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

const isRtlLanguage = (language: string): boolean =>
  String(language ?? '')
    .toLowerCase()
    .startsWith('ar');

const tryReloadAppAsync = async (): Promise<boolean> => {
  try {
    // Use `require` so this remains compatible with stale native builds and Jest mocks.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const updatesModule = require('expo-updates') as { reloadAsync?: () => Promise<void> };
    if (typeof updatesModule.reloadAsync === 'function') {
      await updatesModule.reloadAsync();
      return true;
    }
  } catch {
    // expo-updates may be unavailable in stale native builds.
  }
  return false;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    normalizeLanguage(i18n.language)
  );

  const setLanguage = useCallback(async (nextLanguage: string) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);
    const shouldUseRtl = isRtlLanguage(normalizedLanguage);
    const shouldToggleDirection = I18nManager.isRTL !== shouldUseRtl;

    await i18n.changeLanguage(normalizedLanguage);
    setLanguageState(normalizedLanguage);

    if (!shouldToggleDirection) {
      return;
    }

    if (typeof I18nManager.allowRTL === 'function') {
      I18nManager.allowRTL(shouldUseRtl);
    }
    if (typeof I18nManager.forceRTL === 'function') {
      I18nManager.forceRTL(shouldUseRtl);
    }

    const didReload = await tryReloadAppAsync();
    if (didReload) {
      return;
    }

    Alert.alert(
      i18n.t('language.restartRequiredTitle', {
        ns: 'common',
        defaultValue: 'Restart Required',
      }),
      i18n.t('language.restartRequiredMessage', {
        ns: 'common',
        defaultValue: 'Please restart Ellie to apply language direction changes.',
      })
    );
  }, []);

  useEffect(() => {
    const syncLanguage = () => {
      setLanguageState(normalizeLanguage(i18n.language));
    };

    if (i18n.isInitialized) {
      syncLanguage();
    } else {
      i18n.on('initialized', syncLanguage);
    }

    i18n.on('languageChanged', syncLanguage);

    return () => {
      i18n.off('initialized', syncLanguage);
      i18n.off('languageChanged', syncLanguage);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};
