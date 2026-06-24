import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSubscription } from '@/hooks/useSubscription';
import type { MainStackParamList } from '@/navigation/MainStackNavigator';
import { legalConfig } from '@/config/env';
import { userService } from '@/services/UserService';
import { ProfileQuickStartModal, type ProfileQuickStartValues } from './ProfileQuickStartModal';
import { logger } from '@/utils/logger';

const RYVRO = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.9)',
  panelSoft: 'rgba(8, 22, 31, 0.64)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  quiet: '#5f7484',
  line: 'rgba(191, 231, 255, 0.18)',
  lineStrong: 'rgba(191, 231, 255, 0.28)',
  error: '#ff8a80',
} as const;

type SettingsNavigation = NativeStackNavigationProp<MainStackParamList, 'Settings'>;

interface SettingsRow {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  testID?: string;
  badge?: string;
  tone?: 'normal' | 'danger';
}

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  rows: SettingsRow[];
}

function openUrl(url: string): void {
  void Linking.openURL(url);
}

const SettingsRowItem: React.FC<{ row: SettingsRow; isLast: boolean }> = ({ row, isLast }) => {
  const interactive = Boolean(row.onPress);
  const iconColor = row.tone === 'danger' ? RYVRO.error : RYVRO.cyan;
  const textColor = row.tone === 'danger' ? RYVRO.error : RYVRO.silver;

  return (
    <Pressable
      onPress={row.onPress}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : 'text'}
      accessibilityLabel={row.title}
      testID={row.testID}
      style={({ pressed }) => [
        styles.row,
        isLast && styles.rowLast,
        pressed && interactive && styles.rowPressed,
      ]}
    >
      <View style={[styles.rowIcon, row.tone === 'danger' && styles.rowIconDanger]}>
        <Ionicons name={row.icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: textColor }]}>{row.title}</Text>
          {row.badge ? <Text style={styles.rowBadge}>{row.badge}</Text> : null}
        </View>
        {row.subtitle ? <Text style={styles.rowSubtitle}>{row.subtitle}</Text> : null}
      </View>
      {interactive ? (
        <View style={styles.rowChevron}>
          <Ionicons name="chevron-forward" size={17} color={RYVRO.muted} />
        </View>
      ) : null}
    </Pressable>
  );
};

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, subtitle, rows }) => (
  <Animated.View entering={FadeInUp.duration(420)} style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    <View style={styles.sectionCard}>
      {rows.map((row, index) => (
        <SettingsRowItem key={row.title} row={row} isLast={index === rows.length - 1} />
      ))}
    </View>
  </Animated.View>
);

