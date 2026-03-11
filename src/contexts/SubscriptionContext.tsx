import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

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

const hasProEntitlement = (info: CustomerInfo): boolean =>
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

    if (!apiKey) {
      setIsPro(false);
      setIsLoading(false);
      return undefined;
    }

    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });

    void Purchases.getCustomerInfo()
      .then((info: CustomerInfo) => {
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

    const customerInfoListener = (info: CustomerInfo) => {
      if (isMounted) {
        setIsPro(hasProEntitlement(info));
      }
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      isMounted = false;
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, []);

  const restorePurchases = useCallback(async () => {
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
