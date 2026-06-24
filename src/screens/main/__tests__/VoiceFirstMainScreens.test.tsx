import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SimpleSettingsScreen } from '../SimpleSettingsScreen';
import { VoiceAssistantScreen } from '../VoiceAssistantScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockUseRoute = jest.fn(() => ({ params: {} }));
const mockUseOnboarding = jest.fn();
const mockUseAuth = jest.fn();
const mockUseSubscription = jest.fn();
const mockUseVoiceAssistant = jest.fn();
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockCreateOrSyncUserProfile = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => mockUseVoiceAssistant(),
}));

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: (...args: unknown[]) => mockStorageGet(...args),
    set: (...args: unknown[]) => mockStorageSet(...args),
  },
}));

jest.mock('@/services/UserService', () => ({
  userService: {
    createOrSyncUserProfile: (...args: unknown[]) => mockCreateOrSyncUserProfile(...args),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ status: 'online' }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    Ionicons: ({ name, color, ...rest }: { name: string; color: string }) =>
      React.createElement(RN.Text, { ...rest, testID: `icon-${name}`, style: { color } }),
  };
});

const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Two days, two nights, four off',
  timezone: 'Africa/Accra',
  anchorDate: '2026-06-22',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      durationMinutes: 720,
      crossesMidnight: false,
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#20f4dc',
      icon: 'sunny',
    },
    {
      id: 'night',
      name: 'Night shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '19:00',
      endTime: '07:00',
      durationMinutes: 720,
      crossesMidnight: true,
      countsAsWork: true,
      countsAsNight: true,
      countsForStats: true,
      color: '#147cff',
      icon: 'moon',
    },
    {
      id: 'off',
      name: 'Off',
      kind: 'off',
      timePolicy: 'none',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#5f7484',
      icon: 'home',
    },
  ],
  sequence: [
    { id: '1', shiftDefinitionId: 'day' },
    { id: '2', shiftDefinitionId: 'day' },
    { id: '3', shiftDefinitionId: 'night' },
    { id: '4', shiftDefinitionId: 'night' },
    { id: '5', shiftDefinitionId: 'off' },
    { id: '6', shiftDefinitionId: 'off' },
    { id: '7', shiftDefinitionId: 'off' },
    { id: '8', shiftDefinitionId: 'off' },
  ],
};

