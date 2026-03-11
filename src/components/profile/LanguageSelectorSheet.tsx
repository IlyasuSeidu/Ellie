import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/languageDetector';
import { getSettingsErrorMessage } from '@/utils/settingsErrorMessage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.72;

interface LanguageOption {
  code: SupportedLanguage;
  nativeName: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'zh-CN', nativeName: '中文' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'hi', nativeName: 'हिन्दी' },
  { code: 'af', nativeName: 'Afrikaans' },
  { code: 'zu', nativeName: 'isiZulu' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português',
  fr: 'Français',
  ar: 'العربية',
  'zh-CN': '中文',
  ru: 'Русский',
  hi: 'हिन्दी',
  af: 'Afrikaans',
  zu: 'isiZulu',
  id: 'Bahasa Indonesia',
};

export interface LanguageSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelect: (language: string) => Promise<void>;
}

export const LanguageSelectorSheet: React.FC<LanguageSelectorSheetProps> = ({
  visible,
  onClose,
  currentLanguage,
  onSelect,
}) => {
  const { t } = useTranslation('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const selectableLanguages = useMemo(
    () => LANGUAGE_OPTIONS.filter((language) => SUPPORTED_LANGUAGES.includes(language.code)),
    []
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    backdropOpacity.value = 0;
    translateY.value = SCREEN_HEIGHT;
    backdropOpacity.value = withTiming(1, { duration: 280 });
    translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
  }, [visible, backdropOpacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelect = async (language: string) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onSelect(language);
      onClose();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(getSettingsErrorMessage(error, 'languageChange'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={t('buttons.close')}
        />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Ionicons name="language-outline" size={20} color={theme.colors.sacredGold} />
            </View>
            <Animated.Text style={styles.headerTitle}>{t('language.selector')}</Animated.Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('buttons.close')}
          >
            <Ionicons name="close-circle" size={24} color={theme.colors.dust} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
              <Animated.Text style={styles.errorText}>{errorMessage}</Animated.Text>
            </View>
          ) : null}

          {selectableLanguages.map((language) => {
            const isSelected = currentLanguage === language.code;
            const localizedLanguageName = String(
              t(`language.names.${language.code}`, {
                defaultValue: language.nativeName,
              })
            );
            const showNativeSubtitle = localizedLanguageName !== language.nativeName;

            return (
              <TouchableOpacity
                key={language.code}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => handleSelect(language.code)}
                disabled={isSubmitting}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={localizedLanguageName}
              >
                <View style={styles.optionTextWrap}>
                  <Animated.Text
                    style={[styles.optionName, isSelected && styles.optionNameSelected]}
                  >
                    {localizedLanguageName}
                  </Animated.Text>
                  {showNativeSubtitle ? (
                    <Animated.Text style={styles.optionNative}>{language.nativeName}</Animated.Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.sacredGold} />
                ) : (
                  <Ionicons name="ellipse-outline" size={18} color={theme.colors.shadow} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 8, 0.65)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    paddingTop: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.softStone,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.opacity.gold10,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  closeButton: {
    padding: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.errorBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.softStone,
  },
  optionRowSelected: {
    borderColor: 'rgba(180, 83, 9, 0.45)',
    backgroundColor: theme.colors.opacity.gold10,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  optionNameSelected: {
    color: theme.colors.sacredGold,
  },
  optionNative: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
  },
});
