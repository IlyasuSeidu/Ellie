import {
  getActiveProEntitlement,
  hasActiveProEntitlement,
} from '@/services/RevenueCatEntitlements';

describe('RevenueCatEntitlements', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('matches the canonical pro entitlement id', () => {
    const info = {
      entitlements: {
        active: {
          pro: { identifier: 'pro', periodType: 'NORMAL' },
        },
      },
    } as never;

    expect(hasActiveProEntitlement(info)).toBe(true);
    expect(getActiveProEntitlement(info)?.identifier).toBe('pro');
  });

  it('matches a premium alias entitlement id', () => {
    const info = {
      entitlements: {
        active: {
          premium: { identifier: 'premium', periodType: 'TRIAL' },
        },
      },
    } as never;

    expect(hasActiveProEntitlement(info)).toBe(true);
    expect(getActiveProEntitlement(info)?.identifier).toBe('premium');
  });

  it('falls back to the single active entitlement when only one exists', () => {
    const info = {
      entitlements: {
        active: {
          anything_custom: { identifier: 'anything_custom', periodType: 'NORMAL' },
        },
      },
    } as never;

    expect(hasActiveProEntitlement(info)).toBe(true);
    expect(getActiveProEntitlement(info)?.identifier).toBe('anything_custom');
  });

  it('does not guess when multiple unrelated entitlements are active', () => {
    const info = {
      entitlements: {
        active: {
          gold: { identifier: 'gold', periodType: 'NORMAL' },
          platinum: { identifier: 'platinum', periodType: 'NORMAL' },
        },
      },
    } as never;

    expect(hasActiveProEntitlement(info)).toBe(false);
    expect(getActiveProEntitlement(info)).toBeNull();
  });
});
