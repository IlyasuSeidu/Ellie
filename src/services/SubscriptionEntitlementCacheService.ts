import * as SecureStore from 'expo-secure-store';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { logger } from '@/utils/logger';

const ENTITLEMENT_CACHE_KEY = 'subscription:entitlementSnapshot';
const SUBSCRIPTION_STATUS_KEY = 'subscription:isPro';
const ACTIVE_ANONYMOUS_SCOPE_KEY = 'subscription:activeAnonymousScope';
const ENTITLEMENT_SECURE_KEY_PREFIX = 'subscription.entitlementSnapshot';
const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

const hashScope = (scope: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < scope.length; index += 1) {
    hash ^= scope.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
};

const sanitizeSecureStoreFragment = (value: string): string => {
  const sanitized = value
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 48);
  return sanitized.length > 0 ? sanitized : 'scope';
};

const isValidSecureStoreKey = (value: string): boolean => SECURE_STORE_KEY_PATTERN.test(value);

interface EntitlementSnapshot {
  isPro: boolean;
  updatedAt: number;
}

class SubscriptionEntitlementCacheService {
  async getCachedIsPro(scope?: string | null): Promise<boolean | null> {
    const requestedScope = this.normalizeScope(scope);
    const normalizedScope = await this.resolveReadScope(scope);
    if (!normalizedScope) {
      return null;
    }

    const secureSnapshot = await this.readSecureSnapshot(normalizedScope);
    if (secureSnapshot) {
      await this.syncMirrorIfNeeded(normalizedScope, secureSnapshot.isPro);
      return secureSnapshot.isPro;
    }

    const mirroredValue = await asyncStorageService.get<boolean>(
      this.getMirrorKey(normalizedScope)
    );
    if (typeof mirroredValue === 'boolean') {
      return mirroredValue;
    }

    if (requestedScope) {
      const legacyMirrorValue = await this.readLegacyMirror();
      if (typeof legacyMirrorValue === 'boolean') {
        await this.setCachedIsPro(legacyMirrorValue, normalizedScope);
        return legacyMirrorValue;
      }

      const legacySnapshot = await this.readLegacySnapshot();
      if (legacySnapshot) {
        await this.setCachedIsPro(legacySnapshot.isPro, normalizedScope);
        return legacySnapshot.isPro;
      }
    }

    return null;
  }

