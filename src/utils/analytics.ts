import { logger } from '@/utils/logger';

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

type AnalyticsClient = {
  logScreenView: (params: { screen_name: string; screen_class: string }) => Promise<void>;
  logEvent: (name: string, params?: AnalyticsPayload) => Promise<void>;
};

function getAnalyticsClient(): AnalyticsClient | null {
  try {
    // Runtime-safe optional dependency: keeps app compiling even when native module
    // is not available in a given build flavor.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const analyticsModule = require('@react-native-firebase/analytics');
    const analyticsFactory = analyticsModule?.default;
    if (typeof analyticsFactory !== 'function') {
      return null;
    }
    return analyticsFactory() as AnalyticsClient;
  } catch {
    return null;
  }
}

async function safeCall(
  call: (client: AnalyticsClient) => Promise<void>,
  fallbackName: string,
  fallbackPayload?: AnalyticsPayload
): Promise<void> {
  const client = getAnalyticsClient();
  if (!client) {
    if (__DEV__) {
      // Keep Dev visibility for funnel instrumentation even when analytics SDK isn't present.
      logger.debug('[Analytics:no-op]', {
        event: fallbackName,
        payload: fallbackPayload ?? {},
      });
    }
    return;
  }

  try {
    await call(client);
  } catch (error) {
    if (__DEV__) {
      logger.warn('[Analytics:error]', {
        event: fallbackName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Typed event names — prevents typos and keeps the event schema consistent
export type OnboardingStep =
  | 'welcome'
  | 'shift_system'
  | 'roster_type'
  | 'shift_pattern'
  | 'custom_pattern'
  | 'fifo_custom_pattern'
  | 'phase_selector'
  | 'fifo_phase_selector'
  | 'start_date'
  | 'aha_moment'
  | 'shift_time_input'
  | 'completion';

export const Analytics = {
  // Called on every screen mount
  screenView: (screenName: string) =>
    void safeCall(
      (client) =>
        client.logScreenView({
          screen_name: screenName,
          screen_class: screenName,
        }),
      'screen_view',
      { screen_name: screenName, screen_class: screenName }
    ),

  // Onboarding funnel — call at top of each screen's useEffect
  onboardingStepViewed: (step: OnboardingStep, stepNumber: number) =>
    void safeCall(
      (client) =>
        client.logEvent('onboarding_step_viewed', {
          step,
          step_number: stepNumber,
        }),
      'onboarding_step_viewed',
      { step, step_number: stepNumber }
    ),

  // Called when user taps the continue button successfully
  onboardingStepCompleted: (step: OnboardingStep, timeSpentMs: number) =>
    void safeCall(
      (client) =>
        client.logEvent('onboarding_step_completed', {
          step,
          time_spent_ms: timeSpentMs,
        }),
      'onboarding_step_completed',
      { step, time_spent_ms: timeSpentMs }
    ),

  // Called if user backgrounds the app or the process is killed mid-onboarding
  onboardingAbandoned: (step: OnboardingStep, stepNumber: number) =>
    void safeCall(
      (client) =>
        client.logEvent('onboarding_abandoned', {
          step,
          step_number: stepNumber,
        }),
      'onboarding_abandoned',
      { step, step_number: stepNumber }
    ),

  // The moment that makes or breaks retention
  ahaMomentReached: (secondsSinceInstall: number) =>
    void safeCall(
      (client) =>
        client.logEvent('aha_moment_reached', {
          seconds_since_install: secondsSinceInstall,
        }),
      'aha_moment_reached',
      { seconds_since_install: secondsSinceInstall }
    ),

  // Hey Ellie demo on AhaMoment screen — tracks which suggestion drives most taps
  ahaMomentVoiceTried: (query: string) =>
    void safeCall(
      (client) =>
        client.logEvent('aha_moment_voice_tried', {
          query,
        }),
      'aha_moment_voice_tried',
      { query }
    ),

  // Paywall funnel
  paywallViewed: (source: 'post_aha' | 'profile' | 'feature_gate') =>
    void safeCall(
      (client) =>
        client.logEvent('paywall_viewed', {
          source,
        }),
      'paywall_viewed',
      { source }
    ),

  paywallPlanSelected: (plan: 'annual' | 'monthly') =>
    void safeCall(
      (client) =>
        client.logEvent('paywall_plan_selected', {
          plan,
        }),
      'paywall_plan_selected',
      { plan }
    ),

  trialStarted: (plan: 'annual' | 'monthly', price: number) =>
    void safeCall(
      (client) =>
        client.logEvent('trial_started', {
          plan,
          price,
        }),
      'trial_started',
      { plan, price }
    ),

  purchaseCompleted: (plan: 'annual' | 'monthly', price: number) =>
    void safeCall(
      (client) =>
        client.logEvent('purchase_completed', {
          plan,
          price,
        }),
      'purchase_completed',
      { plan, price }
    ),

  paywallDismissed: () =>
    void safeCall((client) => client.logEvent('paywall_dismissed'), 'paywall_dismissed'),

  // Habit signals
  notificationPermissionSoftShown: () =>
    void safeCall(
      (client) => client.logEvent('notification_soft_ask_shown'),
      'notification_soft_ask_shown'
    ),

  notificationPermissionGranted: () =>
    void safeCall(
      (client) => client.logEvent('notification_permission_granted'),
      'notification_permission_granted'
    ),

  notificationPermissionDeclined: () =>
    void safeCall(
      (client) => client.logEvent('notification_permission_declined'),
      'notification_permission_declined'
    ),

  // Retention checkpoints
  dayOneReturn: () => void safeCall((client) => client.logEvent('day_1_return'), 'day_1_return'),
  daySevenActive: () => void safeCall((client) => client.logEvent('day_7_active'), 'day_7_active'),
  dayThirtyActive: () =>
    void safeCall((client) => client.logEvent('day_30_active'), 'day_30_active'),
};
