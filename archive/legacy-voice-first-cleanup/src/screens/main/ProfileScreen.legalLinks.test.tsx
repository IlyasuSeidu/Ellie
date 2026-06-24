import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ProfileScreen } from '../ProfileScreen';

const mockOpenPaywall = jest.fn();
const mockOpenCustomerCenter = jest.fn();
const mockSetLanguage = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');

  return {
    __esModule: true,
    default: {
      ScrollView: RN.ScrollView,
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (component: unknown) => component,
    },
    ScrollView: RN.ScrollView,
    View: RN.View,
    Text: RN.Text,
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ getParent: () => undefined }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/config/env', () => ({
  legalConfig: {
    supportUrl: 'https://getryvro.com/support',
    accountDeletionUrl: 'https://getryvro.com/delete-account',
    privacyPolicyUrl: 'https://getryvro.com/privacy',
    termsOfServiceUrl: 'https://getryvro.com/terms',
  },
}));

jest.mock('@/hooks/useProfileData', () => ({
  useProfileData: () => ({
    data: {
      name: 'Amina',
      occupation: 'Nurse',
      company: 'Ryvro',
      country: 'GH',
      universalSchedule: null,
    },
    isEditing: false,
    isSaving: false,
    editedFields: {},
    startEditing: jest.fn(),
    saveChanges: jest.fn(),
    cancelEditing: jest.fn(),
    updateField: jest.fn(),
    updateDataAsync: jest.fn(),
    handleAvatarChange: jest.fn(),
  }),
}));

jest.mock('@/hooks/useShiftAccent', () => ({
  useShiftAccent: () => ({
    liveShiftType: 'day',
    shiftType: 'day',
    tabAccentColor: '#2563eb',
  }),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: false,
    isLoading: false,
    openPaywall: mockOpenPaywall,
    openCustomerCenter: mockOpenCustomerCenter,
    canOpenCustomerCenter: false,
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
  }),
}));

jest.mock('@/components/profile/ProfileHeroSection', () => ({
  ProfileHeroSection: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Profile hero');
  },
}));

jest.mock('@/components/profile/ProfileSectionHeader', () => ({
  ProfileSectionHeader: ({ title }: { title: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, title);
  },
}));

jest.mock('@/components/profile/ProfileEditForm', () => ({
  ProfileEditForm: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Profile edit form');
  },
}));

jest.mock('@/components/profile/ShiftSettingsPanel', () => ({
  ShiftSettingsPanel: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Shift settings panel');
  },
}));

jest.mock('@/components/profile/WorkStatsSummary', () => ({
  WorkStatsSummary: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Work stats summary');
  },
}));

jest.mock('@/components/profile/SmartRemindersPanel', () => ({
  SmartRemindersPanel: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Smart reminders panel');
  },
}));

jest.mock('@/components/profile/LanguageSelectorSheet', () => ({
  LANGUAGE_NAMES: { en: 'English' },
  LanguageSelectorSheet: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'language-selector-sheet' });
  },
}));

describe('ProfileScreen legal and support links', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the configured launch support, account deletion, privacy, and terms URLs', () => {
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('profile-support-link'));
    fireEvent.press(getByTestId('profile-account-deletion-link'));
    fireEvent.press(getByTestId('profile-privacy-link'));
    fireEvent.press(getByTestId('profile-terms-link'));

    expect(Linking.openURL).toHaveBeenNthCalledWith(1, 'https://getryvro.com/support');
    expect(Linking.openURL).toHaveBeenNthCalledWith(2, 'https://getryvro.com/delete-account');
    expect(Linking.openURL).toHaveBeenNthCalledWith(3, 'https://getryvro.com/privacy');
    expect(Linking.openURL).toHaveBeenNthCalledWith(4, 'https://getryvro.com/terms');
  });
});
