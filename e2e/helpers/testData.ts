/**
 * E2E Test Data Fixtures
 *
 * Provides seeded state objects for different test scenarios.
 * Values are keyed by logical AsyncStorageService keys (without "app:" prefix).
 */

import { UNIVERSAL_SHIFT_TEMPLATES } from '../../src/constants/universalShiftTemplates';
import type { UniversalShiftSchedule } from '../../src/types';

function templateSchedule(templateId: string): UniversalShiftSchedule {
  const template = UNIVERSAL_SHIFT_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new Error(`Missing E2E universal shift template: ${templateId}`);
  }

  return template.schedule;
}

/** Minimal mock user that satisfies the auth bypass check in AuthContext */
export const MOCK_USER = {
  uid: 'e2e-test-uid-001',
  email: 'e2e@test.ryvro',
  emailVerified: true,
  providerData: [],
  displayName: 'E2E Tester',
};

/** Completed onboarding data for the default universal shift-worker path. */
export const MOCK_ONBOARDING_DATA = {
  name: 'E2E Tester',
  occupation: 'Shift Operator',
  company: 'Universal Shift Co.',
  country: 'Australia',
  shiftSystem: '2-shift',
  rosterType: 'rotating',
  patternType: 'STANDARD_4_4_4',
  phaseOffset: 0,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  shiftTimes: {
    dayShift: { hour: 6, minute: 0 },
    nightShift: { hour: 18, minute: 0 },
  },
  universalSchedule: templateSchedule('security-4-4'),
};

/** Miner/FIFO launch-wedge fixture kept as one industry example, not the default seed. */
export const MINING_FIFO_ONBOARDING_DATA = {
  name: 'Tariq',
  occupation: 'FIFO Site Operator',
  company: 'Pilbara Operations',
  country: 'Australia',
  shiftSystem: '2-shift',
  rosterType: 'fifo',
  patternType: 'FIFO_14_14',
  phaseOffset: 0,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  shiftTimes: {
    dayShift: { hour: 6, minute: 0 },
    nightShift: { hour: 18, minute: 0 },
  },
  universalSchedule: templateSchedule('mining-fifo-14-14'),
};

/** Non-mining proof fixture that keeps the universal foundation covered. */
export const NON_MINING_PROOF_ONBOARDING_DATA = {
  name: 'Amina',
  occupation: 'Nurse',
  company: 'City Hospital',
  country: 'Ghana',
  shiftSystem: '2-shift',
  rosterType: 'rotating',
  patternType: 'STANDARD_2_2_3',
  phaseOffset: 0,
  startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  shiftTimes: {
    dayShift: { hour: 7, minute: 0 },
    nightShift: { hour: 19, minute: 0 },
  },
  universalSchedule: templateSchedule('healthcare-2-2-3'),
};

