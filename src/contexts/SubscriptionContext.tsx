import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getRevenueCatAvailability,
  getRevenueCatApiKey,
  getRevenueCatRuntime,
  type RevenueCatCustomerInfo,
} from '@/services/RevenueCatRuntime';
import { getRevenueCatUIRuntime } from '@/services/RevenueCatUIRuntime';
import {
  getPrimaryRevenueCatEntitlementId,
  hasActiveProEntitlement,
} from '@/services/RevenueCatEntitlements';
import { networkService } from '@/services/NetworkService';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';
import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';

const ENTITLEMENT_ID = getPrimaryRevenueCatEntitlementId();
const ANONYMOUS_CACHE_SCOPE_PREFIX = 'rc_anon:';

type RestorePurchasesResult = 'success' | 'not_found' | 'error' | 'offline' | 'unavailable';
type NativePaywallResult =
  | 'purchased'
  | 'restored'
  | 'cancelled'
  | 'not_presented'
  | 'error'
  | 'unavailable';
type CustomerCenterResult = 'presented' | 'error' | 'unavailable';

interface SubscriptionContextValue {
  isPro: boolean;
  isLoading: boolean;
  openPaywall: () => void;
  canPresentNativePaywall: boolean;
  canOpenCustomerCenter: boolean;
  restorePurchases: () => Promise<RestorePurchasesResult>;
  presentNativePaywall: (offering?: unknown) => Promise<NativePaywallResult>;
  openCustomerCenter: () => Promise<CustomerCenterResult>;
  syncCustomerInfo: (info: RevenueCatCustomerInfo) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPro: false,
  isLoading: true,
  openPaywall: () => {},
  canPresentNativePaywall: false,
  canOpenCustomerCenter: false,
  restorePurchases: () => Promise.resolve('unavailable'),
  presentNativePaywall: () => Promise.resolve('unavailable'),
  openCustomerCenter: () => Promise.resolve('unavailable'),
  syncCustomerInfo: async () => {},
});

interface SubscriptionProviderProps {
  children: React.ReactNode;
  onOpenPaywall: () => void;
}

const hasProEntitlement = (info: RevenueCatCustomerInfo): boolean => hasActiveProEntitlement(info);

type RevenueCatCustomerInfoResult =
  | RevenueCatCustomerInfo
  | {
      customerInfo: RevenueCatCustomerInfo;
    };

