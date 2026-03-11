import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { getRevenueCatRuntime, isRevenueCatAvailable } from '@/services/RevenueCatRuntime';
import { theme } from '@/utils/theme';

interface PaywallScreenProps {
  onDismiss: () => void;
}

type PlanKey = 'annual' | 'monthly';

type FeatureRow = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onDismiss }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { restorePurchases } = useSubscription();
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const purchasesAvailable = useMemo(() => isRevenueCatAvailable(), []);

  const featureRows: FeatureRow[] = useMemo(
    () => [
      { icon: 'mic-outline', text: t('subscription.paywall.features.askRoster') },
      { icon: 'calendar-outline', text: t('subscription.paywall.features.fullYear') },
      { icon: 'cloud-offline-outline', text: t('subscription.paywall.features.offline') },
      {
        icon: 'chatbubble-ellipses-outline',
        text: t('subscription.paywall.features.instantAnswers'),
      },
      { icon: 'flash-outline', text: t('subscription.paywall.features.aiPowered') },
    ],
    [t]
  );

  useEffect(() => {
    const revenueCatRuntime = getRevenueCatRuntime();
    if (!revenueCatRuntime) {
      setAnnualPackage(null);
      setMonthlyPackage(null);
      setLoading(false);
      return;
    }

    const { Purchases } = revenueCatRuntime;

    void Purchases.getOfferings()
      .then((offerings) => {
        const current = offerings.current;
        if (current) {
          setAnnualPackage(current.annual ?? null);
          setMonthlyPackage(current.monthly ?? null);
        }
      })
      .catch(() => {
        setAnnualPackage(null);
        setMonthlyPackage(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedPackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
  const annualPrice = annualPackage?.product.priceString ?? '$49.99';
  const monthlyPrice = monthlyPackage?.product.priceString ?? '$6.99';

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    const revenueCatRuntime = getRevenueCatRuntime();
    if (!revenueCatRuntime) return;

    try {
      setPurchasing(true);
      const { Purchases } = revenueCatRuntime;
      await Purchases.purchasePackage(selectedPackage);
      onDismiss();
    } catch {
      // User cancelled or purchase failed. Keep paywall visible.
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
    onDismiss();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 16, 40) }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel={t('subscription.paywall.closeA11y')}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={22} color={theme.colors.dust} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <LinearGradient
            colors={[theme.colors.brightGold, theme.colors.sacredGold]}
            style={styles.micCircle}
          >
            <Ionicons name="mic" size={36} color={theme.colors.deepVoid} />
          </LinearGradient>
          <Text style={styles.title}>{t('subscription.paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('subscription.paywall.subtitle')}</Text>
        </View>

        <View style={styles.features}>
          {featureRows.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <Ionicons
                name={feature.icon}
                size={18}
                color={theme.colors.paleGold}
                style={styles.featureIcon}
              />
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.paleGold} style={styles.loader} />
        ) : (
          <View style={styles.plans}>
            <TouchableOpacity
              style={[styles.planOption, selectedPlan === 'annual' && styles.planOptionSelected]}
              onPress={() => setSelectedPlan('annual')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === 'annual' }}
            >
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]} />
                <Text style={styles.planName}>{t('subscription.paywall.plans.annual')}</Text>
              </View>
              <View style={styles.planRight}>
                <Text style={styles.planPrice}>
                  {annualPrice}
                  {t('subscription.paywall.plans.annualSuffix')}
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>{t('subscription.paywall.plans.save')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionSelected]}
              onPress={() => setSelectedPlan('monthly')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === 'monthly' }}
            >
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]} />
                <Text style={styles.planName}>{t('subscription.paywall.plans.monthly')}</Text>
              </View>
              <Text style={styles.planPrice}>
                {monthlyPrice}
                {t('subscription.paywall.plans.monthlySuffix')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing || loading || !selectedPackage}
          accessibilityRole="button"
          accessibilityLabel={t('subscription.paywall.cta')}
          testID="paywall-cta"
        >
          <LinearGradient
            colors={[theme.colors.brightGold, theme.colors.sacredGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            {purchasing ? (
              <ActivityIndicator color={theme.colors.deepVoid} />
            ) : (
              <Text style={styles.ctaText}>{t('subscription.paywall.cta')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {purchasesAvailable ? (
          <Text style={styles.noCard}>{t('subscription.paywall.noCard')}</Text>
        ) : (
          <Text style={styles.unavailableNotice}>
            {t('subscription.paywall.unavailable', {
              defaultValue:
                'Subscriptions are unavailable in this app build. Install the latest EAS development/production build.',
            })}
          </Text>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore} accessibilityRole="button">
            <Text style={styles.footerLink}>{t('subscription.paywall.restorePurchases')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.footerLink}>{t('subscription.paywall.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.deepVoid,
    zIndex: 999,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  dismissButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginTop: 8,
  },
  hero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.paper,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.dust,
    marginTop: 6,
  },
  features: {
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.paper,
    lineHeight: 22,
  },
  loader: {
    marginVertical: 24,
  },
  plans: {
    gap: 10,
    marginBottom: 24,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  planOptionSelected: {
    borderColor: theme.colors.paleGold,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.dust,
  },
  radioSelected: {
    borderColor: theme.colors.paleGold,
    backgroundColor: theme.colors.paleGold,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  planPrice: {
    fontSize: 15,
    color: theme.colors.dust,
  },
  saveBadge: {
    backgroundColor: theme.colors.paleGold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.deepVoid,
  },
  ctaButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.deepVoid,
  },
  noCard: {
    textAlign: 'center',
    color: theme.colors.dust,
    fontSize: 13,
    marginTop: 12,
  },
  unavailableNotice: {
    textAlign: 'center',
    color: theme.colors.dust,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerLink: {
    fontSize: 13,
    color: theme.colors.dust,
  },
  footerDot: {
    color: theme.colors.softStone,
  },
});
