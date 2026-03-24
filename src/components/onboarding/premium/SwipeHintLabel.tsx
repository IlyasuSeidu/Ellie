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
  iconColor,
  iconSize = 14,
  style,
}) => {
  const { iconName, iconFirst } = DIRECTION_CONFIG[direction];
  const resolvedTextColor = StyleSheet.flatten(textStyle)?.color;
  const resolvedIconColor = iconColor ?? resolvedTextColor ?? theme.colors.paper;

  const icon = <Ionicons name={iconName} size={iconSize} color={resolvedIconColor} />;

  return (
    <View style={[styles.container, style]}>
      {iconFirst ? icon : null}
      <Text
        style={[styles.text, textStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {text}
      </Text>
      {iconFirst ? null : icon}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    gap: 6,
  },
  text: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
