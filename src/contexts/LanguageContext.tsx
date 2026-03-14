import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Modal, StyleSheet, Text, View } from 'react-native';
import i18n from '@/i18n';
import { normalizeLanguage, type SupportedLanguage } from '@/i18n/languageDetector';
import { theme } from '@/utils/theme';

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

const translate = (
  key: string,
  options?: {
    ns?: string;
    defaultValue?: string;
  }
): string => {
  const tFn = (i18n as unknown as { t?: (k: string, o?: Record<string, unknown>) => unknown }).t;
  if (typeof tFn === 'function') {
    return String(tFn(key, options));
  }
  return String(options?.defaultValue ?? key);
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    normalizeLanguage(i18n.language)
  );
  const [isApplyingDirectionChange, setIsApplyingDirectionChange] = useState(false);

  const setLanguage = useCallback(async (nextLanguage: string) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);
    const shouldUseRtl = isRtlLanguage(normalizedLanguage);
    const shouldToggleDirection = I18nManager.isRTL !== shouldUseRtl;
    const currentLanguage = normalizeLanguage(i18n.language);
    let didReload = false;

    if (!shouldToggleDirection && currentLanguage === normalizedLanguage) {
      return;
    }

    if (shouldToggleDirection) {
      setIsApplyingDirectionChange(true);
    }

    try {
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

      didReload = await tryReloadAppAsync();
      if (didReload) {
        return;
      }

      Alert.alert(
        translate('language.restartRequiredTitle', {
          ns: 'common',
          defaultValue: 'Restart Required',
        }),
        translate('language.restartRequiredMessage', {
          ns: 'common',
          defaultValue: 'Please restart Ellie to apply language direction changes.',
        })
      );
    } finally {
      if (shouldToggleDirection && !didReload) {
        setIsApplyingDirectionChange(false);
      }
    }
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

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={isApplyingDirectionChange}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.sacredGold} />
            <Text style={styles.loadingTitle}>
              {translate('language.applyingLanguageTitle', {
                ns: 'common',
                defaultValue: 'Applying language settings...',
              })}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {translate('language.applyingLanguageSubtitle', {
                ns: 'common',
                defaultValue: 'Please wait while Ellie refreshes.',
              })}
            </Text>
          </View>
        </View>
      </Modal>
    </LanguageContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white20,
    backgroundColor: 'rgba(12, 10, 9, 0.94)',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingTitle: {
    color: theme.colors.paper,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSubtitle: {
    color: theme.colors.dust,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