export const SimpleSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsNavigation>();
  const { user, signOut } = useAuth();
  const { data, updateDataAsync } = useOnboarding();
  const [isProfileEditorVisible, setIsProfileEditorVisible] = useState(false);
  const { isPro, openCustomerCenter, restorePurchases, canOpenCustomerCenter, isLoading } =
    useSubscription();

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Ask');
    }
  }, [navigation]);

  const startSimpleSetup = useCallback(() => {
    navigation.navigate('GuidedShiftChatSetup');
  }, [navigation]);

  const openFixMenu = useCallback(() => {
    if (!data.universalSchedule) {
      startSimpleSetup();
      return;
    }

    navigation.navigate('FixMenuSetup', { scheduleDraft: data.universalSchedule });
  }, [data.universalSchedule, navigation, startSimpleSetup]);

  const openPatternPreview = useCallback(() => {
    if (!data.universalSchedule) {
      startSimpleSetup();
      return;
    }

    navigation.navigate('SchedulePreviewSetup', { scheduleDraft: data.universalSchedule });
  }, [data.universalSchedule, navigation, startSimpleSetup]);

  const openShiftTimes = useCallback(() => {
    if (!data.universalSchedule) {
      startSimpleSetup();
      return;
    }

    navigation.navigate('ShiftTimesSetup', {
      scheduleDraft: data.universalSchedule,
      returnTo: 'SchedulePreviewSetup',
    });
  }, [data.universalSchedule, navigation, startSimpleSetup]);

  const openReminderSetup = useCallback(() => {
    if (!data.universalSchedule) {
      startSimpleSetup();
      return;
    }

    navigation.navigate('ReminderSetup', { scheduleDraft: data.universalSchedule });
  }, [data.universalSchedule, navigation, startSimpleSetup]);

  const openNotificationSettings = useCallback(() => {
    if (typeof Linking.openSettings === 'function') {
      void Linking.openSettings();
      return;
    }

    if (Platform.OS === 'ios') {
      openUrl('app-settings:');
    }
  }, []);

  const restorePurchase = useCallback(async () => {
    const result = await restorePurchases();
    if (result === 'success') {
      Alert.alert('Purchase restored', 'Ryvro Pro is active on this device.');
      return;
    }
    if (result === 'offline') {
      Alert.alert('You are offline', 'Connect to the internet, then try restore purchase again.');
      return;
    }
    Alert.alert('No purchase found', 'Ryvro could not find an active purchase to restore.');
  }, [restorePurchases]);

  const manageSubscription = useCallback(async () => {
    if (!canOpenCustomerCenter || isLoading) {
      Alert.alert('Subscription unavailable', 'Please try again in a moment.');
      return;
    }
    const result = await openCustomerCenter();
    if (result !== 'presented') {
      Alert.alert('Subscription unavailable', 'Please try again in a moment.');
    }
  }, [canOpenCustomerCenter, isLoading, openCustomerCenter]);

  const confirmSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Do you want to sign out of Ryvro?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  const openProfileEditor = useCallback(() => {
    setIsProfileEditorVisible(true);
  }, []);

  const closeProfileEditor = useCallback(() => {
    setIsProfileEditorVisible(false);
  }, []);

  const saveProfileDetails = useCallback(
    async (values: ProfileQuickStartValues) => {
      const nextData = {
        name: values.name,
        occupation: values.occupation,
        company: values.company,
        country: values.country,
      };

      await updateDataAsync(nextData);
      setIsProfileEditorVisible(false);

      if (user?.uid) {
        void userService
          .createOrSyncUserProfile(user.uid, { ...data, ...nextData }, user.email)
          .catch((error) => {
            logger.warn('Settings profile details saved locally but backend sync failed', {
              error: error instanceof Error ? error.message : String(error),
              userId: user.uid,
            });
          });
      }
    },
    [data, updateDataAsync, user?.email, user?.uid]
  );

  const displayName = data.name || user?.displayName || 'Name not set';
  const email = user?.email || 'Email not set';
  const occupation = data.occupation || 'Job title not set';
  const company = data.company || 'Company not set';
  const country = data.country || 'Country not set';
  const scheduleName = data.universalSchedule?.name || 'Shift pattern saved';
  const reminderStatus = data.universalSchedule?.shiftDefinitions.some(
    (definition) => definition.reminderProfile
  )
    ? 'On'
    : 'Off';

  return (
    <View style={styles.screen} testID="settings-screen">
      <LinearGradient
        colors={[RYVRO.ink, RYVRO.void, '#000204']}
        locations={[0, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} />
      <View style={styles.blueGlow} />
      <View style={styles.ringGlow} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + 18, 42), paddingBottom: insets.bottom + 96 },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back to Ryvro"
            testID="settings-back-button"
          >
            <Ionicons name="chevron-back" size={24} color={RYVRO.silver} />
          </TouchableOpacity>

          <View style={styles.topPill}>
            <View style={styles.liveDot} />
            <Text style={styles.topPillText}>Settings</Text>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
          <Text style={styles.title}>Make Ryvro yours.</Text>
          <Text style={styles.subtitle}>
            Keep your shift answers accurate, reminders calm, and account simple.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).duration(420)} style={styles.statusPanel}>
          <View style={styles.avatarShell}>
            <LinearGradient colors={[RYVRO.cyan, RYVRO.blue]} style={styles.avatarGradient}>
              <Ionicons name="person" size={28} color={RYVRO.void} />
            </LinearGradient>
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.statusEmail} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <View style={styles.proBadge}>
            <Ionicons name={isPro ? 'checkmark' : 'sparkles'} size={14} color={RYVRO.void} />
            <Text style={styles.proBadgeText}>{isPro ? 'Pro on' : 'Pro'}</Text>
          </View>
          <TouchableOpacity
            onPress={openProfileEditor}
            style={styles.editProfileButton}
            accessibilityRole="button"
            accessibilityLabel="Edit my details"
            testID="settings-edit-profile-card-button"
          >
            <Ionicons name="create-outline" size={18} color={RYVRO.cyan} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(110).duration(420)} style={styles.fixPanel}>
          <View style={styles.fixCopy}>
            <Text style={styles.fixTitle}>Need to fix your shift setup?</Text>
            <Text style={styles.fixSubtitle}>
              Change the pattern Ryvro uses before it answers your voice questions.
            </Text>
          </View>
          <Pressable
            onPress={openFixMenu}
            accessibilityRole="button"
            accessibilityLabel="Fix my schedule"
            testID="settings-fix-schedule"
            style={({ pressed }) => [styles.fixButton, pressed && styles.fixButtonPressed]}
          >
            <Text style={styles.fixButtonText}>Fix setup</Text>
            <Ionicons name="arrow-forward" size={18} color={RYVRO.void} />
          </Pressable>
        </Animated.View>

        <View style={styles.quickGrid}>
          <View style={styles.quickTile}>
            <Ionicons name="repeat" size={18} color={RYVRO.cyan} />
            <Text style={styles.quickLabel}>Pattern</Text>
            <Text style={styles.quickValue} numberOfLines={1}>
              {scheduleName}
            </Text>
          </View>
          <View style={styles.quickTile}>
            <Ionicons name="notifications" size={18} color={RYVRO.cyan} />
            <Text style={styles.quickLabel}>Reminders</Text>
            <Text style={styles.quickValue}>{reminderStatus}</Text>
          </View>
        </View>

        <SettingsSection
          title="Shift setup"
          subtitle="Use these when Ryvro gives an answer that does not match your real rota."
          rows={[
            {
              title: 'View my pattern',
              subtitle: scheduleName,
              icon: 'calendar-outline',
              onPress: openPatternPreview,
              testID: 'settings-view-pattern',
              badge: 'Saved',
            },
            {
              title: 'Shift times',
              subtitle: 'Check start and finish times in 12-hour format',
              icon: 'time-outline',
              onPress: openShiftTimes,
              testID: 'settings-shift-times',
            },
          ]}
        />

        <SettingsSection
          title="Reminders"
          subtitle="Keep reminders helpful, not noisy."
          rows={[
            {
              title: 'Before work',
              subtitle: 'Choose when Ryvro reminds you',
              icon: 'alarm-outline',
              onPress: openReminderSetup,
              badge: reminderStatus,
            },
            {
              title: 'Notifications',
              subtitle: 'Control phone notification permission',
              icon: 'phone-portrait-outline',
              onPress: openNotificationSettings,
            },
          ]}
        />

        <SettingsSection
          title="Ryvro Pro"
          subtitle="Subscription controls stay here, away from the voice screen."
          rows={[
            {
              title: 'Manage subscription',
              subtitle: 'Open your App Store subscription options',
              icon: 'card-outline',
              onPress: manageSubscription,
              testID: 'settings-manage-subscription',
              badge: isPro ? 'Active' : undefined,
            },
            {
              title: 'Restore purchase',
              subtitle: 'Use this after reinstalling Ryvro',
              icon: 'refresh-circle-outline',
              onPress: restorePurchase,
              testID: 'settings-restore-purchase',
            },
          ]}
        />

        <SettingsSection
          title="Account"
          rows={[
            {
              title: 'Edit my details',
              subtitle: 'Name, job title, company, and work country',
              icon: 'create-outline',
              onPress: openProfileEditor,
              testID: 'settings-edit-profile',
            },
            { title: 'Name', subtitle: displayName, icon: 'person-outline' },
            { title: 'Job title', subtitle: occupation, icon: 'briefcase-outline' },
            { title: 'Company', subtitle: company, icon: 'business-outline' },
            { title: 'Work country', subtitle: country, icon: 'flag-outline' },
            { title: 'Email', subtitle: email, icon: 'mail-outline' },
            {
              title: 'Sign out',
              subtitle: 'Leave this device signed out',
              icon: 'log-out-outline',
              onPress: confirmSignOut,
              testID: 'settings-sign-out',
              tone: 'danger',
            },
          ]}
        />

        <SettingsSection
          title="Help"
          rows={[
            {
              title: 'Contact support',
              subtitle: 'Get help with Ryvro',
              icon: 'help-buoy-outline',
              onPress: () => openUrl(legalConfig.supportUrl),
            },
            {
              title: 'Privacy',
              subtitle: 'How Ryvro handles your data',
              icon: 'shield-checkmark-outline',
              onPress: () => openUrl(legalConfig.privacyPolicyUrl),
            },
            {
              title: 'Terms',
              subtitle: 'Subscription and app usage terms',
              icon: 'document-text-outline',
              onPress: () => openUrl(legalConfig.termsOfServiceUrl),
            },
          ]}
        />
      </ScrollView>

      <ProfileQuickStartModal
        visible={isProfileEditorVisible}
        mode="edit"
        initialData={{
          name: data.name,
          occupation: data.occupation,
          company: data.company,
          country: data.country,
        }}
        onSave={saveProfileDetails}
        onDismiss={closeProfileEditor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: RYVRO.void,
  },
  cyanGlow: {
    position: 'absolute',
    top: -150,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    right: -210,
    top: 115,
    width: 430,
    height: 430,
    borderRadius: 215,
    backgroundColor: 'rgba(20, 124, 255, 0.17)',
  },
  ringGlow: {
    position: 'absolute',
    top: 178,
    left: 30,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    borderColor: 'rgba(32, 244, 220, 0.08)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
    borderColor: RYVRO.lineStrong,
  },
  topPill: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(32, 244, 220, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: RYVRO.cyan,
  },
  topPillText: {
    color: RYVRO.silver,
    fontSize: 15,
    fontWeight: '900',
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: RYVRO.silver,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: RYVRO.muted,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 330,
  },
  statusPanel: {
    minHeight: 92,
    borderRadius: 30,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: 'rgba(13, 34, 48, 0.78)',
    borderWidth: 1,
    borderColor: RYVRO.lineStrong,
    ...Platform.select({
      ios: {
        shadowColor: RYVRO.blue,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
      },
      android: {
        elevation: 7,
      },
    }),
  },
  avatarShell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
    backgroundColor: 'rgba(32, 244, 220, 0.15)',
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusName: {
    color: RYVRO.silver,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  statusEmail: {
    marginTop: 3,
    color: RYVRO.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  proBadge: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: RYVRO.cyan,
  },
  proBadgeText: {
    color: RYVRO.void,
    fontSize: 12,
    fontWeight: '900',
  },
  editProfileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  fixPanel: {
    marginTop: 18,
    borderRadius: 32,
    padding: 18,
    backgroundColor: 'rgba(8, 22, 31, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.28)',
  },
  fixCopy: {
    alignItems: 'center',
  },
  fixTitle: {
    color: RYVRO.silver,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  fixSubtitle: {
    marginTop: 12,
    color: RYVRO.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  fixButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RYVRO.cyan,
  },
  fixButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  fixButtonText: {
    color: RYVRO.void,
    fontSize: 17,
    fontWeight: '900',
  },
  quickGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  quickTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 26,
    padding: 16,
    backgroundColor: RYVRO.panelSoft,
    borderWidth: 1,
    borderColor: RYVRO.line,
  },
  quickLabel: {
    marginTop: 12,
    color: RYVRO.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  quickValue: {
    marginTop: 4,
    color: RYVRO.silver,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 10,
    alignItems: 'center',
  },
  sectionTitle: {
    color: RYVRO.silver,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: RYVRO.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 320,
  },
  sectionCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: RYVRO.panel,
    borderWidth: 1,
    borderColor: RYVRO.line,
  },
  row: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 231, 255, 0.1)',
  },
  rowPressed: {
    backgroundColor: 'rgba(32, 244, 220, 0.06)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.24)',
  },
  rowIconDanger: {
    backgroundColor: 'rgba(255, 138, 128, 0.1)',
    borderColor: 'rgba(255, 138, 128, 0.24)',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flexShrink: 1,
    color: RYVRO.silver,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  rowBadge: {
    overflow: 'hidden',
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: RYVRO.cyan,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  rowSubtitle: {
    marginTop: 4,
    color: RYVRO.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  rowChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.06)',
  },
});
