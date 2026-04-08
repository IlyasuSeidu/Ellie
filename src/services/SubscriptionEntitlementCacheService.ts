import * as SecureStore from 'expo-secure-store';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { logger } from '@/utils/logger';

const ENTITLEMENT_CACHE_KEY = 'subscription:entitlementSnapshot';
const SUBSCRIPTION_STATUS_KEY = 'subscription:isPro';

interface EntitlementSnapshot {
  isPro: boolean;
  updatedAt: number;
}

class SubscriptionEntitlementCacheService {
  async getCachedIsPro(): Promise<boolean | null> {
    const secureSnapshot = await this.readSecureSnapshot();
    if (secureSnapshot) {
      await this.syncMirrorIfNeeded(secureSnapshot.isPro);
      return secureSnapshot.isPro;
    }

    const mirroredValue = await asyncStorageService.get<boolean>(SUBSCRIPTION_STATUS_KEY);
    return typeof mirroredValue === 'boolean' ? mirroredValue : null;
  }

  async setCachedIsPro(isPro: boolean): Promise<void> {
    const snapshot: EntitlementSnapshot = { isPro, updatedAt: Date.now() };
    const [secureResult, mirrorResult] = await Promise.allSettled([
      SecureStore.setItemAsync(ENTITLEMENT_CACHE_KEY, JSON.stringify(snapshot)),
      asyncStorageService.set(SUBSCRIPTION_STATUS_KEY, isPro),
    ]);

    if (secureResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to persist secure snapshot', {
        error:
          secureResult.reason instanceof Error
            ? secureResult.reason.message
            : String(secureResult.reason),
      });
    }

    if (mirrorResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to persist async mirror', {
        error:
          mirrorResult.reason instanceof Error
            ? mirrorResult.reason.message
            : String(mirrorResult.reason),
      });
    }
  }

  async clear(): Promise<void> {
    const [secureResult, mirrorResult] = await Promise.allSettled([
      SecureStore.deleteItemAsync(ENTITLEMENT_CACHE_KEY),
      asyncStorageService.remove(SUBSCRIPTION_STATUS_KEY),
    ]);

    if (secureResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to clear secure snapshot', {
        error:
          secureResult.reason instanceof Error
            ? secureResult.reason.message
            : String(secureResult.reason),
      });
    }

    if (mirrorResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to clear async mirror', {
        error:
          mirrorResult.reason instanceof Error
            ? mirrorResult.reason.message
            : String(mirrorResult.reason),
      });
    }
  }

  private async readSecureSnapshot(): Promise<EntitlementSnapshot | null> {
    try {
      const rawValue = await SecureStore.getItemAsync(ENTITLEMENT_CACHE_KEY);
      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue) as Partial<EntitlementSnapshot>;
      if (typeof parsed.isPro !== 'boolean' || typeof parsed.updatedAt !== 'number') {
        logger.warn('SubscriptionEntitlementCache: ignoring invalid secure snapshot payload');
        return null;
      }

      return {
        isPro: parsed.isPro,
        updatedAt: parsed.updatedAt,
      };
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to read secure snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async syncMirrorIfNeeded(isPro: boolean): Promise<void> {
    try {
      const mirroredValue = await asyncStorageService.get<boolean>(SUBSCRIPTION_STATUS_KEY);
      if (mirroredValue !== isPro) {
        await asyncStorageService.set(SUBSCRIPTION_STATUS_KEY, isPro);
      }
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to heal async mirror', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const subscriptionEntitlementCacheService = new SubscriptionEntitlementCacheService();
