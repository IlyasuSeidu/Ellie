import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { getRevenueCatRuntime, isRevenueCatAvailable } from '@/services/RevenueCatRuntime';
import { theme } from '@/utils/theme';
import { Analytics } from '@/utils/analytics';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { MiniYearCalendar } from '@/components/paywall/MiniYearCalendar';

interface PaywallScreenProps {
  onDismiss: () => void;
  onboardingData?: OnboardingData;
}

type PlanKey = 'annual' | 'monthly';

type FeatureRow = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

type Testimonial = {
  quote: string;
  author: string;
  stars: number;
};

const CARD_WIDTH = Dimensions.get('window').width - 48;

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    quote: "Finally know when I'm working Christmas. Changed my life.",
    author: 'Sarah K., Nurse - 12h rotating shifts',
    stars: 5,
  },
  {
    quote: 'Showed my wife my whole year roster in under a minute.',
    author: 'Dave L., Firefighter - FIFO roster',
    stars: 5,
  },
  {
    quote: 'Booked flights 3 months out without calling HR once.',
    author: 'Jason M., Mine worker - 7/7 FIFO',
    stars: 5,
  },
];

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onDismiss, onboardingData }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { restorePurchases } = useSubscription();
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [dismissVisible, setDismissVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const purchasesAvailable = useMemo(() => isRevenueCatAvailable(), []);
  const ctaPulse = useSharedValue(1);

  const featureRows: FeatureRow[] = useMemo(
    () => [
      { icon: 'calendar-outline', text: t('subscription.paywall.features.fullYear') },
      { icon: 'mic-outline', text: t('subscription.paywall.features.askRoster') },
      { icon: 'cloud-offline-outline', text: t('subscription.paywall.features.offline') },
      { icon: 'airplane-outline', text: t('subscription.paywall.features.leavePlanning') },
      { icon: 'sparkles-outline', text: t('subscription.paywall.features.aiPowered') },
    ],
    [t]
  );

  const testimonials = DEFAULT_TESTIMONIALS;

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }));

  useEffect(() => {
    Analytics.paywallViewed('post_aha');

    const dismissTimer = setTimeout(() => setDismissVisible(true), 4000);

    const revenueCatRuntime = getRevenueCatRuntime();
    if (!revenueCatRuntime) {
      setAnnualPackage(null);
      setMonthlyPackage(null);
      setLoading(false);
      return () => clearTimeout(dismissTimer);
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

    return () => clearTimeout(dismissTimer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    ctaPulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [ctaPulse]);

  const selectedPackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
  const annualPrice = annualPackage?.product.priceString ?? '$49.99';
  const monthlyPrice = monthlyPackage?.product.priceString ?? '$6.99';
  const timerText = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const annualMonthlyEquivalent = useMemo(() => {
    if (!annualPackage) return '$2.99';
    const monthlyEquivalent = annualPackage.product.price / 12;
    const currencySymbol = annualPackage.product.priceString.replace(/[0-9.,\s]/g, '') || '$';
    return `${currencySymbol}${monthlyEquivalent.toFixed(2)}`;
  }, [annualPackage]);

  const handleDismiss = () => {
    Analytics.paywallDismissed();
    onDismiss();
  };

  const handleSelectPlan = (plan: PlanKey) => {
    setSelectedPlan(plan);
    Analytics.paywallPlanSelected(plan);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    const revenueCatRuntime = getRevenueCatRuntime();
    if (!revenueCatRuntime) return;

    try {
      setPurchasing(true);
      const { Purchases } = revenueCatRuntime;
      await Purchases.purchasePackage(selectedPackage);
      Analytics.trialStarted(selectedPlan, selectedPackage.product.price ?? 0);
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
      <View style={styles.calendarBackground} pointerEvents="none">
        {onboardingData ? <MiniYearCalendar data={onboardingData} blurred compact /> : null}
        <LinearGradient
          colors={['transparent', theme.colors.deepVoid]}
          start={{ x: 0.5, y: 0.2 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 16, 40), paddingTop: 18 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {dismissVisible ? (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityLabel={t('subscription.paywall.closeA11y')}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={theme.colors.dust} />
          </TouchableOpacity>
        ) : (
          <View style={styles.dismissSpacer} />
        )}

        <View style={styles.socialProofBar}>
          <Text style={styles.socialStars}>★★★★★</Text>
          <Text style={styles.socialProofText}>
            {t('subscription.paywall.socialProof', {
              defaultValue: '4.8 - Trusted by 50,000+ shift workers',
            })}
          </Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{t('subscription.paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('subscription.paywall.subtitle')}</Text>
        </View>

        <View style={styles.testimonialsSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
              setActiveTestimonial(nextIndex);
            }}
          >
            {testimonials.map((testimonial, index) => (
              <View
                key={`${testimonial.author}-${index}`}
                style={[styles.testimonialCard, { width: CARD_WIDTH }]}
              >
                <Text style={styles.testimonialStars}>{'★'.repeat(testimonial.stars)}</Text>
                <Text style={styles.testimonialQuote}>“{testimonial.quote}”</Text>
                <Text style={styles.testimonialAuthor}>- {testimonial.author}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.testimonialDots}>
            {testimonials.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeTestimonial === index && styles.dotActive]}
              />
            ))}
          </View>
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

        <View style={styles.lossAversion}>
          <Ionicons name="lock-closed-outline" size={14} color={theme.colors.shadow} />
          <Text style={styles.lossAversionText}>
            {t('subscription.paywall.lossAversion', {
              defaultValue: 'Without Pro, you can only see 2 weeks of your roster.',
            })}
          </Text>
        </View>

        {secondsLeft > 0 ? (
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={14} color={theme.colors.sacredGold} />
            <Text style={styles.timerText}>
              {t('subscription.paywall.timerLabel', { defaultValue: 'Introductory offer ends in' })}{' '}
              {timerText}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={theme.colors.paleGold} style={styles.loader} />
        ) : (
          <View style={styles.plans}>
            <TouchableOpacity
              style={[
                styles.planOption,
                styles.planOptionAnnual,
                selectedPlan === 'annual' && styles.planOptionSelected,
              ]}
              onPress={() => handleSelectPlan('annual')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === 'annual' }}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>
                  {t('subscription.paywall.plans.bestValue', { defaultValue: 'BEST VALUE' })}
                </Text>
              </View>
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]} />
                <View>
                  <Text style={styles.planName}>{t('subscription.paywall.plans.annual')}</Text>
                  <Text style={styles.planMonthlyEquivalent}>
                    {annualMonthlyEquivalent}
                    {t('subscription.paywall.plans.perMonth', { defaultValue: '/month' })}
                  </Text>
                </View>
              </View>
              <View style={styles.planRight}>
                <Text style={styles.planPrice}>
                  {annualPrice}
                  {t('subscription.paywall.plans.annualSuffix')}
                </Text>
                <Text style={styles.planPriceStrikethrough}>
                  {monthlyPrice}
                  {t('subscription.paywall.plans.monthlySuffix')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionSelected]}
              onPress={() => handleSelectPlan('monthly')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === 'monthly' }}
            >
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]} />
                <Text style={styles.planName}>{t('subscription.paywall.plans.monthly')}</Text>
              </View>
              <Text style={styles.planPriceMonthly}>
                {monthlyPrice}
                {t('subscription.paywall.plans.monthlySuffix')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Animated.View style={ctaAnimatedStyle}>
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
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaText}>{t('subscription.paywall.cta')}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={theme.colors.deepVoid}
                    style={styles.ctaArrow}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.dust} />
            <Text style={styles.trustText}>
              {t('subscription.paywall.trust.freeTrial', { defaultValue: '7 days free' })}
            </Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="close-circle-outline" size={14} color={theme.colors.dust} />
            <Text style={styles.trustText}>
              {t('subscription.paywall.trust.cancel', { defaultValue: 'Cancel anytime' })}
            </Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="card-outline" size={14} color={theme.colors.dust} />
            <Text style={styles.trustText}>
              {t('subscription.paywall.trust.noCharge', { defaultValue: 'No charge today' })}
            </Text>
          </View>
        </View>

        <Text style={styles.valueFrame}>
          {t('subscription.paywall.valueFrame', {
            defaultValue: 'Less than a coffee per week to know your entire year.',
          })}
        </Text>

        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.shadow} />
          <Text style={styles.securityText}>
            {t('subscription.paywall.security', {
              platform: Platform.OS === 'ios' ? 'Apple' : 'Google',
              defaultValue: `Secure payment via ${Platform.OS === 'ios' ? 'Apple' : 'Google'} - Processed by ${
                Platform.OS === 'ios' ? 'Apple' : 'Google'
              }, not Ellie`,
            })}
          </Text>
        </View>

        {!purchasesAvailable ? (
          <Text style={styles.unavailableNotice}>
            {t('subscription.paywall.unavailable', {
              defaultValue:
                'Subscriptions are unavailable in this app build. Install the latest EAS development/production build.',
            })}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore} accessibilityRole="button">
            <Text style={styles.footerLink}>{t('subscription.paywall.restorePurchases')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.footerLink}>{t('subscription.paywall.privacyPolicy')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.footerLink}>
              {t('subscription.paywall.termsOfService', { defaultValue: 'Terms' })}
            </Text>
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
  calendarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    overflow: 'hidden',
  },
  dismissSpacer: {
    height: 36,
  },
  dismissButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginTop: 8,
  },
  socialProofBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 16,
  },
  socialStars: {
    color: theme.colors.paleGold,
    fontSize: 14,
    letterSpacing: 1,
  },
  socialProofText: {
    color: theme.colors.dust,
    fontSize: 13,
  },
  hero: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.paper,
    fontSize: 33,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.dust,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 6,
  },
  testimonialsSection: {
    marginBottom: 16,
  },
  testimonialCard: {
    marginRight: 12,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  testimonialStars: {
    color: theme.colors.paleGold,
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 8,
  },
  testimonialQuote: {
    color: theme.colors.paper,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  testimonialAuthor: {
    color: theme.colors.dust,
    fontSize: 12,
  },
  testimonialDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.softStone,
    opacity: 0.6,
  },
  dotActive: {
    width: 16,
    backgroundColor: theme.colors.sacredGold,
    opacity: 1,
  },
  features: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    color: theme.colors.paper,
    fontSize: 14,
    flex: 1,
  },
  lossAversion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(120, 113, 108, 0.15)',
    borderRadius: 8,
    marginBottom: 16,
  },
  lossAversionText: {
    fontSize: 13,
    color: theme.colors.shadow,
    flex: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 13,
    color: theme.colors.sacredGold,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  plans: {
    marginBottom: 14,
    gap: 10,
  },
  planOption: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planOptionAnnual: {
    borderWidth: 2,
    borderColor: theme.colors.paleGold,
    paddingTop: 18,
  },
  planOptionSelected: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(212, 168, 106, 0.12)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.paleGold,
  },
  bestValueText: {
    color: theme.colors.deepVoid,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.softStone,
  },
  radioSelected: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(212, 168, 106, 0.24)',
  },
  planName: {
    color: theme.colors.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  planMonthlyEquivalent: {
    color: theme.colors.paleGold,
    fontSize: 12,
    marginTop: 2,
  },
  planPrice: {
    color: theme.colors.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  planPriceStrikethrough: {
    color: theme.colors.shadow,
    fontSize: 12,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  planPriceMonthly: {
    color: theme.colors.shadow,
    fontSize: 15,
    fontWeight: '600',
  },
  ctaButton: {
    marginTop: 2,
    marginBottom: 14,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: theme.colors.deepVoid,
    fontSize: 18,
    fontWeight: '800',
  },
  ctaArrow: {
    marginLeft: 6,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  trustDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 6,
  },
  trustText: {
    color: theme.colors.dust,
    fontSize: 11,
    textAlign: 'center',
  },
  valueFrame: {
    color: theme.colors.paper,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 10,
  },
  securityText: {
    color: theme.colors.shadow,
    fontSize: 11,
    textAlign: 'center',
  },
  unavailableNotice: {
    color: theme.colors.shadow,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  footerDot: {
    color: theme.colors.shadow,
    marginHorizontal: 8,
  },
  footerLink: {
    color: theme.colors.dust,
    fontSize: 12,
  },
});
