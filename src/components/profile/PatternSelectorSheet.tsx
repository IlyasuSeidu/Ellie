/**
 * PatternSelectorSheet
 *
 * Bottom-sheet modal for selecting a shift pattern. Filters available
 * patterns by the user's current shift system and roster type.
 * Features a spring slide-up animation, pattern cards in a 2-column grid,
 * gold selection highlight, and haptic feedback.
 */

import React, { useEffect } from 'react';
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
import { theme } from '@/utils/theme';
import { ShiftPattern } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

// ── Pattern metadata ──────────────────────────────────────────────────────────

interface PatternMeta {
  name: string;
  subtitle: string;
  ratio: string;
  isCustom?: boolean;
}

const PATTERN_META: Record<ShiftPattern, PatternMeta> = {
  [ShiftPattern.STANDARD_3_3_3]: {
    name: '3-3-3 Rotation',
    subtitle: '9-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.STANDARD_4_4_4]: {
    name: '4-4-4 Rotation',
    subtitle: '12-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.STANDARD_5_5_5]: {
    name: '5-5-5 Rotation',
    subtitle: '15-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.STANDARD_7_7_7]: {
    name: '7-7-7 Rotation',
    subtitle: '21-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.STANDARD_10_10_10]: {
    name: '10-10-10 Rotation',
    subtitle: '30-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.STANDARD_2_2_3]: {
    name: 'Pitman (2-2-3)',
    subtitle: '7-day cycle',
    ratio: '4:3',
  },
  [ShiftPattern.CONTINENTAL]: {
    name: 'Continental',
    subtitle: '10-day cycle',
    ratio: '3:2',
  },
  [ShiftPattern.PITMAN]: {
    name: 'Pitman',
    subtitle: '7-day cycle',
    ratio: '4:3',
  },
  [ShiftPattern.CUSTOM]: {
    name: 'Custom Rotation',
    subtitle: 'Build your own',
    ratio: '-',
    isCustom: true,
  },
  [ShiftPattern.FIFO_7_7]: {
    name: '7/7 FIFO',
    subtitle: '14-day cycle',
    ratio: '1:1',
  },
  [ShiftPattern.FIFO_8_6]: {
    name: '8/6 FIFO',
    subtitle: '14-day cycle',
    ratio: '4:3',
  },
  [ShiftPattern.FIFO_14_14]: {
    name: '14/14 FIFO',
    subtitle: '28-day cycle',
    ratio: '1:1',
  },
  [ShiftPattern.FIFO_14_7]: {
    name: '14/7 FIFO',
    subtitle: '21-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.FIFO_21_7]: {
    name: '21/7 FIFO',
    subtitle: '28-day cycle',
    ratio: '3:1',
  },
  [ShiftPattern.FIFO_28_14]: {
    name: '28/14 FIFO',
    subtitle: '42-day cycle',
    ratio: '2:1',
  },
  [ShiftPattern.FIFO_CUSTOM]: {
    name: 'Custom FIFO',
    subtitle: 'Configure blocks',
    ratio: '-',
    isCustom: true,
  },
};

// ── Pattern lists by config ───────────────────────────────────────────────────

const ROTATING_2SHIFT: ShiftPattern[] = [
  ShiftPattern.STANDARD_3_3_3,
  ShiftPattern.STANDARD_4_4_4,
  ShiftPattern.STANDARD_5_5_5,
  ShiftPattern.STANDARD_7_7_7,
  ShiftPattern.STANDARD_10_10_10,
  ShiftPattern.STANDARD_2_2_3,
  ShiftPattern.PITMAN,
  ShiftPattern.CUSTOM,
];

const ROTATING_3SHIFT: ShiftPattern[] = [
  ShiftPattern.STANDARD_3_3_3,
  ShiftPattern.STANDARD_4_4_4,
  ShiftPattern.STANDARD_5_5_5,
  ShiftPattern.STANDARD_7_7_7,
  ShiftPattern.CONTINENTAL,
  ShiftPattern.CUSTOM,
];

const FIFO_PATTERNS: ShiftPattern[] = [
  ShiftPattern.FIFO_7_7,
  ShiftPattern.FIFO_8_6,
  ShiftPattern.FIFO_14_14,
  ShiftPattern.FIFO_14_7,
  ShiftPattern.FIFO_21_7,
  ShiftPattern.FIFO_28_14,
  ShiftPattern.FIFO_CUSTOM,
];

