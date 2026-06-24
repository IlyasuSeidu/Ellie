import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAuth } from '@/contexts/AuthContext';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { legalConfig } from '@/config/env';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSubscription } from '@/hooks/useSubscription';
import { getActiveProEntitlement } from '@/services/RevenueCatEntitlements';
import {
  revenueCatOfferingsCacheService,
  type CachedOfferingsSnapshot,
  type CachedPaywallPlan,
} from '@/services/RevenueCatOfferingsCacheService';
import { getRevenueCatAvailability, getRevenueCatRuntime } from '@/services/RevenueCatRuntime';
import { Analytics, type PaywallTriggerSource } from '@/utils/analytics';

type PlanKey = 'annual' | 'monthly' | 'weekly';

type DisplayPlan = CachedPaywallPlan & {
  package: PurchasesPackage | null;
};

interface PaywallScreenProps {
  onDismiss: () => void;
  onboardingData?: OnboardingData;
  entryPoint: PaywallTriggerSource;
  allowDismiss?: boolean;
}

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.92)',
  panelStrong: 'rgba(13, 34, 48, 0.98)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  line: 'rgba(191, 231, 255, 0.2)',
  error: '#ff8a80',
} as const;

const PAYWALL_NOT_AVAILABLE =
  'Ryvro Pro is not available yet. Please update Ryvro or contact support if this keeps happening.';
const PAYWALL_UNAVAILABLE =
  'Ryvro Pro is unavailable right now. Please update Ryvro or contact support if this keeps happening.';
const RYVRO_MONTHLY_PRICE = 6.99;

function packageHasTrial(pkg: PurchasesPackage | null): boolean {
  return pkg?.product.introPrice?.price === 0;
}

function toDisplayPlan(pkg: PurchasesPackage | null): DisplayPlan | null {
  if (!pkg) return null;
  return {
    identifier: pkg.identifier,
    package: pkg,
    price: pkg.product.price ?? 0,
    priceString: pkg.product.priceString ?? '',
    hasTrial: packageHasTrial(pkg),
    trialCycles: pkg.product.introPrice?.cycles ?? null,
    trialPeriodUnit: pkg.product.introPrice?.periodUnit ?? null,
    trialPeriodNumberOfUnits: pkg.product.introPrice?.periodNumberOfUnits ?? null,
  };
}

function cachedToDisplayPlan(plan: CachedPaywallPlan | null | undefined): DisplayPlan | null {
  if (!plan) return null;
  return {
    ...plan,
    package: null,
  };
}

function getPlanLabel(plan: PlanKey): string {
  if (plan === 'annual') return 'Yearly';
  if (plan === 'monthly') return 'Monthly';
  return 'Weekly';
}

function getCurrencyPrefix(priceString: string | undefined): string {
  const prefix = priceString?.replace(/[0-9.,\s]/g, '').trim();
  return prefix || 'US$';
}