  async setCachedIsPro(isPro: boolean, scope?: string | null): Promise<void> {
    const normalizedScope = this.normalizeScope(scope);
    if (!normalizedScope) {
      logger.warn('SubscriptionEntitlementCache: refusing to persist without a resolved scope');
      return;
    }

    const snapshot: EntitlementSnapshot = { isPro, updatedAt: Date.now() };
    const secureKey = this.getSecureKey(normalizedScope);
    const mirrorKey = this.getMirrorKey(normalizedScope);
    const [secureResult, mirrorResult, legacySecureClearResult, legacyMirrorClearResult] =
      await Promise.allSettled([
        SecureStore.setItemAsync(secureKey, JSON.stringify(snapshot)),
        asyncStorageService.set(mirrorKey, isPro),
        this.clearLegacySecureSnapshot(),
        asyncStorageService.remove(SUBSCRIPTION_STATUS_KEY),
      ]);

    if (secureResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to persist secure snapshot', {
        scope: normalizedScope,
        error:
          secureResult.reason instanceof Error
            ? secureResult.reason.message
            : String(secureResult.reason),
      });
    }

    if (mirrorResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to persist async mirror', {
        scope: normalizedScope,
        error:
          mirrorResult.reason instanceof Error
            ? mirrorResult.reason.message
            : String(mirrorResult.reason),
      });
    }

    if (legacySecureClearResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to clear legacy secure snapshot', {
        error:
          legacySecureClearResult.reason instanceof Error
            ? legacySecureClearResult.reason.message
            : String(legacySecureClearResult.reason),
      });
    }

    if (legacyMirrorClearResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to clear legacy async mirror', {
        error:
          legacyMirrorClearResult.reason instanceof Error
            ? legacyMirrorClearResult.reason.message
            : String(legacyMirrorClearResult.reason),
      });
    }
  }

  async clear(scope?: string | null): Promise<void> {
    const normalizedScope = this.normalizeScope(scope);
    if (!normalizedScope) {
      return;
    }

    const [secureResult, mirrorResult] = await Promise.allSettled([
      SecureStore.deleteItemAsync(this.getSecureKey(normalizedScope)),
      asyncStorageService.remove(this.getMirrorKey(normalizedScope)),
    ]);

    if (secureResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to clear secure snapshot', {
        scope: normalizedScope,
        error:
          secureResult.reason instanceof Error
            ? secureResult.reason.message
            : String(secureResult.reason),
      });
    }

    if (mirrorResult.status === 'rejected') {
      logger.warn('SubscriptionEntitlementCache: failed to clear async mirror', {
        scope: normalizedScope,
        error:
          mirrorResult.reason instanceof Error
            ? mirrorResult.reason.message
            : String(mirrorResult.reason),
      });
    }
  }

  async getActiveAnonymousScope(): Promise<string | null> {
    try {
      const storedScope = await asyncStorageService.get<string>(ACTIVE_ANONYMOUS_SCOPE_KEY);
      return this.normalizeScope(storedScope);
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to read active anonymous scope', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async setActiveAnonymousScope(scope: string | null): Promise<void> {
    const normalizedScope = this.normalizeScope(scope);

    try {
      if (!normalizedScope) {
        await asyncStorageService.remove(ACTIVE_ANONYMOUS_SCOPE_KEY);
        return;
      }

      await asyncStorageService.set(ACTIVE_ANONYMOUS_SCOPE_KEY, normalizedScope);
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to persist active anonymous scope', {
        scope: normalizedScope,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async readSecureSnapshot(scope: string): Promise<EntitlementSnapshot | null> {
    try {
      const rawValue = await SecureStore.getItemAsync(this.getSecureKey(scope));
      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue) as Partial<EntitlementSnapshot>;
      if (typeof parsed.isPro !== 'boolean' || typeof parsed.updatedAt !== 'number') {
        logger.warn('SubscriptionEntitlementCache: ignoring invalid secure snapshot payload', {
          scope,
        });
        return null;
      }

      return {
        isPro: parsed.isPro,
        updatedAt: parsed.updatedAt,
      };
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to read secure snapshot', {
        scope,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async readLegacySnapshot(): Promise<EntitlementSnapshot | null> {
    if (!isValidSecureStoreKey(ENTITLEMENT_CACHE_KEY)) {
      return null;
    }

    try {
      const rawValue = await SecureStore.getItemAsync(ENTITLEMENT_CACHE_KEY);
      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue) as Partial<EntitlementSnapshot>;
      if (typeof parsed.isPro !== 'boolean' || typeof parsed.updatedAt !== 'number') {
        return null;
      }

      return {
        isPro: parsed.isPro,
        updatedAt: parsed.updatedAt,
      };
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to read legacy secure snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async readLegacyMirror(): Promise<boolean | null> {
    try {
      const legacyValue = await asyncStorageService.get<boolean>(SUBSCRIPTION_STATUS_KEY);
      return typeof legacyValue === 'boolean' ? legacyValue : null;
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to read legacy async mirror', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async clearLegacySecureSnapshot(): Promise<void> {
    if (!isValidSecureStoreKey(ENTITLEMENT_CACHE_KEY)) {
      return;
    }

    try {
      await SecureStore.deleteItemAsync(ENTITLEMENT_CACHE_KEY);
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to clear legacy secure snapshot', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async syncMirrorIfNeeded(scope: string, isPro: boolean): Promise<void> {
    try {
      const mirrorKey = this.getMirrorKey(scope);
      const mirroredValue = await asyncStorageService.get<boolean>(mirrorKey);
      if (mirroredValue !== isPro) {
        await asyncStorageService.set(mirrorKey, isPro);
      }
    } catch (error) {
      logger.warn('SubscriptionEntitlementCache: failed to heal async mirror', {
        scope,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private resolveReadScope(scope?: string | null): Promise<string | null> {
    const normalizedScope = this.normalizeScope(scope);
    if (normalizedScope) {
      return Promise.resolve(normalizedScope);
    }

    return this.getActiveAnonymousScope();
  }

  private normalizeScope(scope?: string | null): string | null {
    if (!scope || scope.trim().length === 0) {
      return null;
    }

    return scope.trim();
  }

  private getSecureKey(scope: string): string {
    return `${ENTITLEMENT_SECURE_KEY_PREFIX}.${sanitizeSecureStoreFragment(scope)}.${hashScope(scope)}`;
  }

  private getMirrorKey(scope: string): string {
    return `${SUBSCRIPTION_STATUS_KEY}:${scope}`;
  }
}

export const subscriptionEntitlementCacheService = new SubscriptionEntitlementCacheService();