function getPatternsForConfig(
  shiftSystem: '2-shift' | '3-shift',
  rosterType: 'rotating' | 'fifo'
): ShiftPattern[] {
  if (rosterType === 'fifo') return FIFO_PATTERNS;
  return shiftSystem === '3-shift' ? ROTATING_3SHIFT : ROTATING_2SHIFT;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PatternSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  shiftSystem?: '2-shift' | '3-shift';
  rosterType?: 'rotating' | 'fifo';
  selectedPattern?: ShiftPattern;
  onSelect: (pattern: ShiftPattern) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PatternSelectorSheet: React.FC<PatternSelectorSheetProps> = ({
  visible,
  onClose,
  shiftSystem = '2-shift',
  rosterType = 'rotating',
  selectedPattern,
  onSelect,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    // Reset to hidden values before opening animation to avoid stale modal state in native builds.
    backdropOpacity.value = 0;
    translateY.value = SCREEN_HEIGHT;
    backdropOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
  }, [visible, backdropOpacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const patterns = getPatternsForConfig(shiftSystem, rosterType);

  const handleSelect = (pattern: ShiftPattern) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(pattern);
    onClose();
  };

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
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.sacredGold} />
            </View>
            <Animated.Text style={styles.headerTitle}>Select Pattern</Animated.Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityLabel="Close pattern selector"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={24} color={theme.colors.dust} />
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Animated.Text style={styles.headerSubtitle}>
          {rosterType === 'fifo'
            ? 'FIFO block rosters'
            : shiftSystem === '3-shift'
              ? '3-shift (8h) rotating patterns'
              : '2-shift (12h) rotating patterns'}
        </Animated.Text>

        {/* Pattern grid */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {patterns.map((pattern) => {
            const meta = PATTERN_META[pattern];
            const isSelected = pattern === selectedPattern;
            return (
              <PatternCard
                key={pattern}
                pattern={pattern}
                meta={meta}
                isSelected={isSelected}
                isFIFO={rosterType === 'fifo'}
                onPress={() => handleSelect(pattern)}
              />
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ── PatternCard ───────────────────────────────────────────────────────────────

/** Returns an array of dot colours indicating shift types in the pattern */
function getPatternDots(pattern: ShiftPattern, isFIFO: boolean): string[] {
  if (pattern === ShiftPattern.CUSTOM || pattern === ShiftPattern.FIFO_CUSTOM) {
    return ['#B45309']; // sacredGold — custom
  }
  if (isFIFO) {
    return ['#2196F3', '#78716c']; // work (blue) + rest (stone)
  }
  if (pattern === ShiftPattern.CONTINENTAL) {
    return ['#F59E0B', '#06B6D4', '#9C27B0', '#4CAF50']; // morning/afternoon/night/off
  }
  // 2-shift rotating
  return ['#2196F3', '#9C27B0', '#4CAF50']; // day + night + off
}

interface PatternCardProps {
  pattern: ShiftPattern;
  meta: PatternMeta;
  isSelected: boolean;
  isFIFO: boolean;
  onPress: () => void;
}

const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  meta,
  isSelected,
  isFIFO,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
  };

  return (
    <Animated.View style={[styles.cardWrapper, cardStyle]}>
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`${meta.name}, ${meta.subtitle}${isSelected ? ', currently selected' : ''}`}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        accessibilityHint="Double tap to select this pattern"
      >
        {/* Selection checkmark */}
        {isSelected && (
          <View style={styles.cardCheckmark}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.sacredGold} />
          </View>
        )}

        {/* Icon */}
        <View
          style={[
            styles.cardIconBg,
            { backgroundColor: isFIFO ? 'rgba(27, 94, 32, 0.2)' : 'rgba(21, 101, 192, 0.15)' },
          ]}
        >
          <Ionicons
            name={
              meta.isCustom
                ? 'construct-outline'
                : isFIFO
                  ? 'airplane-outline'
                  : 'refresh-circle-outline'
            }
            size={22}
            color={isFIFO ? '#4CAF50' : '#2196F3'}
          />
        </View>

        {/* Text */}
        <Animated.Text
          style={[styles.cardName, isSelected && styles.cardNameSelected]}
          numberOfLines={2}
        >
          {meta.name}
        </Animated.Text>
        <Animated.Text style={styles.cardSubtitle}>{meta.subtitle}</Animated.Text>

        {/* Shift-type dot indicators */}
        <View style={styles.patternDots}>
          {getPatternDots(pattern, isFIFO).map((color, idx) => (
            <View key={idx} style={[styles.patternDot, { backgroundColor: color }]} />
          ))}
        </View>

        {/* Ratio badge */}
        {meta.ratio !== '-' && (
          <View style={styles.ratioBadge}>
            <Animated.Text style={styles.ratioBadgeText}>{meta.ratio}</Animated.Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.softStone,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.opacity.gold10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 40,
    gap: theme.spacing.sm,
  },
  // Cards
  cardWrapper: {
    width: '47.5%',
  },
  card: {
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: theme.spacing.md,
    minHeight: 120,
    position: 'relative',
    gap: 6,
  },
  cardSelected: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(180, 83, 9, 0.08)',
  },
  cardCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
    lineHeight: 18,
  },
  cardNameSelected: {
    color: theme.colors.sacredGold,
  },
  cardSubtitle: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
  },
  ratioBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  ratioBadgeText: {
    fontSize: 10,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  patternDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
});
