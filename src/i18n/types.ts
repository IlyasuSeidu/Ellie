import type common from './locales/en/common.json';
import type onboarding from './locales/en/onboarding.json';
import type dashboard from './locales/en/dashboard.json';
import type profile from './locales/en/profile.json';
import type schedule from './locales/en/schedule.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      onboarding: typeof onboarding;
      dashboard: typeof dashboard;
      profile: typeof profile;
      schedule: typeof schedule;
    };
  }
}
