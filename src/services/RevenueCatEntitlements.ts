import Constants from 'expo-constants';
import type { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const getPrimaryRevenueCatEntitlementId = (): string => {
  const constantsAny = Constants as unknown as {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: {
      extra?: {
        expoClient?: {
          extra?: Record<string, unknown>;
        };
      };
    };
  };

  return (
    normalizeEnvValue(Constants.expoConfig?.extra?.REVENUECAT_ENTITLEMENT_ID) ??
    normalizeEnvValue(Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID) ??
    normalizeEnvValue(
      constantsAny.manifest2?.extra?.expoClient?.extra?.REVENUECAT_ENTITLEMENT_ID
    ) ??
    normalizeEnvValue(
      constantsAny.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID
    ) ??
    normalizeEnvValue(constantsAny.manifest?.extra?.REVENUECAT_ENTITLEMENT_ID) ??
    normalizeEnvValue(constantsAny.manifest?.extra?.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID) ??
    normalizeEnvValue(process.env.REVENUECAT_ENTITLEMENT_ID) ??
    normalizeEnvValue(process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID) ??
    'pro'
  );
};

const ENTITLEMENT_ALIASES = [
  'pro',
  'premium',
  'ellie_pro',
  'ellie-premium',
  'ellie_miner_shift_assistant_pro',
  'miner_shift_assistant_pro',
  'Ellie: Miner Shift Assistant Pro',
];

export const getRevenueCatEntitlementIds = (): string[] => {
  const primary = getPrimaryRevenueCatEntitlementId();
  return Array.from(new Set([primary, ...ENTITLEMENT_ALIASES]));
};

export const getActiveProEntitlement = (info: CustomerInfo): PurchasesEntitlementInfo | null => {
  const activeEntitlements = info.entitlements.active;

  for (const entitlementId of getRevenueCatEntitlementIds()) {
    const match = activeEntitlements[entitlementId];
    if (match) {
      return match;
    }
  }

  const activeValues = Object.values(activeEntitlements);
  if (activeValues.length === 1) {
    return activeValues[0] ?? null;
  }

  return null;
};

export const hasActiveProEntitlement = (info: CustomerInfo): boolean =>
  getActiveProEntitlement(info) !== null;
