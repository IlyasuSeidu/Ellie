import i18n from '@/i18n';
import { normalizeLanguage } from '@/i18n/languageDetector';

const LOCALE_TAG_BY_LANGUAGE: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  fr: 'fr-FR',
  ar: 'ar',
  'zh-CN': 'zh-CN',
  ru: 'ru-RU',
  hi: 'hi-IN',
  af: 'af-ZA',
  zu: 'zu-ZA',
  id: 'id-ID',
};

export function getLocaleTag(language: string = i18n.language): string {
  const normalized = normalizeLanguage(language);
  return LOCALE_TAG_BY_LANGUAGE[normalized] ?? 'en-US';
}

export function formatLocalizedNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  language: string = i18n.language
): string {
  return new Intl.NumberFormat(getLocaleTag(language), options).format(value);
}

export function formatLocalizedDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  language: string = i18n.language
): string {
  return new Intl.DateTimeFormat(getLocaleTag(language), options).format(date);
}

export function formatLocalizedDateTime(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  language: string = i18n.language
): string {
  return new Intl.DateTimeFormat(getLocaleTag(language), options).format(date);
}

export function formatLocalizedTime(
  time24h: string,
  options?: Intl.DateTimeFormatOptions,
  language: string = i18n.language
): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time24h);
  if (!match) {
    return time24h;
  }

  const [, hours, minutes] = match;
  const date = new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes)));

  return date.toLocaleTimeString(getLocaleTag(language), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    ...options,
  });
}
