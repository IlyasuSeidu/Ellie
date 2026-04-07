import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
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
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.84;

// ─── Data ─────────────────────────────────────────────────────────────────────

interface LanguageOption {
  code: SupportedLanguage;
  /** Name in the language's own script — always shown as the primary label */
  nativeName: string;
  /** Flag emoji representing the primary region for this language */
  flag: string;
  /** true when switching requires an RTL layout change (currently only Arabic) */
  rtl?: boolean;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'zh-CN', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'hi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'af', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu', nativeName: 'isiZulu', flag: '🇿🇦' },
  { code: 'id', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
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

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface LanguageSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelect: (language: string) => Promise<void>;
}

// ─── Animated row ──────────────────────────────────────────────────────────────

interface RowProps {
  option: LanguageOption;
  isSelected: boolean;
  localizedName: string;
  showNativeSubtitle: boolean;
  isSubmitting: boolean;
  entranceDelay: number;
  onPress: (code: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}

const LanguageRow: React.FC<RowProps> = React.memo(
  ({
    option,
    isSelected,
    localizedName,
    showNativeSubtitle,
    isSubmitting,
    entranceDelay,
    onPress,
    t,
  }) => {
    const rowOpacity = useSharedValue(0);
    const rowTranslate = useSharedValue(16);
    const rowScale = useSharedValue(1);
    const checkScale = useSharedValue(isSelected ? 1 : 0);
    const borderAlpha = useSharedValue(isSelected ? 1 : 0);

    // Staggered entrance — run once on mount
    useEffect(() => {
      rowOpacity.value = withDelay(entranceDelay, withTiming(1, { duration: 240 }));
      rowTranslate.value = withDelay(entranceDelay, withSpring(0, { damping: 22, stiffness: 210 }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Animate selection state
    useEffect(() => {
      checkScale.value = withSpring(isSelected ? 1 : 0, { damping: 16, stiffness: 300 });
      borderAlpha.value = withTiming(isSelected ? 1 : 0, { duration: 180 });
    }, [isSelected, checkScale, borderAlpha]);

    const handlePress = useCallback(() => {
      rowScale.value = withSequence(
        withSpring(1.022, { damping: 10, stiffness: 420 }),
        withSpring(1.0, { damping: 18, stiffness: 260 })
      );
      onPress(option.code);
    }, [onPress, option.code, rowScale]);

    const rowStyle = useAnimatedStyle(() => ({
      opacity: rowOpacity.value,
      transform: [{ translateY: rowTranslate.value }, { scale: rowScale.value }],
    }));

    const borderStyle = useAnimatedStyle(() => ({
      opacity: borderAlpha.value,
    }));

    const checkStyle = useAnimatedStyle(() => ({
      opacity: checkScale.value,
      transform: [{ scale: checkScale.value }],
    }));

    const emptyCircleStyle = useAnimatedStyle(() => ({
      opacity: 1 - checkScale.value,
    }));

    return (
      <Animated.View style={rowStyle}>
        <TouchableOpacity
          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
          onPress={handlePress}
          disabled={isSubmitting}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={localizedName}
        >
          {/* Animated gold border sits flush over the row, transparent to touches */}
          <Animated.View style={[styles.optionBorderOverlay, borderStyle]} pointerEvents="none" />

          {/* Flag */}
          <View style={[styles.flagContainer, isSelected && styles.flagContainerSelected]}>
            <Animated.Text style={styles.flagEmoji}>{option.flag}</Animated.Text>
          </View>

          {/* Language name(s) */}
          <View style={styles.optionTextWrap}>
            <Animated.Text
              style={[styles.optionName, isSelected && styles.optionNameSelected]}
              numberOfLines={1}
            >
              {localizedName}
            </Animated.Text>
            {showNativeSubtitle ? (
              <Animated.Text style={styles.optionNative} numberOfLines={1}>
                {option.nativeName}
              </Animated.Text>
            ) : null}
          </View>

          {/* RTL badge */}
          {option.rtl ? (
            <View style={styles.rtlBadge}>
              <Animated.Text style={styles.rtlBadgeText}>
                {/* @ts-expect-error -- i18next TFunction type inference is too deep here */}
                {t('language.rtlBadge', { defaultValue: 'RTL' })}
              </Animated.Text>
            </View>
          ) : null}

          {/* Selection indicator */}
          <View style={styles.indicatorWrap}>
            <Animated.View style={[styles.checkFill, checkStyle]}>
              <Ionicons name="checkmark" size={13} color={theme.colors.deepVoid} />
            </Animated.View>
            <Animated.View style={[styles.emptyCircle, emptyCircleStyle]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

// ─── Main component ────────────────────────────────────────────────────────────

export const LanguageSelectorSheet: React.FC<LanguageSelectorSheetProps> = ({
  visible,
  onClose,
  currentLanguage,
  onSelect,
}) => {
  const { t } = useTranslation('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const searchOpacity = useSharedValue(0);
  const searchTranslate = useSharedValue(10);

  const selectableLanguages = useMemo(
    () => LANGUAGE_OPTIONS.filter((lang) => SUPPORTED_LANGUAGES.includes(lang.code)),
    []
  );

  // Pin the currently selected language to the top of the list
  const orderedLanguages = useMemo(() => {
    const selected = selectableLanguages.find((l) => l.code === currentLanguage);
    const rest = selectableLanguages.filter((l) => l.code !== currentLanguage);
    return selected ? [selected, ...rest] : selectableLanguages;
  }, [selectableLanguages, currentLanguage]);

  const filteredLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedLanguages;
    return orderedLanguages.filter(
      (lang) => lang.nativeName.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q)
    );
  }, [query, orderedLanguages]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setErrorMessage(null);
      return;
    }

    backdropOpacity.value = 0;
    translateY.value = SCREEN_HEIGHT;
    searchOpacity.value = 0;
    searchTranslate.value = 10;

    backdropOpacity.value = withTiming(1, { duration: 250 });
    translateY.value = withSpring(0, { damping: 26, stiffness: 290 });

    // Search bar drifts in after the sheet settles
    searchOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
    searchTranslate.value = withDelay(200, withSpring(0, { damping: 22, stiffness: 260 }));
  }, [visible, backdropOpacity, translateY, searchOpacity, searchTranslate]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const searchBarStyle = useAnimatedStyle(() => ({
    opacity: searchOpacity.value,
    transform: [{ translateY: searchTranslate.value }],
  }));

  const handleSelect = useCallback(
    async (language: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await onSelect(language);
        onClose();
      } catch (error) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage(getSettingsErrorMessage(error, 'languageChange'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onClose, onSelect]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={t('buttons.close')}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconBg}>
            <Ionicons name="language" size={17} color={theme.colors.sacredGold} />
          </View>
          <View style={styles.headerText}>
            <Animated.Text style={styles.headerTitle}>{t('language.selector')}</Animated.Text>
            <Animated.Text style={styles.headerSubtitle}>
              {t('language.selectorSubtitle', { defaultValue: 'Choose your language' })}
            </Animated.Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('buttons.close')}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={15} color={theme.colors.dust} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Search + divider — fade in together after sheet settles */}
        <Animated.View style={searchBarStyle}>
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={15} color={theme.colors.shadow} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('language.search', { defaultValue: 'Search languages…' })}
                placeholderTextColor={theme.colors.shadow}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          </View>
          <View style={styles.divider} />
        </Animated.View>

        {/* Error */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.error} />
            <Animated.Text style={styles.errorText}>{errorMessage}</Animated.Text>
          </View>
        ) : null}

        {/* Language list */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredLanguages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={30} color={theme.colors.shadow} />
              <Animated.Text style={styles.emptyText}>
                {t('language.noResults', { defaultValue: 'No languages found' })}
              </Animated.Text>
            </View>
          ) : (
            <>
              {/* "CURRENT" micro-label above pinned selected row (only when not searching) */}
              {!query && filteredLanguages[0]?.code === currentLanguage ? (
                <Animated.Text style={styles.sectionLabel}>
                  {t('language.currentLabel', { defaultValue: 'CURRENT' })}
                </Animated.Text>
              ) : null}

              {filteredLanguages.map((lang, index) => {
                const isSelected = currentLanguage === lang.code;
                const localizedName = String(
                  t(`language.names.${lang.code}`, { defaultValue: lang.nativeName })
                );
                const showNativeSubtitle = localizedName !== lang.nativeName;

                return (
                  <React.Fragment key={lang.code}>
                    {/* Thin divider separates pinned selected row from the rest */}
                    {!query && index === 1 && filteredLanguages[0]?.code === currentLanguage ? (
                      <View style={styles.listDivider} />
                    ) : null}
                    <LanguageRow
                      option={lang}
                      isSelected={isSelected}
                      localizedName={localizedName}
                      showNativeSubtitle={showNativeSubtitle}
                      isSubmitting={isSubmitting}
                      entranceDelay={index * 50}
                      onPress={handleSelect}
                      t={t}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Backdrop ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 8, 0.74)',
  },

  // ── Sheet ──
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderBottomWidth: 0,
    paddingTop: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.32,
        shadowRadius: 22,
      },
      android: { elevation: 18 },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.softStone,
    marginBottom: 20,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 14,
    gap: 10,
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(180, 83, 9, 0.11)',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
  },
  closeButton: { padding: 2 },
  closeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Search ──
  searchWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    paddingVertical: 0,
  },

  // ── Dividers ──
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 4,
  },
  listDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 6,
  },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
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

