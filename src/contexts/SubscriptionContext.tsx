import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getRevenueCatRuntime, type RevenueCatCustomerInfo } from '@/services/RevenueCatRuntime';

const ENTITLEMENT_ID = 'pro';

interface SubscriptionContextValue {
  isPro: boolean;
  isLoading: boolean;
  openPaywall: () => void;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPro: false,
  isLoading: true,
  openPaywall: () => {},
  restorePurchases: async () => {},
});

interface SubscriptionProviderProps {
  children: React.ReactNode;
  onOpenPaywall: () => void;
}

const hasProEntitlement = (info: RevenueCatCustomerInfo): boolean =>
  info.entitlements.active[ENTITLEMENT_ID] !== undefined;

const getRevenueCatApiKey = (): string => {
  const extras = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const apiKey =
    Platform.OS === 'ios'
      ? (extras.REVENUECAT_IOS_KEY ?? process.env.REVENUECAT_IOS_KEY)
      : (extras.REVENUECAT_ANDROID_KEY ?? process.env.REVENUECAT_ANDROID_KEY);

  return typeof apiKey === 'string' ? apiKey.trim() : '';
};

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  onOpenPaywall,
}) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const apiKey = getRevenueCatApiKey();
    const revenueCatRuntime = getRevenueCatRuntime();

    if (!apiKey || !revenueCatRuntime) {
      setIsPro(false);
      setIsLoading(false);
      return undefined;
    }

    const { Purchases, LOG_LEVEL } = revenueCatRuntime;

    try {
      Purchases.setLogLevel(LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey });
    } catch {
      setIsPro(false);
      setIsLoading(false);
      return undefined;
    }

    void Purchases.getCustomerInfo()
      .then((info: RevenueCatCustomerInfo) => {
        if (isMounted) {
          setIsPro(hasProEntitlement(info));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsPro(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const customerInfoListener = (info: RevenueCatCustomerInfo) => {
      if (isMounted) {
        setIsPro(hasProEntitlement(info));
      }
    };

    try {
      Purchases.addCustomerInfoUpdateListener(customerInfoListener);
    } catch {
      // If the native bridge is unavailable, keep app in free mode without crashing.
    }

    return () => {
      isMounted = false;
      try {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
      } catch {
        // No-op: listener cleanup is best-effort.
      }
    };
  }, []);

  const restorePurchases = useCallback(async () => {
    const revenueCatRuntime = getRevenueCatRuntime();
    if (!revenueCatRuntime) return;

    const { Purchases } = revenueCatRuntime;
    try {
      const info = await Purchases.restorePurchases();
      setIsPro(hasProEntitlement(info));
    } catch {
      // Silent no-op when there are no purchases to restore or user cancels.
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{ isPro, isLoading, openPaywall: onOpenPaywall, restorePurchases }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
