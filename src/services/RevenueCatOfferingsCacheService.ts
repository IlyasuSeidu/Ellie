import { Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { logger } from '@/utils/logger';

const OFFERINGS_CACHE_KEY = `subscription:offeringsSnapshot:${Platform.OS}`;

export interface CachedPaywallPlan {
  identifier: string;
  price: number;
  priceString: string;
  hasTrial: boolean;
  trialCycles: number | null;
  trialPeriodUnit: string | null;
  trialPeriodNumberOfUnits: number | null;
}

export interface CachedOfferingsSnapshot {
  updatedAt: number;
  annual: CachedPaywallPlan | null;
  monthly: CachedPaywallPlan | null;
  weekly: CachedPaywallPlan | null;
}

type CurrentOfferings = {
  annual?: PurchasesPackage | null;
  monthly?: PurchasesPackage | null;
  weekly?: PurchasesPackage | null;
} | null;

class RevenueCatOfferingsCacheService {
  async getCachedSnapshot(): Promise<CachedOfferingsSnapshot | null> {
    try {
      const snapshot = await asyncStorageService.get<CachedOfferingsSnapshot>(OFFERINGS_CACHE_KEY);
      if (!snapshot) {
        return null;
      }

      if (!this.isValidSnapshot(snapshot)) {
        return null;
      }

      return snapshot;
    } catch (error) {
      logger.warn('RevenueCatOfferingsCache: failed to read cached offerings', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async cacheCurrentOfferings(current: CurrentOfferings): Promise<CachedOfferingsSnapshot | null> {
    const snapshot = this.buildSnapshot(current);
    if (!snapshot) {
      return null;
    }

    try {
      await asyncStorageService.set(OFFERINGS_CACHE_KEY, snapshot);
    } catch (error) {
      logger.warn('RevenueCatOfferingsCache: failed to persist offerings snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return snapshot;
  }

  private buildSnapshot(current: CurrentOfferings): CachedOfferingsSnapshot | null {
    if (!current) {
      return null;
    }

    const snapshot: CachedOfferingsSnapshot = {
      updatedAt: Date.now(),
      annual: this.toCachedPlan(current.annual ?? null),
      monthly: this.toCachedPlan(current.monthly ?? null),
      weekly: this.toCachedPlan(current.weekly ?? null),
    };

    if (!snapshot.annual && !snapshot.monthly && !snapshot.weekly) {
      return null;
    }

    return snapshot;
  }

  private toCachedPlan(pkg: PurchasesPackage | null): CachedPaywallPlan | null {
    if (!pkg) {
      return null;
    }

    return {
      identifier: pkg.identifier,
      price: pkg.product.price ?? 0,
      priceString: pkg.product.priceString ?? '',
      hasTrial: pkg.product.introPrice?.price === 0,
      trialCycles: pkg.product.introPrice?.cycles ?? null,
      trialPeriodUnit: pkg.product.introPrice?.periodUnit ?? null,
      trialPeriodNumberOfUnits: pkg.product.introPrice?.periodNumberOfUnits ?? null,
    };
  }

  private isValidSnapshot(snapshot: CachedOfferingsSnapshot): boolean {
    const isValidPlan = (plan: CachedPaywallPlan | null) =>
      plan === null ||
      (typeof plan.identifier === 'string' &&
        typeof plan.price === 'number' &&
        typeof plan.priceString === 'string' &&
        typeof plan.hasTrial === 'boolean' &&
        (typeof plan.trialCycles === 'number' || plan.trialCycles === null) &&
        (typeof plan.trialPeriodUnit === 'string' || plan.trialPeriodUnit === null) &&
        (typeof plan.trialPeriodNumberOfUnits === 'number' ||
          plan.trialPeriodNumberOfUnits === null));

    return (
      typeof snapshot.updatedAt === 'number' &&
      isValidPlan(snapshot.annual) &&
      isValidPlan(snapshot.monthly) &&
      isValidPlan(snapshot.weekly)
    );
  }
}

export const revenueCatOfferingsCacheService = new RevenueCatOfferingsCacheService();