  // ── List ──
  scroll: { flexGrow: 0 },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 7,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.shadow,
    letterSpacing: 0.9,
    marginBottom: 4,
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    gap: 12,
  },
  emptyText: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.sm,
  },

  // ── Row ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: theme.colors.softStone,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    // overflow: 'hidden' intentionally omitted so iOS gold glow shadow can render
  },
  optionRowSelected: {
    backgroundColor: 'rgba(180, 83, 9, 0.07)',
    // Hide the static border so only the animated gold overlay border shows
    borderColor: 'transparent',
  },
  optionBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.sacredGold,
    // The border is always rendered; opacity animation fades it from transparent to gold.
    // At opacity 0 the sacredGold border is invisible, so the row appears borderless when unselected.
  },

  // ── Flag ──
  flagContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flagContainerSelected: {
    backgroundColor: 'rgba(180, 83, 9, 0.14)',
  },
  flagEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },

  // ── Text ──
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionName: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    letterSpacing: 0.1,
  },
  optionNameSelected: {
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  optionNative: {
    color: theme.colors.shadow,
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // ── RTL badge ──
  rtlBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(180, 83, 9, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.28)',
  },
  rtlBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.sacredGold,
    letterSpacing: 0.6,
  },

  // ── Selection indicator ──
  indicatorWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkFill: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.shadow,
  },
});
