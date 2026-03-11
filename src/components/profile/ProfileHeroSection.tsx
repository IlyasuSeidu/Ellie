/**
 * ProfileHeroSection Component
 *
 * Large centered avatar with pulsing gold glow, user name/occupation/company/country,
 * animated entrance, and edit button. Avatar supports tap bounce, long-press for
 * photo picker, and camera badge for discoverability.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Image, Alert, Pressable, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  FadeInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { avatarService } from '@/services/AvatarService';

interface ProfileHeroSectionProps {
  name: string;
  occupation?: string;
  company?: string;
  country?: string;
  avatarUri?: string;
  isEditing: boolean;
  onAvatarChange: (uri: string | null) => void;
  onEditPress: () => void;
  animationDelay?: number;
}

const AVATAR_SIZE = 90;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const ProfileHeroSection: React.FC<ProfileHeroSectionProps> = ({
  name,
  occupation,
  company,
  country,
  avatarUri,
  isEditing,
  onAvatarChange,
  onEditPress,
  animationDelay = 0,
}) => {
  const { t } = useTranslation(['common', 'profile']);
  const initials = useMemo(() => getInitials(name), [name]);

  // ── Entrance animation ─────────────────────────────────────────
  const avatarScale = useSharedValue(0.3);
  const avatarOpacity = useSharedValue(0);

  useEffect(() => {
    const D = animationDelay;
    avatarScale.value = withDelay(D, withSpring(1, { damping: 14, stiffness: 200 }));
    avatarOpacity.value = withDelay(D, withTiming(1, { duration: 400 }));
  }, [animationDelay, avatarScale, avatarOpacity]);

  // ── Float animation ────────────────────────────────────────────
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(withTiming(-4, { duration: 2500 }), withTiming(0, { duration: 2500 })),
      -1,
      true
    );
  }, [floatY]);

  // ── Glow pulse ─────────────────────────────────────────────────
  const glowOpacity = useSharedValue(0.15);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 1400 }), withTiming(0.15, { duration: 1400 })),
      -1,
      true
    );
  }, [glowOpacity]);

  // ── Ring scale pulse ───────────────────────────────────────────
  const ringScale = useSharedValue(1.0);
  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1800 }), withTiming(1.0, { duration: 1800 })),
      -1,
      true
    );
  }, [ringScale]);

  // ── Interactive gestures ───────────────────────────────────────
  const avatarTapScale = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const showAvatarActionSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const buttons: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }> = [
      {
        text: t('avatar.chooseFromLibrary', { defaultValue: 'Choose from Library' }),
        onPress: async () => {
          const uri = await avatarService.pickFromLibrary();
          if (uri) onAvatarChange(uri);
        },
      },
      {
        text: t('avatar.takePhoto', { defaultValue: 'Take Photo' }),
        onPress: async () => {
          const uri = await avatarService.pickFromCamera();
          if (uri) onAvatarChange(uri);
        },
      },
    ];

    if (avatarUri) {
      buttons.push({
        text: t('avatar.removePhoto', { defaultValue: 'Remove Photo' }),
        style: 'destructive',
        onPress: async () => {
          await avatarService.deleteAvatar(avatarUri);
          onAvatarChange(null);
        },
      });
    }

    buttons.push({ text: t('buttons.cancel', { defaultValue: 'Cancel' }), style: 'cancel' });
    Alert.alert(
      t('avatar.title', { defaultValue: 'Profile Photo' }),
      t('avatar.message', { defaultValue: 'Choose your avatar' }),
      buttons
    );
  }, [avatarUri, onAvatarChange, t]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      avatarTapScale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      avatarTapScale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 })
      );
      runOnJS(triggerHaptic)();
    })
    .onFinalize(() => {
      avatarTapScale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onEnd(() => {
      runOnJS(showAvatarActionSheet)();
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // ── Animated styles ────────────────────────────────────────────
  const avatarEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
    opacity: avatarOpacity.value,
  }));

  const avatarFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const avatarInteractionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarTapScale.value }],
  }));

  const glowPulseStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  // ── Edit button animation ──────────────────────────────────────
  const editScale = useSharedValue(1);

  const handleEditPress = useCallback(() => {
    editScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1.0, { damping: 12, stiffness: 300 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEditPress();
  }, [onEditPress, editScale]);

  const editButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editScale.value }],
  }));

  const D = animationDelay;

  return (
    <View style={styles.container}>
      {/* Edit button (top-right) */}
      <Animated.View
        entering={FadeInUp.delay(D + 500).duration(400)}
        style={styles.editButtonWrapper}
      >
        <Animated.View style={editButtonStyle}>
          <Pressable
            onPress={handleEditPress}
            style={[styles.editButton, isEditing && styles.editButtonActive]}
            hitSlop={8}
          >
            <Ionicons
              name={isEditing ? 'checkmark-circle' : 'create-outline'}
              size={20}
              color={isEditing ? theme.colors.sacredGold : theme.colors.dust}
            />
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Avatar */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.avatarOuter, avatarEntranceStyle, avatarFloatStyle]}>
          <Animated.View style={[styles.avatarGlowRing, glowPulseStyle]} />
          <Animated.View style={[styles.avatarOuterRing, ringPulseStyle]} />

          <Animated.View style={[styles.avatar, avatarInteractionStyle]}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => onAvatarChange(null)}
              />
            ) : (
              <Animated.Text style={styles.avatarText}>{initials}</Animated.Text>
            )}
          </Animated.View>

          <Pressable style={styles.cameraBadge} onPress={showAvatarActionSheet} hitSlop={8}>
            <Ionicons name="camera" size={12} color={theme.colors.paper} />
          </Pressable>
        </Animated.View>
      </GestureDetector>

      {/* User info text */}
      <Animated.Text
        entering={FadeInUp.delay(D + 150).duration(400)}
        style={styles.nameText}
        numberOfLines={1}
      >
        {name?.trim() ? name : t('fields.notSet', { ns: 'profile', defaultValue: 'Not set' })}
      </Animated.Text>

      {occupation ? (
        <Animated.Text
          entering={FadeInUp.delay(D + 300).duration(400)}
          style={styles.occupationText}
          numberOfLines={1}
        >
          {occupation}
        </Animated.Text>
      ) : null}

      {company || country ? (
        <Animated.View entering={FadeInUp.delay(D + 450).duration(400)} style={styles.metaRow}>
          {company ? (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={13} color={theme.colors.shadow} />
              <Animated.Text style={styles.metaText} numberOfLines={1}>
                {company}
              </Animated.Text>
            </View>
          ) : null}
          {company && country ? <Animated.Text style={styles.metaDot}> · </Animated.Text> : null}
          {country ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={theme.colors.shadow} />
              <Animated.Text style={styles.metaText} numberOfLines={1}>
                {country}
              </Animated.Text>
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    position: 'relative',
  },

  // Edit button
  editButtonWrapper: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 10,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  editButtonActive: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
  },

  // Avatar
  avatarOuter: {
    position: 'relative',
    width: AVATAR_SIZE + 20,
    height: AVATAR_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    backgroundColor: theme.colors.softStone,
    borderWidth: 3,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  avatarImage: {
    width: AVATAR_SIZE - 6,
    height: AVATAR_SIZE - 6,
    borderRadius: AVATAR_RADIUS,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.darkStone,
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarGlowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: (AVATAR_SIZE + 20) / 2,
    backgroundColor: theme.colors.sacredGold,
    zIndex: 0,
  },
  avatarOuterRing: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: (AVATAR_SIZE + 14) / 2,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    zIndex: 1,
  },

  // Text
  nameText: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: 4,
  },
  occupationText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
  },
  metaDot: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
  },
});
