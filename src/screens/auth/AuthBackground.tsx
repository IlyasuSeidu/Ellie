import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { RYVRO_AUTH_COLORS } from './authStyles';

export const AuthBackground: React.FC = () => {
  const orbitRotation = useSharedValue(0);

  React.useEffect(() => {
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [orbitRotation]);

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  return (
    <>
      <LinearGradient
        colors={[RYVRO_AUTH_COLORS.ink, RYVRO_AUTH_COLORS.void, '#000204']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.cyanGlow} pointerEvents="none" />
      <View style={styles.blueGlow} pointerEvents="none" />
      <View style={styles.deepBlueGlow} pointerEvents="none" />
      <Animated.View style={[styles.orbit, orbitAnimatedStyle]} pointerEvents="none" />
    </>
  );
};

const styles = StyleSheet.create({
  cyanGlow: {
    position: 'absolute',
    top: -96,
    left: -98,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    top: 118,
    right: -128,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(20, 124, 255, 0.15)',
  },
  deepBlueGlow: {
    position: 'absolute',
    bottom: 10,
    left: -104,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(20, 124, 255, 0.1)',
  },
  orbit: {
    position: 'absolute',
    top: 170,
    alignSelf: 'center',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.12)',
    borderRightColor: 'rgba(20, 124, 255, 0.32)',
  },
});
