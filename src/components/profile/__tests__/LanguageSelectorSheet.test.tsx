import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LanguageSelectorSheet } from '../LanguageSelectorSheet';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('LanguageSelectorSheet', () => {
  it('shows all runtime language options including fr and ar', () => {
    const { getAllByText, getByText } = render(
      <LanguageSelectorSheet
        visible
        onClose={jest.fn()}
        currentLanguage="en"
        onSelect={jest.fn(async () => undefined)}
      />
    );

    expect(getAllByText('English').length).toBeGreaterThan(0);
    expect(getByText('Spanish')).toBeTruthy();
    expect(getByText('Portuguese')).toBeTruthy();
    expect(getByText('French')).toBeTruthy();
    expect(getByText('Arabic')).toBeTruthy();
  });

  it('selects French', async () => {
    const onSelect = jest.fn(async () => undefined);
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <LanguageSelectorSheet visible onClose={onClose} currentLanguage="en" onSelect={onSelect} />
    );

    fireEvent.press(getByLabelText('French'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('fr');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('selects Arabic', async () => {
    const onSelect = jest.fn(async () => undefined);
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <LanguageSelectorSheet visible onClose={onClose} currentLanguage="en" onSelect={onSelect} />
    );

    fireEvent.press(getByLabelText('Arabic'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('ar');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