export const UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES = {
  healthcare: {
    name: 'Amina',
    occupation: 'Nurse',
    company: 'City Hospital',
    country: 'Ghana',
    shiftSystem: '2-shift',
    rosterType: 'rotating',
    patternType: 'STANDARD_2_2_3',
    phaseOffset: 0,
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 7, minute: 0 },
      nightShift: { hour: 19, minute: 0 },
    },
    universalSchedule: templateSchedule('healthcare-2-2-3'),
  },
  security: {
    name: 'Kwame',
    occupation: 'Security Officer',
    company: 'Metro Guard Services',
    country: 'Ghana',
    shiftSystem: '2-shift',
    rosterType: 'rotating',
    patternType: 'STANDARD_4_4_4',
    phaseOffset: 1,
    startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 6, minute: 0 },
      nightShift: { hour: 18, minute: 0 },
    },
    universalSchedule: templateSchedule('security-4-4'),
  },
  emergencyServices: {
    name: 'Maya',
    occupation: 'Firefighter',
    company: 'City Fire Station',
    country: 'United States',
    shiftSystem: 'custom',
    rosterType: 'rotating',
    patternType: 'STANDARD_2_2_3',
    phaseOffset: 2,
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 8, minute: 0 },
      nightShift: { hour: 20, minute: 0 },
    },
    universalSchedule: templateSchedule('emergency-24-48'),
  },
  manufacturing: {
    name: 'Liam',
    occupation: 'Plant Operator',
    company: 'Northline Manufacturing',
    country: 'Canada',
    shiftSystem: '3-shift',
    rosterType: 'rotating',
    patternType: 'STANDARD_CONTINENTAL',
    phaseOffset: 0,
    startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 6, minute: 0 },
      nightShift: { hour: 22, minute: 0 },
    },
    universalSchedule: templateSchedule('manufacturing-continental'),
  },
  offshore: {
    name: 'Euan',
    occupation: 'Offshore Technician',
    company: 'North Sea Operations',
    country: 'United Kingdom',
    shiftSystem: '2-shift',
    rosterType: 'fifo',
    patternType: 'FIFO_14_14',
    phaseOffset: 0,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 6, minute: 0 },
      nightShift: { hour: 18, minute: 0 },
    },
    universalSchedule: templateSchedule('oil-gas-offshore-14-14'),
  },
  transport: {
    name: 'Sofia',
    occupation: 'Linehaul Driver',
    company: 'Metro Freight',
    country: 'United Kingdom',
    shiftSystem: '3-shift',
    rosterType: 'rotating',
    patternType: 'STANDARD_4_4_4',
    phaseOffset: 2,
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 5, minute: 0 },
      nightShift: { hour: 21, minute: 0 },
    },
    universalSchedule: templateSchedule('transport-early-late-night'),
  },
  warehouseLogistics: {
    name: 'Mateo',
    occupation: 'Warehouse Lead',
    company: 'Harbour Distribution',
    country: 'United States',
    shiftSystem: 'custom',
    rosterType: 'rotating',
    patternType: 'STANDARD_5_5_5',
    phaseOffset: 1,
    startDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 5, minute: 0 },
      nightShift: { hour: 17, minute: 0 },
    },
    universalSchedule: templateSchedule('warehouse-split-standby'),
  },
  hospitality: {
    name: 'Noah',
    occupation: 'Hotel Duty Manager',
    company: 'Harbour Hotel',
    country: 'Australia',
    shiftSystem: 'custom',
    rosterType: 'rotating',
    patternType: 'STANDARD_5_5_5',
    phaseOffset: 0,
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 7, minute: 0 },
      nightShift: { hour: 23, minute: 0 },
    },
    universalSchedule: templateSchedule('hospitality-5-2'),
  },
  aviation: {
    name: 'Priya',
    occupation: 'Airport Operations Coordinator',
    company: 'International Airport',
    country: 'India',
    shiftSystem: '3-shift',
    rosterType: 'rotating',
    patternType: 'STANDARD_4_4_4',
    phaseOffset: 3,
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 5, minute: 0 },
      nightShift: { hour: 21, minute: 0 },
    },
    universalSchedule: templateSchedule('aviation-early-late-night'),
  },
  rail: {
    name: 'Morgan',
    occupation: 'Rail Controller',
    company: 'Metro Rail Control',
    country: 'United Kingdom',
    shiftSystem: '2-shift',
    rosterType: 'rotating',
    patternType: 'STANDARD_4_4_4',
    phaseOffset: 1,
    startDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    shiftTimes: {
      dayShift: { hour: 7, minute: 0 },
      nightShift: { hour: 19, minute: 0 },
    },
    universalSchedule: templateSchedule('rail-control-4-4-4'),
  },
  miningFifo: MINING_FIFO_ONBOARDING_DATA,
};

/**
 * Storage seed for tests that start at the onboarding Welcome screen.
 * Auth is set but onboarding is NOT complete.
 */
export const ONBOARDING_START_SEED: Record<string, unknown> = {
  'e2e:mock_user': MOCK_USER,
  'i18n:language': 'en',
  'onboarding:complete': false,
  'onboarding:data': {},
};

/**
 * Storage seed for tests that need the full main app (dashboard/profile).
 * Auth and onboarding are both complete.
 */
export const MAIN_APP_SEED: Record<string, unknown> = {
  'e2e:mock_user': MOCK_USER,
  'i18n:language': 'en',
  'onboarding:complete': true,
  'onboarding:data': UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES.healthcare,
};

export const MINING_FIFO_MAIN_APP_SEED: Record<string, unknown> = {
  'e2e:mock_user': MOCK_USER,
  'i18n:language': 'en',
  'onboarding:complete': true,
  'onboarding:data': MINING_FIFO_ONBOARDING_DATA,
};

export const NON_MINING_PROOF_MAIN_APP_SEED: Record<string, unknown> = {
  'e2e:mock_user': {
    ...MOCK_USER,
    uid: 'e2e-nurse-uid-001',
    displayName: 'Amina',
  },
  'i18n:language': 'en',
  'onboarding:complete': true,
  'onboarding:data': NON_MINING_PROOF_ONBOARDING_DATA,
};