const extractCustomerInfo = (result: RevenueCatCustomerInfoResult): RevenueCatCustomerInfo =>
  'customerInfo' in result ? result.customerInfo : result;

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  onOpenPaywall,
}) => {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const configuredRef = useRef(false);
  const hasBootstrappedRef = useRef(false);
  const revenueCatUserIdRef = useRef<string | null>(null);
  const authScopeRef = useRef<string | null>(null);
  const entitlementCacheScopeRef = useRef<string | null>(null);

  const resolveEntitlementCacheScope = useCallback(
    async (purchases: { getAppUserID?: () => Promise<string> }, authScope: string | null) => {
      if (authScope) {
        entitlementCacheScopeRef.current = authScope;
        await subscriptionEntitlementCacheService.setActiveAnonymousScope(null);
        return authScope;
      }

      if (typeof purchases.getAppUserID === 'function') {
        try {
          const appUserId = await purchases.getAppUserID();
          if (typeof appUserId === 'string' && appUserId.trim().length > 0) {
            const anonymousScope = `${ANONYMOUS_CACHE_SCOPE_PREFIX}${appUserId.trim()}`;
            entitlementCacheScopeRef.current = anonymousScope;
            await subscriptionEntitlementCacheService.setActiveAnonymousScope(anonymousScope);
            return anonymousScope;
          }
        } catch (error) {
          logger.warn('SubscriptionProvider: failed to resolve RevenueCat app user id', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      entitlementCacheScopeRef.current = null;
      await subscriptionEntitlementCacheService.setActiveAnonymousScope(null);
      return null;
    },
    []
  );

  const syncCustomerInfo = useCallback(
    async (info: RevenueCatCustomerInfo) => {
      const hasPro = hasProEntitlement(info);
      setIsPro(hasPro);
      const cacheScope = entitlementCacheScopeRef.current ?? user?.uid ?? null;
      if (!cacheScope) {
        logger.warn('SubscriptionProvider: skipping entitlement cache write without scope');
        return;
      }
      await subscriptionEntitlementCacheService.setCachedIsPro(hasPro, cacheScope);
    },
    [user?.uid]
  );

  const refreshCustomerInfo = useCallback(
    async (purchases: {
      getAppUserID?: () => Promise<string>;
      getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
    }) => {
      const resolvedScope = await resolveEntitlementCacheScope(purchases, authScopeRef.current);
      entitlementCacheScopeRef.current = resolvedScope;
      const info = await purchases.getCustomerInfo();
      await syncCustomerInfo(info);
      return info;
    },
    [resolveEntitlementCacheScope, syncCustomerInfo]
  );

  useEffect(() => {
    let isMounted = true;
    let liveEntitlementResolved = false;
    let listenerAttached = false;
    const apiKey = getRevenueCatApiKey();
    const revenueCatRuntime = getRevenueCatRuntime();
    const authScope = user?.uid ?? null;
    const authScopeChanged = hasBootstrappedRef.current && authScopeRef.current !== authScope;

    if (authScopeRef.current !== authScope) {
      setIsPro(false);
    }
    authScopeRef.current = authScope;
    setIsLoading(true);

    if (!authScopeChanged) {
      void subscriptionEntitlementCacheService.getCachedIsPro(authScope).then((cachedValue) => {
        if (!isMounted) return;
        if (liveEntitlementResolved) return;
        if (typeof cachedValue === 'boolean') {
          setIsPro(cachedValue);
        }
      });
    }

    hasBootstrappedRef.current = true;

    if (!apiKey || !revenueCatRuntime) {
      setIsLoading(false);
      return undefined;
    }

    const { Purchases, LOG_LEVEL } = revenueCatRuntime;

    try {
      Purchases.setLogLevel(LOG_LEVEL.ERROR);
      if (!configuredRef.current) {
        Purchases.configure(authScope ? { apiKey, appUserID: authScope } : { apiKey });
        configuredRef.current = true;
        revenueCatUserIdRef.current = authScope;
      }
    } catch (error) {
      logger.warn('SubscriptionProvider: using cached entitlement after configure failure', {
        error: error instanceof Error ? error.message : String(error),
      });
      setIsLoading(false);
      return undefined;
    }

    const purchasesWithIdentity = Purchases as typeof Purchases & {
      logIn?: (appUserId: string) => Promise<RevenueCatCustomerInfoResult>;
      logOut?: () => Promise<RevenueCatCustomerInfoResult>;
    };

    const customerInfoListener = (info: RevenueCatCustomerInfo) => {
      if (!isMounted) return;
      liveEntitlementResolved = true;
      void resolveEntitlementCacheScope(Purchases, authScopeRef.current).then((resolvedScope) => {
        entitlementCacheScopeRef.current = resolvedScope;
        return syncCustomerInfo(info);
      });
    };

    void (async () => {
      try {
        if (configuredRef.current && revenueCatUserIdRef.current !== authScope) {
          if (authScope && typeof purchasesWithIdentity.logIn === 'function') {
            const loginResult = await purchasesWithIdentity.logIn(authScope);
            revenueCatUserIdRef.current = authScope;
            const resolvedScope = await resolveEntitlementCacheScope(Purchases, authScope);
            entitlementCacheScopeRef.current = resolvedScope;
            if (isMounted) {
              await syncCustomerInfo(extractCustomerInfo(loginResult));
            }
          } else if (!authScope && typeof purchasesWithIdentity.logOut === 'function') {
            const logoutResult = await purchasesWithIdentity.logOut();
            revenueCatUserIdRef.current = null;
            const resolvedScope = await resolveEntitlementCacheScope(Purchases, null);
            entitlementCacheScopeRef.current = resolvedScope;
            if (isMounted) {
              await syncCustomerInfo(extractCustomerInfo(logoutResult));
            }
          } else {
            let currentAppUserId: string | null = null;
            if (typeof Purchases.getAppUserID === 'function') {
              try {
                currentAppUserId = await Purchases.getAppUserID();
              } catch {
                currentAppUserId = null;
              }
            }

            const normalizedCurrentUserId =
              typeof currentAppUserId === 'string' && currentAppUserId.trim().length > 0
                ? currentAppUserId.trim()
                : null;
            const currentIdentityMatches =
              authScope !== null
                ? normalizedCurrentUserId === authScope
                : normalizedCurrentUserId !== null &&
                  normalizedCurrentUserId.startsWith('$RCAnonymousID');

            if (!currentIdentityMatches && authScope) {
              await subscriptionEntitlementCacheService.clear(authScope);
            }

            logger.warn('SubscriptionProvider: RevenueCat identity switch unavailable', {
              fromUserId: revenueCatUserIdRef.current,
              toUserId: authScope,
              currentAppUserId: normalizedCurrentUserId,
              currentIdentityMatches,
            });

            if (!currentIdentityMatches) {
              if (isMounted) {
                setIsPro(false);
              }
              return;
            }

            revenueCatUserIdRef.current = authScope;
          }
        }

        try {
          Purchases.addCustomerInfoUpdateListener(customerInfoListener);
          listenerAttached = true;
        } catch {
          // If the native bridge is unavailable, keep app in free mode without crashing.
        }

        const resolvedScope = await resolveEntitlementCacheScope(Purchases, authScope);
        entitlementCacheScopeRef.current = resolvedScope;
        const info = await Purchases.getCustomerInfo();
        if (isMounted) {
          liveEntitlementResolved = true;
          await syncCustomerInfo(info);
          setIsLoading(false);
        }
      } catch (error) {
        logger.warn('SubscriptionProvider: using cached entitlement after customer info failure', {
          error: error instanceof Error ? error.message : String(error),
          userId: authScope,
        });
      } finally {
        if (isMounted && !liveEntitlementResolved) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      if (listenerAttached) {
        try {
          Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
        } catch {
          // No-op: listener cleanup is best-effort.
        }
      }
    };
  }, [refreshCustomerInfo, resolveEntitlementCacheScope, syncCustomerInfo, user?.uid]);

  const restorePurchases = useCallback(async (): Promise<RestorePurchasesResult> => {
    const availability = getRevenueCatAvailability();
    const revenueCatRuntime = getRevenueCatRuntime();
    if (!revenueCatRuntime || availability.reason !== null) {
      return 'unavailable';
    }

    const snapshot = await networkService.refresh();
    if (snapshot.status === 'offline') {
      logger.warn('SubscriptionProvider: restore skipped while offline');
      return 'offline';
    }

    const { Purchases } = revenueCatRuntime;
    try {
      const resolvedScope = await resolveEntitlementCacheScope(Purchases, authScopeRef.current);
      entitlementCacheScopeRef.current = resolvedScope;
      const info = await Purchases.restorePurchases();
      await syncCustomerInfo(info);
      return hasProEntitlement(info) ? 'success' : 'not_found';
    } catch {
      // Silent no-op when there are no purchases to restore or user cancels.
      return 'error';
    }
  }, [resolveEntitlementCacheScope, syncCustomerInfo]);

  const presentNativePaywall = useCallback(
    async (offering?: unknown): Promise<NativePaywallResult> => {
      const availability = getRevenueCatAvailability();
      const revenueCatRuntime = getRevenueCatRuntime();
      const revenueCatUIRuntime = getRevenueCatUIRuntime();
      if (!revenueCatRuntime || !revenueCatUIRuntime || availability.reason !== null) {
        return 'unavailable';
      }

      try {
        const result = await revenueCatUIRuntime.RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: ENTITLEMENT_ID,
          offering: offering as never,
        });

        if (result === revenueCatUIRuntime.PAYWALL_RESULT.PURCHASED) {
          await refreshCustomerInfo(revenueCatRuntime.Purchases);
          return 'purchased';
        }

        if (result === revenueCatUIRuntime.PAYWALL_RESULT.RESTORED) {
          await refreshCustomerInfo(revenueCatRuntime.Purchases);
          return 'restored';
        }

        if (result === revenueCatUIRuntime.PAYWALL_RESULT.CANCELLED) {
          return 'cancelled';
        }

        if (result === revenueCatUIRuntime.PAYWALL_RESULT.NOT_PRESENTED) {
          return 'not_presented';
        }

        return 'error';
      } catch (error) {
        logger.warn('SubscriptionProvider: native paywall failed', {
          error: error instanceof Error ? error.message : String(error),
          userId: authScopeRef.current,
        });
        return 'error';
      }
    },
    [refreshCustomerInfo]
  );

  const openCustomerCenter = useCallback(async (): Promise<CustomerCenterResult> => {
    const availability = getRevenueCatAvailability();
    const revenueCatRuntime = getRevenueCatRuntime();
    const revenueCatUIRuntime = getRevenueCatUIRuntime();
    if (!revenueCatRuntime || !revenueCatUIRuntime || availability.reason !== null) {
      return 'unavailable';
    }

    try {
      await revenueCatUIRuntime.RevenueCatUI.presentCustomerCenter();
      await refreshCustomerInfo(revenueCatRuntime.Purchases);
      return 'presented';
    } catch (error) {
      logger.warn('SubscriptionProvider: customer center failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: authScopeRef.current,
      });
      return 'error';
    }
  }, [refreshCustomerInfo]);

  const revenueCatAvailability = getRevenueCatAvailability();
  const revenueCatUIRuntime = getRevenueCatUIRuntime();
  const canPresentNativeRevenueCatUI =
    revenueCatAvailability.reason === null && revenueCatUIRuntime !== null;

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isLoading,
        openPaywall: onOpenPaywall,
        canPresentNativePaywall: canPresentNativeRevenueCatUI,
        canOpenCustomerCenter: canPresentNativeRevenueCatUI,
        restorePurchases,
        presentNativePaywall,
        openCustomerCenter,
        syncCustomerInfo,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
