/**
 * CustomTabBar
 *
 * A modern floating glassmorphic bottom tab bar with a center voice assistant button.
 * Uses expo-blur for a real frosted-glass effect, Reanimated for spring animations,
 * and expo-haptics for tactile feedback.
 *
 * Features a sliding glow indicator that smoothly transitions between active tabs.
 */

import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { useShiftAccent } from '@/hooks/useShiftAccent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_BAR_HEIGHT = 70;
const TAB_BAR_MARGIN_H = 16;
const TAB_BAR_MARGIN_BOTTOM = 12;
const TAB_BAR_RADIUS = 28;
const TAB_BAR_WIDTH = SCREEN_WIDTH - TAB_BAR_MARGIN_H * 2;
const CENTER_BUTTON_SIZE = 64;
const CENTER_BUTTON_PROTRUSION = 18;
const ICON_SIZE = 24;
const GLOW_SIZE = 44;

const CENTER_PLACEHOLDER_WIDTH = CENTER_BUTTON_SIZE + 8;
/** Width available for the 4 flex tabs */
const FLEX_TOTAL_WIDTH = TAB_BAR_WIDTH - CENTER_PLACEHOLDER_WIDTH;
const FLEX_TAB_WIDTH = FLEX_TOTAL_WIDTH / 2;

/** Ionicons name pairs for each tab route */
const TAB_ICONS: Record<
  string,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  Home: { outline: 'home-outline', filled: 'home' },
  Schedule: { outline: 'calendar-outline', filled: 'calendar' },
  Ellie: { outline: 'mic-outline', filled: 'mic' },
  Stats: { outline: 'bar-chart-outline', filled: 'bar-chart' },
  Profile: { outline: 'person-outline', filled: 'person' },
};

/**
 * Calculate the horizontal center X for a given tab index.
 * Tabs 0,1 are flex tabs before the center placeholder.
 * Tab 2 is the center placeholder (Ellie) — no indicator.
 * Tabs 3,4 are flex tabs after the center placeholder.
 */
