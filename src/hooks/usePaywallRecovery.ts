/**
 * usePaywallRecovery
 *
 * Surfaces a soft recovery nudge for users who declined the paywall during
 * onboarding (tapped "continue with limited access" on the AhaMoment screen).
 *
 * Recovery window: 5 minutes → 7 days after decline.
 * - The 5-minute minimum prevents an instant re-prompt right after onboarding.
 * - After 7 days the nudge expires to avoid harassing dormant users.
 *
 * Dismissing the nudge removes the stored timestamp so it doesn't reappear.
 */

import { useState, useEffect, useCallback } from 'react';
import { appStateStorageService } from '@/services/AppStateStorageService';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';
import { useAuth } from '@/contexts/AuthContext';

// Show nudge no sooner than 5 minutes after decline (avoids instant re-prompt)
const MIN_DELAY_MS = 5 * 60 * 1000;
// Stop showing nudge after 7 days (user has made their choice for now)
const RECOVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface PaywallRecoveryState {
  /** True when the nudge should be shown to this user. */
  shouldNudge: boolean;
  /** Call when the user converts (purchases) or permanently dismisses the nudge. */
  dismissNudge: () => Promise<void>;
}

export function usePaywallRecovery(isPro: boolean): PaywallRecoveryState {
  const [shouldNudge, setShouldNudge] = useState(false);
  const { user } = useAuth();
  const [anonymousScope, setAnonymousScope] = useState<string | null>(null);
  const recoveryScope = user?.uid ?? anonymousScope;

  useEffect(() => {
    if (user?.uid) {
      setAnonymousScope(null);
      return undefined;
    }

    let isMounted = true;
    void subscriptionEntitlementCacheService.getActiveAnonymousScope().then((scope) => {
      if (!isMounted) return;
      setAnonymousScope(scope);
    });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    // Pro users never see the recovery nudge.
    if (isPro) {
      setShouldNudge(false);
      return;
    }

    setShouldNudge(false);
    void appStateStorageService.getPaywallDeclinedAt(recoveryScope).then((declinedAt) => {
      if (!declinedAt) return;
      if (!Number.isFinite(declinedAt) || declinedAt <= 0) return;

      const elapsed = Date.now() - declinedAt;
      if (elapsed >= MIN_DELAY_MS && elapsed <= RECOVERY_WINDOW_MS) {
        setShouldNudge(true);
      } else if (elapsed > RECOVERY_WINDOW_MS) {
        // Expired — clean up so we don't check again
        void appStateStorageService.clearPaywallDeclinedAt(recoveryScope);
      }
    });
  }, [isPro, recoveryScope]);

  // When a Pro user converts (isPro flips true), clear the nudge
  useEffect(() => {
    if (isPro) {
      void appStateStorageService.clearPaywallDeclinedAt(recoveryScope);
    }
  }, [isPro, recoveryScope]);

  const dismissNudge = useCallback(async () => {
    setShouldNudge(false);
    await appStateStorageService.clearPaywallDeclinedAt(recoveryScope);
  }, [recoveryScope]);

  return { shouldNudge, dismissNudge };
}
