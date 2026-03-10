import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import { reloadAsync } from 'expo-updates';
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

    try {
      if (typeof reloadAsync === 'function') {
        await reloadAsync();
        return;
      }
    } catch {
      // Fallback alert handled below.
    }

    Alert.alert('Restart Required', 'Please restart Ellie to apply language direction changes.');
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
