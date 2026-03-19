import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onDismiss, onboardingData }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const tLoose = t as unknown as (key: string, options?: Record<string, unknown>) => string;
  const { restorePurchases } = useSubscription();
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [dismissVisible, setDismissVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const purchasesAvailable = useMemo(() => isRevenueCatAvailable(), []);
  const ctaPulse = useSharedValue(1);
  const openedAtRef = useRef(Date.now());

  const paywallAnalyticsMetadata = useMemo(
    () => ({
      platform: Platform.OS,
      country: onboardingData?.country ?? null,
      roster_type: onboardingData?.rosterType ?? null,
      pain_point: onboardingData?.painPoint ?? null,
    }),
    [onboardingData?.country, onboardingData?.painPoint, onboardingData?.rosterType]
  );

  const featureRows: FeatureRow[] = useMemo(
    () => [
      {
        icon: 'calendar-outline',
        text:
          onboardingData?.rosterType === 'fifo'
            ? t('subscription.paywall.features.fullYearFIFO')
            : onboardingData?.rosterType === 'rotating'
              ? t('subscription.paywall.features.fullYearRotating')
              : t('subscription.paywall.features.fullYear'),
      },
      { icon: 'mic-outline', text: t('subscription.paywall.features.askRoster') },
      { icon: 'cloud-offline-outline', text: t('subscription.paywall.features.offline') },
      { icon: 'airplane-outline', text: t('subscription.paywall.features.leavePlanning') },
      { icon: 'sparkles-outline', text: t('subscription.paywall.features.aiPowered') },
    ],
    [onboardingData?.rosterType, t]
  );

  const testimonials: Testimonial[] = useMemo(
    () => [
      {
        quote: String(tLoose('subscription.paywall.testimonials.0.quote')),
        author: String(tLoose('subscription.paywall.testimonials.0.author')),
        stars: 5,
      },
      {
        quote: String(tLoose('subscription.paywall.testimonials.1.quote')),
        author: String(tLoose('subscription.paywall.testimonials.1.author')),
        stars: 5,
      },
      {
        quote: String(tLoose('subscription.paywall.testimonials.2.quote')),
        author: String(tLoose('subscription.paywall.testimonials.2.author')),
        stars: 5,
      },
    ],
    [tLoose]
  );

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }));

  useEffect(() => {
    Analytics.paywallViewed('aha_moment', paywallAnalyticsMetadata);

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
  }, [paywallAnalyticsMetadata]);

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

  const annualMonthlyEquivalent = useMemo(() => {
    if (!annualPackage) return '$2.99';
    const monthlyEquivalent = annualPackage.product.price / 12;
    const currencySymbol = annualPackage.product.priceString.replace(/[0-9.,\s]/g, '') || '$';
    return `${currencySymbol}${monthlyEquivalent.toFixed(2)}`;
  }, [annualPackage]);

  const savingsPercent = useMemo(() => {
    if (!annualPackage || !monthlyPackage) return 57;
    const annualAsMonthly = annualPackage.product.price / 12;
    const monthly = monthlyPackage.product.price;
    if (monthly <= 0) return 57;
    return Math.round((1 - annualAsMonthly / monthly) * 100);
  }, [annualPackage, monthlyPackage]);

  const paywallTitle = onboardingData?.name
    ? t('subscription.paywall.title_named', { name: onboardingData.name })
    : t('subscription.paywall.title');

  const handleDismiss = () => {
    Analytics.paywallDismissed({
      time_on_paywall_seconds: Math.max(0, Math.round((Date.now() - openedAtRef.current) / 1000)),
      platform: Platform.OS,
      trigger_source: 'aha_moment',
    });
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
      Analytics.paywallSubscribeTapped(selectedPlan, {
        platform: Platform.OS,
      });
      const { Purchases } = revenueCatRuntime;
      await Purchases.purchasePackage(selectedPackage);
      Analytics.trialStarted(selectedPlan, selectedPackage.product.price ?? 0);
      onDismiss();
    } catch {
      // User cancelled or purchase failed — keep paywall visible.
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Analytics.paywallRestoreTapped({
      platform: Platform.OS,
      trigger_source: 'aha_moment',
    });
    await restorePurchases();
    onDismiss();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Blurred calendar background */}
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
        {/* Dismiss / spacer */}
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

        {/* FREE TRIAL badge — the #1 conversion signal */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={14} color={theme.colors.sacredGold} />
          <Text style={styles.trialBadgeText}>
            {t('subscription.paywall.trialBadge', {
              defaultValue: 'FREE 7-DAY TRIAL · NO CHARGE TODAY',
            })}
          </Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>{paywallTitle}</Text>
          <Text style={styles.subtitle}>{t('subscription.paywall.subtitle')}</Text>
        </View>

        {/* ── Testimonials ── */}
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
                {/* Gold top accent */}
                <View style={styles.cardTopAccent} />
                <View style={styles.testimonialInner}>
                  <Text style={styles.testimonialStars}>{'★'.repeat(testimonial.stars)}</Text>
                  <Text style={styles.testimonialQuote}>{`"${testimonial.quote}"`}</Text>
                  <Text style={styles.testimonialAuthor}>— {testimonial.author}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.pageDots}>
            {testimonials.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeTestimonial === index && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* ── Features card ── */}
        <View style={styles.featuresCard}>
          <View style={styles.cardTopAccent} />
          {featureRows.map((feature, index) => (
            <View
              key={feature.text}
              style={[styles.featureRow, index < featureRows.length - 1 && styles.featureRowBorder]}
            >
              <View style={styles.featureIconBadge}>
                <Ionicons name={feature.icon} size={15} color={theme.colors.sacredGold} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Plan selector ── */}
        {loading ? (
          <ActivityIndicator color={theme.colors.paleGold} style={styles.loader} />
        ) : (
          <View style={styles.plans}>
            {/* Annual plan */}
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
                <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]}>
                  {selectedPlan === 'annual' && <View style={styles.radioDot} />}
                </View>
                <View>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>{t('subscription.paywall.plans.annual')}</Text>
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>
                        {t('subscription.paywall.plans.savePercent', {
                          percent: savingsPercent,
                          defaultValue: 'SAVE {{percent}}%',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.planMonthlyEquivalent}>
                    {annualMonthlyEquivalent}
                    {t('subscription.paywall.plans.perMonth', { defaultValue: '/month' })}
                  </Text>
                </View>
              </View>
              <View style={styles.planRight}>
                <Text style={styles.planPriceStrikethrough}>
                  {monthlyPrice}
                  {t('subscription.paywall.plans.monthlySuffix')}
                </Text>
                <Text style={styles.planPrice}>
                  {annualPrice}
                  {t('subscription.paywall.plans.annualSuffix')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Monthly plan */}
            <TouchableOpacity
              style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionSelected]}
              onPress={() => handleSelectPlan('monthly')}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPlan === 'monthly' }}
            >
              <View style={styles.planLeft}>
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]}>
                  {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.planName}>{t('subscription.paywall.plans.monthly')}</Text>
              </View>
              <Text style={styles.planPriceMonthly}>
                {monthlyPrice}
                {t('subscription.paywall.plans.monthlySuffix')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Loss aversion — placed directly above CTA for max impact ── */}
        <View style={styles.lossAversion}>
          <Ionicons name="lock-closed-outline" size={15} color={theme.colors.sacredGold} />
          <Text style={styles.lossAversionText}>
            {t('subscription.paywall.lossAversion', {
              defaultValue: "Without Pro, you're back to counting shifts on your hands.",
            })}
          </Text>
        </View>

        {/* ── CTA button ── */}
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
                    size={20}
                    color={theme.colors.deepVoid}
                    style={styles.ctaArrow}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Trust row ── */}
        <View style={styles.trustCard}>
          <View style={styles.trustItem}>
            <Ionicons name="calendar-outline" size={15} color={theme.colors.sacredGold} />
            <Text style={styles.trustText}>
              {t('subscription.paywall.trust.freeTrial', { defaultValue: '7 days free' })}
            </Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="close-circle-outline" size={15} color={theme.colors.sacredGold} />
            <Text style={styles.trustText}>
              {t('subscription.paywall.trust.cancel', { defaultValue: 'Cancel anytime' })}
            </Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="card-outline" size={15} color={theme.colors.sacredGold} />
            <Text style={styles.trustText}>
              {t('subscription.paywall.trust.noCharge', { defaultValue: 'No charge today' })}
            </Text>
          </View>
        </View>

        {/* Value frame */}
        <Text style={styles.valueFrame}>
          {t('subscription.paywall.valueFrame', {
            defaultValue: 'Less than a coffee per week to know your next 3 months.',
          })}
        </Text>

        {/* Security */}
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

        {/* Footer links */}
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

  // ── FREE TRIAL badge ──
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(180,83,9,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.30)',
    marginTop: 8,
    marginBottom: 14,
  },
  trialBadgeText: {
    color: theme.colors.sacredGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
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

  // ── Shared card accent ──
  cardTopAccent: {
    height: 2,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.3,
  },

  // ── Testimonials ──
  testimonialsSection: {
    marginBottom: 16,
  },
  testimonialCard: {
    marginRight: 12,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  testimonialInner: {
    padding: 16,
  },
  testimonialStars: {
    color: theme.colors.paleGold,
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: 10,
  },
  testimonialQuote: {
    color: theme.colors.paper,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    color: theme.colors.dust,
    fontSize: 12,
  },
  pageDots: {
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

  // ── Features ──
  featuresCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  featureIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(180,83,9,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: theme.colors.paper,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // ── Loss aversion ──
  lossAversion: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(180,83,9,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.20)',
    marginBottom: 16,
  },
  lossAversionText: {
    fontSize: 13,
    color: theme.colors.paper,
    lineHeight: 18,
    textAlign: 'center',
  },

  // ── Timer ──
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(180,83,9,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.15)',
    marginBottom: 14,
  },
  timerText: {
    fontSize: 13,
    color: theme.colors.dust,
    fontWeight: '500',
  },
  timerValue: {
    color: theme.colors.sacredGold,
    fontWeight: '700',
  },

  loader: {
    marginVertical: 20,
  },

  // ── Plan selector ──
  plans: {
    marginBottom: 14,
    gap: 10,
  },
  planOption: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planOptionAnnual: {
    borderWidth: 2,
    borderColor: theme.colors.paleGold,
    paddingTop: 20,
  },
  planOptionSelected: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(180,83,9,0.10)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.paleGold,
  },
  bestValueText: {
    color: theme.colors.deepVoid,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.sacredGold,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.sacredGold,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(180,83,9,0.18)',
  },
  savingsText: {
    color: theme.colors.sacredGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    marginBottom: 2,
    textDecorationLine: 'line-through',
  },
  planPriceMonthly: {
    color: theme.colors.shadow,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── CTA ──
  ctaButton: {
    marginTop: 2,
    marginBottom: 14,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
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
    letterSpacing: 0.2,
  },
  ctaArrow: {
    marginLeft: 8,
  },

  // ── Trust row ──
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  trustDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trustText: {
    color: theme.colors.dust,
    fontSize: 11,
    textAlign: 'center',
    flexShrink: 1,
  },

  // ── Value frame + security ──
  valueFrame: {
    color: theme.colors.paper,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 19,
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

  // ── Footer ──
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
