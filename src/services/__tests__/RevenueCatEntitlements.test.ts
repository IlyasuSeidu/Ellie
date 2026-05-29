import type { CustomerInfo } from 'react-native-purchases';

const makeCustomerInfo = (activeEntitlementIds: string[]): CustomerInfo =>
  ({
    entitlements: {
      active: Object.fromEntries(activeEntitlementIds.map((id) => [id, { identifier: id }])),
    },
  }) as unknown as CustomerInfo;

describe('RevenueCatEntitlements', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.REVENUECAT_ENTITLEMENT_ID;
    delete process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID;
  });

  it('defaults the primary launch entitlement to pro', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getPrimaryRevenueCatEntitlementId } = require('../RevenueCatEntitlements');

      expect(getPrimaryRevenueCatEntitlementId()).toBe('pro');
    });
  });

  it('keeps Ryvro entitlement aliases available for the launch RevenueCat dashboard', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getRevenueCatEntitlementIds,
        hasActiveProEntitlement,
      } = require('../RevenueCatEntitlements');

      expect(getRevenueCatEntitlementIds()).toEqual(
        expect.arrayContaining([
          'pro',
          'premium',
          'ryvro_pro',
          'ryvro-premium',
          'ryvro_shift_planner_pro',
          'Ryvro Shift Planner Pro',
        ])
      );
      expect(hasActiveProEntitlement(makeCustomerInfo(['ryvro_shift_planner_pro']))).toBe(true);
      expect(hasActiveProEntitlement(makeCustomerInfo(['Ryvro Shift Planner Pro']))).toBe(true);
    });
  });

  it('matches the canonical pro and premium entitlement ids', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getActiveProEntitlement,
        hasActiveProEntitlement,
      } = require('../RevenueCatEntitlements');

      expect(hasActiveProEntitlement(makeCustomerInfo(['pro']))).toBe(true);
      expect(getActiveProEntitlement(makeCustomerInfo(['pro']))?.identifier).toBe('pro');
      expect(hasActiveProEntitlement(makeCustomerInfo(['premium']))).toBe(true);
      expect(getActiveProEntitlement(makeCustomerInfo(['premium']))?.identifier).toBe('premium');
    });
  });

  it('does not accept retired Ellie entitlement names for this pre-launch rebrand', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getRevenueCatEntitlementIds,
        hasActiveProEntitlement,
      } = require('../RevenueCatEntitlements');

      expect(getRevenueCatEntitlementIds()).toEqual(
        expect.not.arrayContaining([
          'ellie_pro',
          'ellie-premium',
          'ellie_shift_planner_pro',
          'Ellie Shift Planner Pro',
          'ellie_miner_shift_assistant_pro',
          'miner_shift_assistant_pro',
          'Ellie: Miner Shift Assistant Pro',
        ])
      );
      expect(hasActiveProEntitlement(makeCustomerInfo(['Ellie Shift Planner Pro']))).toBe(false);
      expect(hasActiveProEntitlement(makeCustomerInfo(['Ellie: Miner Shift Assistant Pro']))).toBe(
        false
      );
    });
  });

  it('does not guess a pro entitlement from unrelated active entitlements', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getActiveProEntitlement,
        hasActiveProEntitlement,
      } = require('../RevenueCatEntitlements');

      expect(hasActiveProEntitlement(makeCustomerInfo(['anything_custom']))).toBe(false);
      expect(getActiveProEntitlement(makeCustomerInfo(['gold', 'platinum']))).toBeNull();
    });
  });

  it('prefers an explicit configured entitlement without dropping Ryvro aliases', () => {
    process.env.REVENUECAT_ENTITLEMENT_ID = 'custom_partner_pro';

    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getRevenueCatEntitlementIds,
        getPrimaryRevenueCatEntitlementId,
      } = require('../RevenueCatEntitlements');

      expect(getPrimaryRevenueCatEntitlementId()).toBe('custom_partner_pro');
      expect(getRevenueCatEntitlementIds()[0]).toBe('custom_partner_pro');
      expect(getRevenueCatEntitlementIds()).toEqual(
        expect.arrayContaining(['pro', 'ryvro_pro', 'ryvro_shift_planner_pro'])
      );
    });
  });
});
