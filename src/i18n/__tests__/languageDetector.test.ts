import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { LANGUAGE_KEY, languageDetector, normalizeLanguage } from '@/i18n/languageDetector';

describe('languageDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeLanguage', () => {
    it('normalizes supported locales and falls back to en', () => {
      expect(normalizeLanguage('en-US')).toBe('en');
      expect(normalizeLanguage('es-MX')).toBe('es');
      expect(normalizeLanguage('pt-PT')).toBe('pt-BR');
      expect(normalizeLanguage('fr-FR')).toBe('fr');
      expect(normalizeLanguage('ar-SA')).toBe('ar');
      expect(normalizeLanguage('de-DE')).toBe('en');
      expect(normalizeLanguage(undefined)).toBe('en');
    });
  });

  it('prefers saved language from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fr-FR');

    const detected = await new Promise<string>((resolve) => {
      languageDetector.detect((language) => {
        const value = Array.isArray(language) ? language[0] : language;
        resolve(value ?? 'en');
      });
    });

    expect(detected).toBe('fr');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(LANGUAGE_KEY);
  });

  it('falls back to device locale when no saved value exists', async () => {
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

    expect(detected).toBe('ar');
  });

  it('caches normalized language value', async () => {
    await languageDetector.cacheUserLanguage?.('fr-CA');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_KEY, 'fr');
  });
});
