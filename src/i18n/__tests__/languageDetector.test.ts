import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {
  LANGUAGE_KEY,
  RETIRED_LANGUAGE_PREFERENCE_KEY,
  languageDetector,
  normalizeLanguage,
} from '@/i18n/languageDetector';

describe('languageDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeLanguage', () => {
    it('always resolves to English', () => {
      expect(normalizeLanguage('en-US')).toBe('en');
      expect(normalizeLanguage('es-MX')).toBe('en');
      expect(normalizeLanguage('pt-PT')).toBe('en');
      expect(normalizeLanguage('fr-FR')).toBe('en');
      expect(normalizeLanguage('ar-SA')).toBe('en');
      expect(normalizeLanguage('de-DE')).toBe('en');
      expect(normalizeLanguage(undefined)).toBe('en');
    });
  });

  it('ignores saved language and uses English', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fr-FR');

    const detected = await new Promise<string>((resolve) => {
      languageDetector.detect((language) => {
        const value = Array.isArray(language) ? language[0] : language;
        resolve(value ?? 'en');
      });
    });

    expect(detected).toBe('en');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_KEY);
  });

  it('migrates the legacy saved language key to English', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce('es-MX');

    const detected = await new Promise<string>((resolve) => {
      languageDetector.detect((language) => {
        const value = Array.isArray(language) ? language[0] : language;
        resolve(value ?? 'en');
      });
    });

    expect(detected).toBe('en');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_KEY, 'en');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(RETIRED_LANGUAGE_PREFERENCE_KEY);
  });

  it('uses English when no saved value exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (Localization.getLocales as jest.Mock).mockReturnValue([
      {
        languageTag: 'ar-SA',
        languageCode: 'ar',
      },
    ]);

    const detected = await new Promise<string>((resolve) => {
      languageDetector.detect((language) => {
        const value = Array.isArray(language) ? language[0] : language;
        resolve(value ?? 'en');
      });
    });

    expect(detected).toBe('en');
  });

  it('caches English for any requested language', async () => {
    await languageDetector.cacheUserLanguage?.('fr-CA');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_KEY, 'en');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(RETIRED_LANGUAGE_PREFERENCE_KEY);
  });
});
