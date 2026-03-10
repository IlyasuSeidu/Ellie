import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';

import { languageDetector, normalizeLanguage } from './languageDetector';

import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enDashboard from './locales/en/dashboard.json';
import enProfile from './locales/en/profile.json';
import enSchedule from './locales/en/schedule.json';

import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import esDashboard from './locales/es/dashboard.json';
import esProfile from './locales/es/profile.json';
import esSchedule from './locales/es/schedule.json';

import ptBRCommon from './locales/pt-BR/common.json';
import ptBROnboarding from './locales/pt-BR/onboarding.json';
import ptBRDashboard from './locales/pt-BR/dashboard.json';
import ptBRProfile from './locales/pt-BR/profile.json';
import ptBRSchedule from './locales/pt-BR/schedule.json';

import frCommon from './locales/fr/common.json';
import frOnboarding from './locales/fr/onboarding.json';
import frDashboard from './locales/fr/dashboard.json';
import frProfile from './locales/fr/profile.json';
import frSchedule from './locales/fr/schedule.json';

import arCommon from './locales/ar/common.json';
import arOnboarding from './locales/ar/onboarding.json';
import arDashboard from './locales/ar/dashboard.json';
import arProfile from './locales/ar/profile.json';
import arSchedule from './locales/ar/schedule.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    dashboard: enDashboard,
    profile: enProfile,
    schedule: enSchedule,
  },
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    dashboard: esDashboard,
    profile: esProfile,
    schedule: esSchedule,
  },
  'pt-BR': {
    common: ptBRCommon,
    onboarding: ptBROnboarding,
    dashboard: ptBRDashboard,
    profile: ptBRProfile,
    schedule: ptBRSchedule,
  },
  fr: {
    common: frCommon,
    onboarding: frOnboarding,
    dashboard: frDashboard,
    profile: frProfile,
    schedule: frSchedule,
  },
  ar: {
    common: arCommon,
    onboarding: arOnboarding,
    dashboard: arDashboard,
    profile: arProfile,
    schedule: arSchedule,
  },
} as const;

const isTestEnv = process.env.NODE_ENV === 'test';

function syncDayjsLocale(language: string): void {
  const normalized = normalizeLanguage(language);

  if (normalized === 'pt-BR') {
    dayjs.locale('pt-br');
    return;
  }

  if (normalized === 'es') {
    dayjs.locale('es');
    return;
  }

  if (normalized === 'fr') {
    dayjs.locale('fr');
    return;
  }

  if (normalized === 'ar') {
    dayjs.locale('ar');
    return;
  }

  dayjs.locale('en');
}

if (!isTestEnv) {
  void i18n.use(languageDetector);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: isTestEnv ? 'en' : undefined,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'onboarding', 'dashboard', 'profile', 'schedule'],
  initImmediate: false,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
  returnNull: false,
});

i18n.on('initialized', () => {
  syncDayjsLocale(i18n.language);
});

i18n.on('languageChanged', (language) => {
  syncDayjsLocale(language);
});

if (i18n.isInitialized) {
  syncDayjsLocale(i18n.language);
}

export default i18n;
