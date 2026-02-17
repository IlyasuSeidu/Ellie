/**
 * QuickActionsBar Component
 *
 * Bottom action bar with quick-access buttons for
 * Settings, Notifications, Profile, and Export.
 * Features entrance animation and haptic feedback.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

export interface QuickAction {
  /** Unique action key */
  key: string;
  /** Ionicons icon name */
  icon: keyof typeof Ionicons.glyphMap;
  /** Display label */
  label: string;
  /** Icon color */
  color?: string;
}

export interface QuickActionsBarProps {
  /** Actions to display */
  actions?: QuickAction[];
  /** Called when an action is pressed */
  onActionPress?: (key: string) => void;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { key: 'settings', icon: 'settings-outline', label: 'Settings' },
  { key: 'notifications', icon: 'notifications-outline', label: 'Alerts' },
  { key: 'profile', icon: 'person-outline', label: 'Profile' },
  { key: 'export', icon: 'share-outline', label: 'Export' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ActionButtonProps {
  action: QuickAction;
  onPress: (key: string) => void;
  delay: number;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onPress, delay }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(action.key);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()}>
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.actionButton, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        testID={`action-${action.key}`}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name={action.icon} size={22} color={action.color || theme.colors.dust} />
        </View>
        <Animated.Text style={styles.actionLabel}>{action.label}</Animated.Text>
      </AnimatedTouchable>
    </Animated.View>
  );
};

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  actions = DEFAULT_ACTIONS,
  onActionPress,
  animationDelay = 600,
  testID,
}) => {
  const handlePress = useCallback(
    (key: string) => {
      onActionPress?.(key);
    },
    [onActionPress]
  );

  return (
    <View style={styles.container} testID={testID}>
      {actions.map((action, index) => (
        <ActionButton
          key={action.key}
          action={action}
          onPress={handlePress}
          delay={animationDelay + index * 60}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    fontWeight: theme.typography.fontWeights.medium,
  },
});
