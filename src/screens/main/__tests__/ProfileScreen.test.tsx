import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from '../ProfileScreen';

const mockUseProfileData = jest.fn();
const mockUseIsFocused = jest.fn();
const mockReset = jest.fn();
const mockGetParent = jest.fn();
const mockSet = jest.fn();

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (component: unknown) => component,
    },
    View: RN.View,
    Text: RN.Text,
    ScrollView: RN.ScrollView,
  };
});

jest.mock('@/hooks/useProfileData', () => ({
  useProfileData: () => mockUseProfileData(),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockUseIsFocused(),
  useNavigation: () => ({
    getParent: mockGetParent,
  }),
}));

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    set: (...args: unknown[]) => mockSet(...args),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/profile/ProfileHeroSection', () => ({
  ProfileHeroSection: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.Text, { testID: 'profile-hero' }, 'Profile Hero');
  },
}));

jest.mock('@/components/profile/ProfileSectionHeader', () => ({
  ProfileSectionHeader: ({ title }: { title: string }) => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.Text, null, title);
  },
}));

jest.mock('@/components/profile/ProfileEditForm', () => ({
  ProfileEditForm: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.Text, { testID: 'profile-edit-form' }, 'Profile Edit Form');
  },
}));

jest.mock('@/components/profile/ShiftSettingsPanel', () => ({
  ShiftSettingsPanel: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(
      RN.Text,
      { testID: 'profile-shift-settings' },
      'Shift Settings Panel'
    );
  },
}));

jest.mock('@/components/profile/WorkStatsSummary', () => ({
  WorkStatsSummary: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.Text, { testID: 'profile-work-stats' }, 'Work Stats Summary');
  },
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParent.mockReturnValue({ reset: mockReset });
    mockSet.mockResolvedValue(undefined);
    mockUseIsFocused.mockReturnValue(true);
    mockUseProfileData.mockReturnValue({
      data: {
        name: 'Jane Doe',
        occupation: 'Operator',
        company: 'Ellie Mining',
        country: 'Australia',
        shiftSystem: '2-shift',
        rosterType: 'fifo',
      },
      shiftCycle: null,
      isEditing: false,
      editedFields: {},
      startEditing: jest.fn(),
      cancelEditing: jest.fn(),
      updateField: jest.fn(),
      saveChanges: jest.fn(),
      handleAvatarChange: jest.fn(),
      updateData: jest.fn(),
      patternDisplayName: '14/7 FIFO Roster',
      shiftSystemName: '2-Shift (12h)',
      rosterTypeName: 'FIFO',
      cycleLengthDays: 21,
      cycleLengthText: '21',
      workRestRatio: '2:1',
    });
  });

  it('renders profile sections and cards', () => {
    const { getByText, getByTestId } = render(<ProfileScreen />);

    expect(getByTestId('profile-hero')).toBeTruthy();
    expect(getByText('Personal Information')).toBeTruthy();
    expect(getByText('Work Overview')).toBeTruthy();
    expect(getByTestId('profile-edit-form')).toBeTruthy();
    expect(getByTestId('profile-shift-settings')).toBeTruthy();
    expect(getByTestId('profile-work-stats')).toBeTruthy();
    expect(getByTestId('run-onboarding-again-button')).toBeTruthy();
  });

  it('cancels edit mode when screen loses focus', () => {
    const cancelEditing = jest.fn();
    mockUseIsFocused.mockReturnValue(false);
    mockUseProfileData.mockReturnValue({
      data: {
        name: 'Jane Doe',
      },
      shiftCycle: null,
      isEditing: true,
      editedFields: { name: 'Jane' },
      startEditing: jest.fn(),
      cancelEditing,
      updateField: jest.fn(),
      saveChanges: jest.fn(),
      handleAvatarChange: jest.fn(),
      updateData: jest.fn(),
      patternDisplayName: 'Custom Rotation',
      shiftSystemName: '2-Shift (12h)',
      rosterTypeName: 'Rotating',
      cycleLengthDays: 12,
      cycleLengthText: '12',
      workRestRatio: '2:1',
    });

    render(<ProfileScreen />);
    expect(cancelEditing).toHaveBeenCalledTimes(1);
  });

  it('reopens onboarding flow from profile action', async () => {
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('run-onboarding-again-button'));

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith('onboarding:complete', false);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    });
  });
});
