import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LanguageSelectorSheet } from '../LanguageSelectorSheet';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      (options?.defaultValue as string | undefined) ?? key,
  }),
}));

describe('LanguageSelectorSheet', () => {
  it('shows all runtime language options', () => {
    const { getAllByText, getByText } = render(
      <LanguageSelectorSheet
        visible
        onClose={jest.fn()}
        currentLanguage="en"
        onSelect={jest.fn(async () => undefined)}
      />
    );

    expect(getAllByText('English').length).toBeGreaterThan(0);
    expect(getByText('Español')).toBeTruthy();
    expect(getByText('Português (Brasil)')).toBeTruthy();
    expect(getByText('Français')).toBeTruthy();
    expect(getByText('العربية')).toBeTruthy();
    expect(getByText('中文')).toBeTruthy();
    expect(getByText('Русский')).toBeTruthy();
    expect(getByText('हिन्दी')).toBeTruthy();
    expect(getByText('Afrikaans')).toBeTruthy();
    expect(getByText('isiZulu')).toBeTruthy();
    expect(getByText('Bahasa Indonesia')).toBeTruthy();
  });

  it('selects French', async () => {
    const onSelect = jest.fn(async () => undefined);
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <LanguageSelectorSheet visible onClose={onClose} currentLanguage="en" onSelect={onSelect} />
    );

    fireEvent.press(getByLabelText('Français'));

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

    fireEvent.press(getByLabelText('العربية'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('ar');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows clear error when language change fails', async () => {
    const onSelect = jest.fn(async () => {
      throw new Error('Network error');
    });
    const onClose = jest.fn();

    const { getByLabelText, getByText } = render(
      <LanguageSelectorSheet visible onClose={onClose} currentLanguage="en" onSelect={onSelect} />
    );

    fireEvent.press(getByLabelText('Français'));

    await waitFor(() => {
      expect(getByText(/network error/i)).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
