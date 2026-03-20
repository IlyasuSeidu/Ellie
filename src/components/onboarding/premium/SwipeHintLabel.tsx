import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

export type SwipeHintDirection = 'left' | 'right' | 'up';

interface SwipeHintLabelProps {
  direction: SwipeHintDirection;
  text: string;
  textStyle?: StyleProp<TextStyle>;
  iconColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

const DIRECTION_CONFIG: Record<
  SwipeHintDirection,
  { iconName: React.ComponentProps<typeof Ionicons>['name']; iconFirst: boolean }
> = {
  left: { iconName: 'arrow-back', iconFirst: true },
  right: { iconName: 'arrow-forward', iconFirst: false },
  up: { iconName: 'arrow-up', iconFirst: true },
};

export const SwipeHintLabel: React.FC<SwipeHintLabelProps> = ({
  direction,
  text,
  textStyle,
  iconColor = theme.colors.paper,
  iconSize = 14,
  style,
}) => {
  const { iconName, iconFirst } = DIRECTION_CONFIG[direction];

  const icon = <Ionicons name={iconName} size={iconSize} color={iconColor} />;

  return (
    <View style={[styles.container, style]}>
      {iconFirst ? icon : null}
      <Text style={textStyle}>{text}</Text>
      {iconFirst ? null : icon}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
