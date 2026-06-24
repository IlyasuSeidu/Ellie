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

  it('uses the canonical Ryvro launch entitlement first by default', () => {
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

      expect(getRevenueCatEntitlementIds()[0]).toBe('pro');
      expect(hasActiveProEntitlement(makeCustomerInfo(['pro']))).toBe(true);
    });
  });

  it('matches the canonical pro entitlement id and Ryvro dashboard aliases', () => {
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
      expect(hasActiveProEntitlement(makeCustomerInfo(['ryvro_pro']))).toBe(true);
      expect(hasActiveProEntitlement(makeCustomerInfo(['Ryvro Pro']))).toBe(true);
      expect(hasActiveProEntitlement(makeCustomerInfo(['premium']))).toBe(true);
    });
  });

  it('does not accept retired Ellie entitlement names for this Ryvro launch', () => {
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

  it('prefers an explicit configured entitlement while retaining canonical pro', () => {
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
        expect.arrayContaining(['custom_partner_pro', 'pro', 'ryvro_pro', 'Ryvro Pro'])
      );
    });
  });
});