function getPlanPriceString(
  plan: PlanKey,
  data: DisplayPlan,
  annualPlan: DisplayPlan | null
): string {
  if (
    plan === 'monthly' &&
    data.identifier.toLowerCase().includes('monthly') &&
    data.price <= 1.01
  ) {
    return `${getCurrencyPrefix(annualPlan?.priceString ?? data.priceString)}${RYVRO_MONTHLY_PRICE.toFixed(2)}`;
  }

  return data.priceString;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
  onDismiss,
  onboardingData,
  entryPoint,
  allowDismiss = true,
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const { syncCustomerInfo, restorePurchases, presentNativePaywall, canPresentNativePaywall } =
    useSubscription();
  const networkSnapshot = useNetworkStatus();
  const isOffline = networkSnapshot.status === 'offline';
  const revenueCatAvailability = useMemo(() => getRevenueCatAvailability(), []);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [cachedOfferings, setCachedOfferings] = useState<CachedOfferingsSnapshot | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [dismissVisible, setDismissVisible] = useState(false);
  const openedAtRef = useRef(Date.now());
  const ctaScale = useSharedValue(1);
  const isCompactPaywall = height < 780;

  const metadata = useMemo(
    () => ({
      platform: Platform.OS,
      country: onboardingData?.country ?? null,
      schedule_name: onboardingData?.universalSchedule?.name ?? null,
      pain_point: onboardingData?.painPoint ?? null,
    }),
    [onboardingData?.country, onboardingData?.painPoint, onboardingData?.universalSchedule?.name]
  );

  const applyCurrentOfferings = useCallback(
    async (
      current: {
        annual?: PurchasesPackage | null;
        monthly?: PurchasesPackage | null;
        weekly?: PurchasesPackage | null;
      } | null
    ) => {
      setAnnualPackage(current?.annual ?? null);
      setMonthlyPackage(current?.monthly ?? null);
      setWeeklyPackage(current?.weekly ?? null);

      if (current) {
        const snapshot = await revenueCatOfferingsCacheService.cacheCurrentOfferings(
          current,
          user?.uid ?? null
        );
        setCachedOfferings(snapshot);
      }
    },
    [user?.uid]
  );

  useEffect(() => {
    let mounted = true;
    Analytics.paywallViewed(entryPoint, metadata);
    const closeTimer = allowDismiss ? setTimeout(() => setDismissVisible(true), 5000) : null;

    void revenueCatOfferingsCacheService.getCachedSnapshot(user?.uid ?? null).then((snapshot) => {
      if (mounted) setCachedOfferings(snapshot);
    });

    if (revenueCatAvailability.reason !== null || isOffline) {
      setLoading(false);
      return () => {
        mounted = false;
        if (closeTimer) clearTimeout(closeTimer);
      };
    }

    const runtime = getRevenueCatRuntime();
    if (!runtime) {
      setLoading(false);
      return () => {
        mounted = false;
        if (closeTimer) clearTimeout(closeTimer);
      };
    }

    void runtime.Purchases.getOfferings()
      .then((offerings) => {
        if (!mounted) return;
        void applyCurrentOfferings(offerings.current ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [
    allowDismiss,
    applyCurrentOfferings,
    entryPoint,
    isOffline,
    metadata,
    revenueCatAvailability.reason,
    user?.uid,
  ]);

  useEffect(() => {
    ctaScale.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [ctaScale]);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const annualPlan = useMemo(
    () => toDisplayPlan(annualPackage) ?? cachedToDisplayPlan(cachedOfferings?.annual),
    [annualPackage, cachedOfferings?.annual]
  );
  const monthlyPlan = useMemo(
    () => toDisplayPlan(monthlyPackage) ?? cachedToDisplayPlan(cachedOfferings?.monthly),
    [cachedOfferings?.monthly, monthlyPackage]
  );
  const weeklyPlan = useMemo(
    () => toDisplayPlan(weeklyPackage) ?? cachedToDisplayPlan(cachedOfferings?.weekly),
    [cachedOfferings?.weekly, weeklyPackage]
  );

  const plans = useMemo(
    () =>
      [
        { key: 'annual' as const, data: annualPlan },
        { key: 'monthly' as const, data: monthlyPlan },
        { key: 'weekly' as const, data: weeklyPlan },
      ].filter((plan): plan is { key: PlanKey; data: DisplayPlan } => Boolean(plan.data)),
    [annualPlan, monthlyPlan, weeklyPlan]
  );

  useEffect(() => {
    if (plans.length > 0 && !plans.some((plan) => plan.key === selectedPlan)) {
      setSelectedPlan(plans[0].key);
    }
  }, [plans, selectedPlan]);

  const selectedPlanData =
    selectedPlan === 'annual' ? annualPlan : selectedPlan === 'monthly' ? monthlyPlan : weeklyPlan;
  const selectedPackage = selectedPlanData?.package ?? null;
  const monthlyEquivalent = useMemo(() => {
    if (!annualPlan?.price || !annualPlan.priceString) return null;
    const currency = getCurrencyPrefix(annualPlan.priceString);
    return `${currency}${(annualPlan.price / 12).toFixed(2)}/month`;
  }, [annualPlan?.price, annualPlan?.priceString]);

  const primaryLabel = selectedPlanData?.hasTrial
    ? 'Start free trial'
    : selectedPlanData
      ? 'Continue'
      : loading
        ? 'Loading plans...'
        : 'Plans unavailable';

  const handleDismiss = () => {
    Analytics.paywallDismissed({
      time_on_paywall_seconds: Math.max(0, Math.round((Date.now() - openedAtRef.current) / 1000)),
      platform: Platform.OS,
      source: entryPoint,
      trigger_source: entryPoint,
    });
    onDismiss();
  };

  const completePurchase = async (customerInfo?: unknown) => {
    if (customerInfo) {
      const info = customerInfo as Parameters<typeof syncCustomerInfo>[0];
      await syncCustomerInfo(info);
      if (!getActiveProEntitlement(info)) {
        setPurchaseError(
          'Purchase completed, but Ryvro Pro is not active yet. Tap Restore purchase or try again.'
        );
        return;
      }
    }
    setPurchaseSuccess(true);
  };

  const handlePurchase = async () => {
    Analytics.paywallCTAClicked(selectedPlan, {
      platform: Platform.OS,
      source: entryPoint,
      trigger_source: entryPoint,
    });

    if (isOffline) {
      setPurchaseError('Connect to the internet to subscribe.');
      return;
    }

    const runtime = getRevenueCatRuntime();
    if (!runtime) {
      setPurchaseError(PAYWALL_NOT_AVAILABLE);
      return;
    }

    try {
      setPurchasing(true);
      setPurchaseError(null);
      Analytics.paywallSubscribeTapped(selectedPlan, {
        platform: Platform.OS,
        source: entryPoint,
        trigger_source: entryPoint,
      });

      let packageToPurchase = selectedPackage;
      if (!packageToPurchase) {
        const offerings = await runtime.Purchases.getOfferings();
        await applyCurrentOfferings(offerings.current ?? null);
        const current = offerings.current;
        packageToPurchase =
          selectedPlan === 'annual'
            ? (current?.annual ?? null)
            : selectedPlan === 'monthly'
              ? (current?.monthly ?? null)
              : (current?.weekly ?? null);
      }

      if (!packageToPurchase && canPresentNativePaywall) {
        const result = await presentNativePaywall();
        if (result === 'purchased' || result === 'restored') {
          const info = await runtime.Purchases.getCustomerInfo();
          await completePurchase(info);
        }
        return;
      }

      if (!packageToPurchase) {
        setPurchaseError(PAYWALL_UNAVAILABLE);
        return;
      }

      const result = await runtime.Purchases.purchasePackage(packageToPurchase);
      await completePurchase(result.customerInfo);
      const price = packageToPurchase.product.price ?? 0;
      if (getActiveProEntitlement(result.customerInfo)?.periodType === 'TRIAL') {
        Analytics.trialStarted(selectedPlan, price);
      } else {
        Analytics.purchaseCompleted(selectedPlan, price);
      }
    } catch (error) {
      const cancelled =
        error !== null &&
        typeof error === 'object' &&
        'userCancelled' in error &&
        error.userCancelled === true;
      if (!cancelled) setPurchaseError('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      setPurchaseError(null);
      setRestoreMessage(null);
      Analytics.paywallRestoreTapped({
        platform: Platform.OS,
        source: entryPoint,
        trigger_source: entryPoint,
      });
      const result = await restorePurchases();
      if (result === 'success') {
        setRestoreMessage('Purchase restored.');
        setPurchaseSuccess(true);
      } else if (result === 'offline') {
        setPurchaseError('Connect to the internet to restore purchases.');
      } else {
        setRestoreMessage('No previous purchase found.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const openUrl = (url?: string) => {
    if (url) void Linking.openURL(url);
  };

  if (purchaseSuccess) {
    return (
      <View style={styles.overlay} testID="paywall-success">
        <LinearGradient
          colors={[RYVRO_COLORS.ink, RYVRO_COLORS.void, '#000204']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.successContent, { paddingTop: Math.max(insets.top + 24, 54) }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={42} color={RYVRO_COLORS.void} />
          </View>
          <Text style={styles.successTitle}>Ryvro Pro is on.</Text>
          <Text style={styles.successBody}>You can ask Ryvro about your shifts anytime.</Text>
          <PremiumPaywallButton
            title="Continue"
            onPress={onDismiss}
            testID="paywall-success-continue"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay} testID="paywall-screen">
      <LinearGradient
        colors={[RYVRO_COLORS.ink, RYVRO_COLORS.void, '#000204']}
        locations={[0, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} />
      <View style={styles.blueGlow} />

      {allowDismiss && dismissVisible ? (
        <TouchableOpacity
          onPress={handleDismiss}
          style={[styles.closeButton, { top: Math.max(insets.top + 8, 24) }]}
          accessibilityRole="button"
          accessibilityLabel="Close paywall"
          testID="paywall-close"
        >
          <Ionicons name="close" size={22} color={RYVRO_COLORS.muted} />
        </TouchableOpacity>
      ) : null}

      <View
        style={[
          styles.contentShell,
          {
            paddingTop: Math.max(
              insets.top + (isCompactPaywall ? 24 : 42),
              isCompactPaywall ? 44 : 70
            ),
          },
          isCompactPaywall && styles.contentShellCompact,
        ]}
      >
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.scrollContent,
            isCompactPaywall && styles.scrollContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View style={styles.header}>
            <View style={[styles.iconShell, isCompactPaywall && styles.iconShellCompact]}>
              <LinearGradient
                colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                style={styles.iconGradient}
              >
                <Ionicons name="mic" size={isCompactPaywall ? 26 : 30} color={RYVRO_COLORS.void} />
              </LinearGradient>
            </View>
            <Text style={[styles.title, isCompactPaywall && styles.titleCompact]}>
              Ask Ryvro every day.
            </Text>
            <Text style={[styles.subtitle, isCompactPaywall && styles.subtitleCompact]}>
              Unlock voice answers for your full shift schedule.
            </Text>
          </View>

          <View style={[styles.promiseCard, isCompactPaywall && styles.promiseCardCompact]}>
            <Feature icon="mic-outline" text="Ask by voice anytime" />
            <Feature icon="calendar-clear-outline" text="Know today, tomorrow, and days off" />
            <Feature icon="notifications-outline" text="Simple shift reminders" />
          </View>

          <View style={[styles.planStack, isCompactPaywall && styles.planStackCompact]}>
            {loading && plans.length === 0 ? (
              <View style={styles.loadingPlans}>
                <ActivityIndicator color={RYVRO_COLORS.cyan} />
                <Text style={styles.loadingText}>Loading plans...</Text>
              </View>
            ) : null}

            {plans.map(({ key, data }) => {
              const selected = selectedPlan === key;
              const isAnnual = key === 'annual';
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setSelectedPlan(key);
                    setPurchaseError(null);
                    Analytics.paywallPlanSelected(key, {
                      platform: Platform.OS,
                      source: entryPoint,
                      trigger_source: entryPoint,
                    });
                  }}
                  activeOpacity={0.88}
                  style={[
                    styles.planButton,
                    isCompactPaywall && styles.planButtonCompact,
                    selected && styles.planButtonSelected,
                  ]}
                  testID={`paywall-plan-${key}`}
                >
                  <View>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planName, selected && styles.planNameSelected]}>
                        {getPlanLabel(key)}
                      </Text>
                      {isAnnual ? <Text style={styles.bestValue}>Best value</Text> : null}
                    </View>
                    <Text style={styles.planMeta}>
                      {isAnnual && monthlyEquivalent ? monthlyEquivalent : 'Cancel anytime'}
                    </Text>
                  </View>
                  <View style={styles.planPriceBlock}>
                    <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
                      {getPlanPriceString(key, data, annualPlan)}
                    </Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? (
                        <Ionicons name="checkmark" size={15} color={RYVRO_COLORS.void} />
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={handleRestore} disabled={restoring} testID="paywall-restore">
              <Text style={styles.footerLink}>{restoring ? 'Restoring...' : 'Restore'}</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => openUrl(legalConfig.privacyPolicyUrl)}>
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={() => openUrl(legalConfig.termsOfServiceUrl)}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomArea,
            isCompactPaywall && styles.bottomAreaCompact,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
        >
          <Text style={styles.billingText}>
            {selectedPlanData?.hasTrial
              ? 'No charge today. Cancel anytime in Settings.'
              : selectedPlanData
                ? 'You will be charged today. Cancel anytime in Settings.'
                : 'Subscriptions renew automatically.'}
          </Text>

          <Animated.View style={ctaAnimatedStyle}>
            <PremiumPaywallButton
              title={purchasing ? 'Starting...' : primaryLabel}
              onPress={handlePurchase}
              disabled={purchasing || loading || !selectedPlanData || isOffline}
              loading={purchasing}
              testID="paywall-cta"
            />
          </Animated.View>

          {purchaseError ? <Text style={styles.errorText}>{purchaseError}</Text> : null}
          {restoreMessage ? <Text style={styles.restoreText}>{restoreMessage}</Text> : null}
        </View>
      </View>
    </View>
  );
};

const Feature: React.FC<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = ({
  icon,
  text,
}) => (
  <View style={styles.featureRow}>
    <Ionicons name={icon} size={20} color={RYVRO_COLORS.cyan} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const PremiumPaywallButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}> = ({ title, onPress, disabled, loading, testID }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.9}
    style={[styles.ctaButton, disabled && styles.ctaButtonDisabled]}
    testID={testID}
  >
    <LinearGradient
      colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.ctaGradient}
    >
      {loading ? <ActivityIndicator color={RYVRO_COLORS.void} /> : null}
      <Text style={styles.ctaText}>{title}</Text>
      {!loading ? (
        <Ionicons name="arrow-forward-circle" size={26} color={RYVRO_COLORS.void} />
      ) : null}
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RYVRO_COLORS.void,
    zIndex: 50,
  },
  cyanGlow: {
    position: 'absolute',
    top: -110,
    left: -116,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    top: 112,
    right: -150,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(20, 124, 255, 0.16)',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 22, 31, 0.72)',
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  contentShell: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentShellCompact: {
    paddingHorizontal: 22,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 18,
  },
  scrollContentCompact: {
    paddingBottom: 14,
  },
  header: {
    alignItems: 'center',
  },
  iconShell: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 7,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.24)',
  },
  iconShellCompact: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 6,
  },
  iconGradient: {
    flex: 1,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 20,
    color: RYVRO_COLORS.silver,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
    textAlign: 'center',
  },
  titleCompact: {
    marginTop: 14,
    fontSize: 31,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 10,
    color: RYVRO_COLORS.muted,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitleCompact: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  promiseCard: {
    marginTop: 26,
    padding: 18,
    borderRadius: 24,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    gap: 14,
  },
  promiseCardCompact: {
    marginTop: 18,
    padding: 14,
    borderRadius: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    color: RYVRO_COLORS.silver,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  planStack: {
    marginTop: 20,
    gap: 12,
  },
  planStackCompact: {
    marginTop: 14,
    gap: 10,
  },
  loadingPlans: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: RYVRO_COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  planButton: {
    minHeight: 78,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  planButtonCompact: {
    minHeight: 68,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  planButtonSelected: {
    borderColor: 'rgba(32, 244, 220, 0.62)',
    backgroundColor: RYVRO_COLORS.panelStrong,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    color: RYVRO_COLORS.silver,
    fontSize: 19,
    fontWeight: '900',
  },
  planNameSelected: {
    color: RYVRO_COLORS.cyan,
  },
  bestValue: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(32, 244, 220, 0.12)',
    color: RYVRO_COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  planMeta: {
    marginTop: 5,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  planPriceBlock: {
    alignItems: 'flex-end',
    gap: 7,
  },
  planPrice: {
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    fontWeight: '900',
  },
  planPriceSelected: {
    color: RYVRO_COLORS.silver,
  },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  radioSelected: {
    backgroundColor: RYVRO_COLORS.cyan,
    borderColor: RYVRO_COLORS.cyan,
  },
  bottomArea: {
    paddingTop: 12,
  },
  bottomAreaCompact: {
    paddingTop: 10,
  },
  ctaButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaGradient: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  ctaText: {
    color: RYVRO_COLORS.void,
    fontSize: 22,
    fontWeight: '900',
  },
  billingText: {
    marginBottom: 12,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 10,
    color: RYVRO_COLORS.error,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  restoreText: {
    marginTop: 10,
    color: RYVRO_COLORS.cyan,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerLinks: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerLink: {
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  footerDot: {
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  successContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: RYVRO_COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    marginTop: 24,
    color: RYVRO_COLORS.silver,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'center',
  },
  successBody: {
    marginTop: 10,
    marginBottom: 30,
    color: RYVRO_COLORS.muted,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
});