function getTabCenterX(index: number): number {
  if (index < 1) {
    // Tabs before center: index 0 (Home)
    return FLEX_TAB_WIDTH * index + FLEX_TAB_WIDTH / 2;
  }
  // Tabs after center: index 2 (Profile) → visual slot 0
  const slot = index - 2;
  return FLEX_TAB_WIDTH + CENTER_PLACEHOLDER_WIDTH + FLEX_TAB_WIDTH * slot + FLEX_TAB_WIDTH / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual tab button with icon animation
// ─────────────────────────────────────────────────────────────────────────────

interface TabButtonProps {
  onPress: () => void;
  isFocused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  onPress,
  isFocused,
  iconName,
  iconColor,
  label,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value = withSequence(
        withSpring(1.18, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    }
  }, [isFocused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tab}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Ionicons name={iconName} size={ICON_SIZE} color={iconColor} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main custom tab bar
// ─────────────────────────────────────────────────────────────────────────────

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();
  const { state: voiceState, openModal } = useVoiceAssistant();
  const { tabAccentColor, tabGlowColor } = useShiftAccent();
  const centerButtonGradient = useMemo(
    () =>
      tabAccentColor === theme.colors.paleGold
        ? ([theme.colors.brightGold, theme.colors.sacredGold] as const)
        : ([tabAccentColor, tabAccentColor] as const),
    [tabAccentColor]
  );
  const centerButtonAccentStyle = useMemo(
    () => [
      { borderColor: tabAccentColor },
      Platform.OS === 'ios' ? { shadowColor: tabAccentColor } : null,
    ],
    [tabAccentColor]
  );

  const glowAccentStyle = useMemo(
    () => [
      { backgroundColor: tabGlowColor },
      Platform.OS === 'ios' ? { shadowColor: tabAccentColor } : null,
    ],
    [tabGlowColor, tabAccentColor]
  );

  // ── Sliding glow indicator ──────────────────────────────────────────────
  const indicatorX = useSharedValue(getTabCenterX(state.index));
  const indicatorOpacity = useSharedValue(state.index === 1 ? 0 : 1);
  const indicatorScale = useSharedValue(1);

  useEffect(() => {
    const isCenter = state.index === 1;

    if (isCenter) {
      // Hide indicator for center Ellie tab
      indicatorOpacity.value = withTiming(0, { duration: 200 });
    } else {
      const targetX = getTabCenterX(state.index);
      indicatorX.value = withSpring(targetX, {
        damping: 18,
        stiffness: 160,
        mass: 0.8,
      });
      indicatorOpacity.value = withTiming(1, { duration: 200 });
      // Pop effect on transition
      indicatorScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    }
  }, [state.index, indicatorX, indicatorOpacity, indicatorScale]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value - GLOW_SIZE / 2 }, { scale: indicatorScale.value }],
    opacity: indicatorOpacity.value,
  }));

  // ── Center button pulse ─────────────────────────────────────────────────
  const centerScale = useSharedValue(1);
  const isVoiceActive = voiceState !== 'idle';

  useEffect(() => {
    if (isVoiceActive) {
      centerScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      centerScale.value = withTiming(1, { duration: 300 });
    }
  }, [isVoiceActive, centerScale]);

  const centerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
  }));

  // ── Tab press handler ───────────────────────────────────────────────────
  const handleTabPress = (route: (typeof state.routes)[number], index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Center Ellie button opens modal instead of navigating
    if (route.name === 'Ellie') {
      openModal();
      return;
    }

    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const bottomPadding = Math.max(insets.bottom, 8);
  const tabLabels = useMemo(
    () => ({
      Home: t('tabs.home', { defaultValue: 'Home' }),
      Schedule: t('tabs.schedule', { defaultValue: 'Schedule' }),
      Stats: t('tabs.stats', { defaultValue: 'Stats' }),
      Profile: t('tabs.profile', { defaultValue: 'Profile' }),
      Ellie: t('tabs.ellie', { defaultValue: 'Ellie' }),
    }),
    [t]
  );

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      {/* Floating glassmorphic pill */}
      <View style={styles.pill}>
        {/* Layer 1: Native blur */}
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 2: Tinted glass overlay + border */}
        <View style={styles.glassOverlay} />

        {/* Layer 3: Sliding glow indicator */}
        <Animated.View style={[styles.glowIndicator, glowAccentStyle, indicatorStyle]} />

        {/* Layer 4: Tab buttons */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const isCenter = route.name === 'Ellie';

            // Reserve space for the center button
            if (isCenter) {
              return <View key={route.key} style={styles.centerPlaceholder} />;
            }

            const icons = TAB_ICONS[route.name];
            const iconName = isFocused ? icons.filled : icons.outline;
            const iconColor = isFocused ? tabAccentColor : theme.colors.dust;

            return (
              <TabButton
                key={route.key}
                onPress={() => handleTabPress(route, index)}
                isFocused={isFocused}
                iconName={iconName}
                iconColor={iconColor}
                label={tabLabels[route.name as keyof typeof tabLabels] ?? route.name}
              />
            );
          })}
        </View>
      </View>

      {/* Center Ellie button — absolute positioned above the pill */}
      <Animated.View style={[styles.centerButtonOuter, centerAnimStyle]}>
        <TouchableOpacity
          onPress={() => handleTabPress(state.routes[1], 1)}
          activeOpacity={0.8}
          accessibilityLabel={t('tabs.openVoiceAssistantA11y', {
            defaultValue: 'Open Ellie voice assistant',
          })}
          accessibilityRole="button"
        >
          <LinearGradient
            testID="center-mic-gradient"
            colors={centerButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.centerButton, centerButtonAccentStyle]}
          >
            <Ionicons
              name={isVoiceActive ? 'mic' : 'mic-outline'}
              size={28}
              color={tabAccentColor === theme.colors.paleGold ? theme.colors.deepVoid : '#fff'}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: TAB_BAR_MARGIN_H,
    paddingTop: CENTER_BUTTON_PROTRUSION + CENTER_BUTTON_SIZE / 2,
  },

  /** Floating pill that clips the blur */
  pill: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_RADIUS,
    overflow: 'hidden',
    marginBottom: TAB_BAR_MARGIN_BOTTOM,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  /** Tinted glass overlay on top of the blur */
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: TAB_BAR_RADIUS,
  },

  /** Animated glow circle that slides to the active tab */
  glowIndicator: {
    position: 'absolute',
    top: (TAB_BAR_HEIGHT - GLOW_SIZE) / 2,
    left: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: theme.colors.opacity.gold20,
    // Extra soft glow on iOS
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {},
    }),
  },

  /** Row of tab buttons, sits on top of glass layers */
  tabRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
  },

  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
  },

  tabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /** Space reserved in the row for the center button */
  centerPlaceholder: {
    width: CENTER_PLACEHOLDER_WIDTH,
  },

  /** The center Ellie button, floating above the pill */
  centerButtonOuter: {
    position: 'absolute',
    bottom:
      TAB_BAR_MARGIN_BOTTOM +
      TAB_BAR_HEIGHT / 2 -
      CENTER_BUTTON_SIZE / 2 +
      CENTER_BUTTON_PROTRUSION,
    alignSelf: 'center',
  },

  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.brightGold,
    // Gold glow
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
});
