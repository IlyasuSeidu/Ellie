import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfileEditForm } from '../ProfileEditForm';

const modalState: { lastProps: Record<string, unknown> | null } = { lastProps: null };

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (component: unknown) => component,
    },
    FadeInUp: {
      delay: () => ({ duration: () => undefined }),
    },
    useAnimatedStyle: () => ({}),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
    withSequence: (...values: number[]) => values[values.length - 1],
  };
});

jest.mock('@/components/onboarding/premium/PremiumTextInput', () => ({
  PremiumTextInput: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
  }) => {
    const React = require('react');
    const { TextInput } = require('react-native');
    return React.createElement(TextInput, {
      accessibilityLabel: label,
      value,
      onChangeText,
    });
  },
}));

jest.mock('@/components/onboarding/premium/PremiumButton', () => ({
  PremiumButton: ({
    title,
    onPress,
    disabled,
  }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
  }) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      {
        accessibilityRole: 'button',
        accessibilityLabel: title,
        disabled,
        onPress,
      },
      React.createElement(Text, null, title)
    );
  },
}));

jest.mock('@/components/onboarding/premium/PremiumCountrySelectorModal', () => ({
  PremiumCountrySelectorModal: (props: Record<string, unknown>) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    modalState.lastProps = props;
    if (!props.visible) {
      return null;
    }

    return React.createElement(
      TouchableOpacity,
      {
        testID: 'mock-country-select',
        onPress: () =>
          (props.onSelect as (...args: unknown[]) => void)({
            code: 'GH',
            name: 'Ghana',
            flag: '🇬🇭',
          }),
      },
      React.createElement(Text, null, 'Select Ghana')
    );
  },
}));

describe('ProfileEditForm', () => {
  beforeEach(() => {
    modalState.lastProps = null;
  });

  it('maps a stored country name back to its stable country code for the selector', () => {
    render(
      <ProfileEditForm
        name="Ilyasu"
        occupation="Miner"
        company="Ellie"
        country="Australia"
        isEditing
        onFieldChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(modalState.lastProps?.selectedCountry).toEqual(
      expect.objectContaining({ code: 'AU', name: 'Australia' })
    );
  });

  it('stores the selected country code instead of the localized country label', () => {
    const onFieldChange = jest.fn();
    const { getByText, getByTestId } = render(
      <ProfileEditForm
        name="Ilyasu"
        occupation="Miner"
        company="Ellie"
        country="AU"
        isEditing
        onFieldChange={onFieldChange}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByText('Australia'));
    fireEvent.press(getByTestId('mock-country-select'));

    expect(onFieldChange).toHaveBeenCalledWith('country', 'GH');
  });

  it('invokes save immediately when the save button is pressed', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ProfileEditForm
        name="Ilyasu"
        occupation="Miner"
        company="Ellie"
        country="AU"
        isEditing
        onFieldChange={jest.fn()}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByText('Save Changes'));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows a localized country label when given a stored country code', () => {
    const { getByText } = render(
      <ProfileEditForm
        name="Ilyasu"
        occupation="Miner"
        company="Ellie"
        country="AU"
        isEditing={false}
        onFieldChange={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Australia')).toBeTruthy();
  });
});