describe('voice-first main screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-22T08:00:00'));
    mockStorageGet.mockResolvedValue(Date.now());
    mockStorageSet.mockResolvedValue(undefined);
    mockCreateOrSyncUserProfile.mockResolvedValue(undefined);
    mockUseOnboarding.mockReturnValue({
      data: {
        name: 'Ilyasu Seidu',
        occupation: 'Security officer',
        company: 'Ryvro Works',
        country: 'US',
        universalSchedule: schedule,
      },
      hydrated: true,
      updateDataAsync: jest.fn(async () => undefined),
    });
    mockUseAuth.mockReturnValue({
      user: { uid: 'user-123', displayName: 'Ilyasu Seidu', email: 'ilyasu@example.com' },
      signOut: jest.fn(),
    });
    mockUseSubscription.mockReturnValue({
      isPro: false,
      isLoading: false,
      canOpenCustomerCenter: true,
      openCustomerCenter: jest.fn(async () => 'presented'),
      restorePurchases: jest.fn(async () => 'success'),
    });
    mockUseVoiceAssistant.mockReturnValue({
      state: 'idle',
      messages: [],
      error: null,
      notice: null,
      hasPermission: true,
      isWakeWordEnabled: false,
      isWakeWordAvailable: false,
      isWakeWordListening: false,
      wakeWordPhrase: 'Hey Ryvro',
      wakeWordWarning: null,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      cancel: jest.fn(),
      requestPermissions: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders Ask as the only main screen with a settings icon', () => {
    const { getByText, getByLabelText, queryByText } = render(<VoiceAssistantScreen />);

    expect(getByText('Ryvro')).toBeTruthy();
    expect(getByText('Voice shift assistant')).toBeTruthy();
    expect(getByText('Ask about your shift.')).toBeTruthy();
    expect(getByText('What shift am I on today?')).toBeTruthy();
    expect(getByText('Am I working next Saturday?')).toBeTruthy();
    expect(getByLabelText('Open settings')).toBeTruthy();
    expect(queryByText('Type')).toBeNull();
    expect(queryByText('Send')).toBeNull();

    fireEvent.press(getByLabelText('Open settings'));
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });

  it('shows the profile prompt once for first-time users and saves details', async () => {
    const updateDataAsync = jest.fn(async () => undefined);
    mockStorageGet.mockResolvedValueOnce(null);
    mockUseOnboarding.mockReturnValue({
      data: { universalSchedule: schedule },
      hydrated: true,
      updateDataAsync,
    });

    const { findByText, getByTestId } = render(<VoiceAssistantScreen />);

    expect(await findByText('Let Ryvro speak to you by name.')).toBeTruthy();

    fireEvent.changeText(getByTestId('profile-name-input'), 'Ama Mensah');
    fireEvent.changeText(getByTestId('profile-job-input'), 'Nurse');
    fireEvent.changeText(getByTestId('profile-company-input'), 'City Hospital');
    fireEvent.press(getByTestId('profile-country-GB'));
    fireEvent.press(getByTestId('profile-save-button'));

    await waitFor(() => {
      expect(updateDataAsync).toHaveBeenCalledWith({
        name: 'Ama Mensah',
        occupation: 'Nurse',
        company: 'City Hospital',
        country: 'GB',
      });
    });
    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.stringContaining('profile:promptCompletedAt:user-123'),
      expect.any(Number)
    );
    await waitFor(() => {
      expect(mockCreateOrSyncUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'Ama Mensah',
          occupation: 'Nurse',
          company: 'City Hospital',
          country: 'GB',
        }),
        'ilyasu@example.com'
      );
    });
  });

  it('renders simple Settings sections', () => {
    const { getByText, getByLabelText, queryByText } = render(<SimpleSettingsScreen />);

    expect(getByLabelText('Go back to Ryvro')).toBeTruthy();
    expect(getByText('Make Ryvro yours.')).toBeTruthy();
    expect(getByText('Need to fix your shift setup?')).toBeTruthy();
    expect(getByLabelText('Fix my schedule')).toBeTruthy();
    expect(getByText('Shift setup')).toBeTruthy();
    expect(getByText('Shift times')).toBeTruthy();
    expect(queryByText('Advanced schedule editor')).toBeNull();
    expect(getByText('Ryvro Pro')).toBeTruthy();
    expect(getByText('Restore purchase')).toBeTruthy();
    expect(getByText('Help')).toBeTruthy();
    expect(getByText('Edit my details')).toBeTruthy();
    expect(getByText('Job title')).toBeTruthy();
    expect(getByText('Security officer')).toBeTruthy();
    expect(getByText('Company')).toBeTruthy();
    expect(getByText('Ryvro Works')).toBeTruthy();
    expect(getByText('Work country')).toBeTruthy();
    expect(getByText('US')).toBeTruthy();
  });

  it('keeps the profile prompt open and shows an error if database sync fails', async () => {
    const updateDataAsync = jest.fn(async () => undefined);
    mockStorageGet.mockResolvedValueOnce(null);
    mockCreateOrSyncUserProfile.mockRejectedValueOnce(new Error('permission denied'));
    mockUseOnboarding.mockReturnValue({
      data: { universalSchedule: schedule },
      hydrated: true,
      updateDataAsync,
    });

    const { findByText, getByTestId, queryByTestId } = render(<VoiceAssistantScreen />);

    expect(await findByText('Let Ryvro speak to you by name.')).toBeTruthy();

    fireEvent.changeText(getByTestId('profile-name-input'), 'Ama Mensah');
    fireEvent.changeText(getByTestId('profile-job-input'), 'Nurse');
    fireEvent.changeText(getByTestId('profile-company-input'), 'City Hospital');
    fireEvent.press(getByTestId('profile-country-GB'));
    fireEvent.press(getByTestId('profile-save-button'));

    expect(
      await findByText('Ryvro could not save your details. Check your connection and try again.')
    ).toBeTruthy();
    expect(queryByTestId('profile-save-error')).toBeTruthy();
    expect(mockStorageSet).not.toHaveBeenCalledWith(
      expect.stringContaining('profile:promptCompletedAt:user-123'),
      expect.any(Number)
    );
  });

  it('routes Settings schedule actions to the simple repair flow, not the complex builder', () => {
    const { getByTestId } = render(<SimpleSettingsScreen />);

    fireEvent.press(getByTestId('settings-fix-schedule'));
    expect(mockNavigate).toHaveBeenLastCalledWith('FixMenuSetup', { scheduleDraft: schedule });

    fireEvent.press(getByTestId('settings-view-pattern'));
    expect(mockNavigate).toHaveBeenLastCalledWith('SchedulePreviewSetup', {
      scheduleDraft: schedule,
    });

    fireEvent.press(getByTestId('settings-shift-times'));
    expect(mockNavigate).toHaveBeenLastCalledWith('ShiftTimesSetup', {
      scheduleDraft: schedule,
      returnTo: 'SchedulePreviewSetup',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(3);
  });

  it('lets users edit profile details from Settings and syncs them to the backend', async () => {
    const updateDataAsync = jest.fn(async () => undefined);
    mockUseOnboarding.mockReturnValue({
      data: {
        name: 'Ilyasu Seidu',
        occupation: 'Security officer',
        company: 'Ryvro Works',
        country: 'US',
        universalSchedule: schedule,
      },
      hydrated: true,
      updateDataAsync,
    });

    const { getByTestId, findByText } = render(<SimpleSettingsScreen />);

    fireEvent.press(getByTestId('settings-edit-profile'));

    expect(await findByText('Edit how Ryvro knows you.')).toBeTruthy();

    fireEvent.changeText(getByTestId('profile-name-input'), 'Ama Mensah');
    fireEvent.changeText(getByTestId('profile-job-input'), 'Nurse');
    fireEvent.changeText(getByTestId('profile-company-input'), 'City Hospital');
    fireEvent.press(getByTestId('profile-country-GB'));
    fireEvent.press(getByTestId('profile-save-button'));

    await waitFor(() => {
      expect(updateDataAsync).toHaveBeenCalledWith({
        name: 'Ama Mensah',
        occupation: 'Nurse',
        company: 'City Hospital',
        country: 'GB',
      });
    });

    expect(mockCreateOrSyncUserProfile).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        name: 'Ama Mensah',
        occupation: 'Nurse',
        company: 'City Hospital',
        country: 'GB',
        universalSchedule: schedule,
      }),
      'ilyasu@example.com'
    );
  });

  it('does not leave Settings profile edits stuck on Saving when backend sync is slow', async () => {
    const updateDataAsync = jest.fn(async () => undefined);
    mockCreateOrSyncUserProfile.mockImplementationOnce(() => new Promise(() => undefined));
    mockUseOnboarding.mockReturnValue({
      data: {
        name: 'Ilyasu Seidu',
        occupation: 'Security officer',
        company: 'Ryvro Works',
        country: 'US',
        universalSchedule: schedule,
      },
      hydrated: true,
      updateDataAsync,
    });

    const { getByTestId, findByText, queryByText } = render(<SimpleSettingsScreen />);

    fireEvent.press(getByTestId('settings-edit-profile'));

    expect(await findByText('Edit how Ryvro knows you.')).toBeTruthy();

    fireEvent.changeText(getByTestId('profile-name-input'), 'Ama Mensah');
    fireEvent.changeText(getByTestId('profile-job-input'), 'Nurse');
    fireEvent.changeText(getByTestId('profile-company-input'), 'City Hospital');
    fireEvent.press(getByTestId('profile-country-GB'));
    fireEvent.press(getByTestId('profile-save-button'));

    await waitFor(() => {
      expect(updateDataAsync).toHaveBeenCalledWith({
        name: 'Ama Mensah',
        occupation: 'Nurse',
        company: 'City Hospital',
        country: 'GB',
      });
    });

    await waitFor(() => {
      expect(queryByText('Edit how Ryvro knows you.')).toBeNull();
    });
    expect(mockCreateOrSyncUserProfile).toHaveBeenCalled();
  });
});
