# Ellie — Paywall & Subscription Plan Tasks

Source of truth: `ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md` (PART 3 — Subscription: Ellie Pro)
Last updated: March 11, 2026
Status: **NOT STARTED** — zero subscription/paywall code exists in the codebase

> **Critical note from Apple policy:** Subscription code MUST be present in the first binary
> you submit. Apple does not allow you to retroactively paywall a feature that shipped free.
> Do not submit to the App Store until ALL tasks in this file are complete.

---

## Subscription Model Summary

| Feature                   | Free                | Ellie Pro |
| ------------------------- | ------------------- | --------- |
| Full onboarding           | ✅                  | ✅        |
| Dashboard overview        | ✅                  | ✅        |
| Profile editing           | ✅                  | ✅        |
| Current week calendar     | ✅                  | ✅        |
| Full year calendar view   | 🔒 Padlocked        | ✅        |
| Hey Ellie voice assistant | 🔒 Triggers paywall | ✅        |

**Subscription name:** Ellie Pro
**Sub-line:** "For shift workers who mean business"

| Plan       | Price       | Notes                                                             |
| ---------- | ----------- | ----------------------------------------------------------------- |
| Monthly    | $6.99/month | Charm pricing; above basic shift apps, justified by AI            |
| Annual     | $49.99/year | ~40% off monthly. Always display as "SAVE 40%"                    |
| Free Trial | 7 days      | No credit card required. Same conversion as 14 days; more urgency |

**RevenueCat entitlement ID:** `pro`
**Product IDs:** `ellie_pro_monthly`, `ellie_pro_annual`

---

## Execution Order (Chronological — Do Not Skip Steps)

```
TASK 1  → Install react-native-purchases
TASK 2  → Create SubscriptionContext.tsx
TASK 3  → Create useSubscription.ts
TASK 4  → Create PadlockOverlay.tsx
TASK 5  → Create PaywallScreen.tsx
TASK 6  → Edit App.tsx
TASK 7  → Edit CustomTabBar.tsx
TASK 8  → Edit MonthlyCalendarCard.tsx
TASK 9  → Edit ProfileScreen.tsx
TASK 10 → Add RevenueCat keys to .env
TASK 11 → Run quality gate
TASK 12 → RevenueCat dashboard setup (manual)
TASK 13 → App Store Connect subscription products (manual)
TASK 14 → Google Play subscription products (manual)
TASK 15 → Link products + create offering in RevenueCat (manual)
TASK 16 → Sandbox purchase test (manual)
```

---

## TASK 1 — Install react-native-purchases (RevenueCat SDK)

**Status:** ⬜ Not done

RevenueCat handles both iOS StoreKit and Android Play Billing through a single unified API.
Free tier covers apps earning up to $2.5k/month — no cost at launch.

```bash
cd /Users/Shared/Ellie
npx expo install react-native-purchases
```

**Verify installation:**

```bash
# Should show react-native-purchases in dependencies
cat package.json | grep react-native-purchases
```

**Expected output:** `"react-native-purchases": "x.x.x"` in dependencies.

**Why `npx expo install` and not `npm install`:**
`expo install` automatically pins the correct version compatible with your Expo SDK version.
Using `npm install` directly can install an incompatible version that breaks native builds.

---

## TASK 2 — Create `src/contexts/SubscriptionContext.tsx`

**Status:** ⬜ Not done
**File to create:** `/Users/Shared/Ellie/src/contexts/SubscriptionContext.tsx`
**File does not exist** — confirmed by codebase check.

This is the RevenueCat wrapper context. It:

- Configures the RevenueCat SDK on app mount using the correct platform key
- Exposes `isPro` (boolean) to all child components
- Exposes `openPaywall` (triggers the paywall from anywhere in the app)
- Exposes `restorePurchases` (lets users recover prior purchases)
- Listens for real-time subscription status changes via `addCustomerInfoUpdateListener`

**The entitlement ID must match exactly what you create in the RevenueCat dashboard (Task 12).**
`ENTITLEMENT_ID = 'pro'` — this string is the single source of truth.

```tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

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

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  onOpenPaywall,
}) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const apiKey =
      Platform.OS === 'ios'
        ? (process.env.REVENUECAT_IOS_KEY ?? '')
        : (process.env.REVENUECAT_ANDROID_KEY ?? '');

    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });

    Purchases.getCustomerInfo()
      .then((info: CustomerInfo) => {
        setIsPro(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
      })
      .catch(() => setIsPro(false))
      .finally(() => setIsLoading(false));

    const listener = Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      setIsPro(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      setIsPro(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
    } catch {
      // Silent — no change if nothing to restore
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
```

---

## TASK 3 — Create `src/hooks/useSubscription.ts`

**Status:** ⬜ Not done
**File to create:** `/Users/Shared/Ellie/src/hooks/useSubscription.ts`
**File does not exist** — confirmed by codebase check.

Convenience re-export so components import from `@/hooks/useSubscription` (the hooks path alias)
rather than `@/contexts/SubscriptionContext` directly. Keeps import paths consistent with every
other hook in the project (e.g., `useShiftAccent`, `useProfileData`).

```ts
export { useSubscription } from '@/contexts/SubscriptionContext';
```

---

## TASK 4 — Create `src/components/subscription/PadlockOverlay.tsx`

**Status:** ⬜ Not done
**File to create:** `/Users/Shared/Ellie/src/components/subscription/PadlockOverlay.tsx`
**Directory to create first:** `src/components/subscription/` (does not exist)
**File does not exist** — confirmed by codebase check.

This component is an absolute-fill overlay rendered on top of each locked calendar week row.
It dims the row to 72% black and centres a small padlock badge in the app's gold accent colour.
Tapping it calls `openPaywall()` which triggers the `PaywallScreen` in `App.tsx`.

**Theme tokens used** (all confirmed present in `src/utils/theme.ts`):

- `theme.colors.paleGold` — padlock icon colour
- `theme.colors.darkStone` — badge background
- `theme.colors.opacity.gold20` — badge border

```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

interface PadlockOverlayProps {
  onPress: () => void;
  testID?: string;
}

export const PadlockOverlay: React.FC<PadlockOverlayProps> = ({ onPress, testID }) => (
  <TouchableOpacity
    style={styles.overlay}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel="Upgrade to Ellie Pro to see full calendar"
    testID={testID}
  >
    <View style={styles.badge}>
      <Ionicons name="lock-closed" size={14} color={theme.colors.paleGold} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 10, 9, 0.72)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badge: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
  },
});
```

---

## TASK 5 — Create `src/screens/subscription/PaywallScreen.tsx`

**Status:** ⬜ Not done
**File to create:** `/Users/Shared/Ellie/src/screens/subscription/PaywallScreen.tsx`
**Directory to create first:** `src/screens/subscription/` (does not exist)
**File does not exist** — confirmed by codebase check.

This is a **full-screen** paywall (not a modal, not a navigation screen).
It is rendered directly from `App.tsx` as an overlay when `paywallVisible` is `true`.

**Paywall design rationale (research-backed conversion rates):**

- Full-screen format: 8–12% conversion vs 4–6% for modal
- Annual pre-selected by default: +8–12% conversion vs monthly-first
- "Start 7-Day Free Trial" CTA: outperforms plain "Subscribe" by 12–18%
- "No credit card required" subtext: reduces friction by 8–12%
- Exactly 5 benefit lines: sweet spot — 7+ reduces conversion by ~20%
- Gold gradient button: matches app accent colour; warm colours drive action

**Pricing fetched live from RevenueCat** via `Purchases.getOfferings()` — prices display
correctly in any currency and update without needing an app release.

**Props interface:**

```ts
interface PaywallScreenProps {
  onDismiss: () => void;
}
```

`onDismiss` is called:

1. When the user taps the close (×) button
2. When a purchase completes successfully (RevenueCat `CustomerInfoUpdateListener` auto-updates `isPro`)
3. When `Restore Purchases` completes

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '@/hooks/useSubscription';
import { theme } from '@/utils/theme';

const FEATURES = [
  { icon: 'mic-outline' as const, text: 'Ask "Hey Ellie" anything about your roster' },
  { icon: 'calendar-outline' as const, text: 'See your full year at a glance' },
  { icon: 'cloud-offline-outline' as const, text: 'Works underground, no signal needed' },
  { icon: 'chatbubble-ellipses-outline' as const, text: 'Instant answers about leave & patterns' },
  { icon: 'flash-outline' as const, text: 'Powered by AI — always improving' },
];

interface PaywallScreenProps {
  onDismiss: () => void;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onDismiss }) => {
  const insets = useSafeAreaInsets();
  const { restorePurchases } = useSubscription();
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        const current = offerings.current;
        if (current) {
          setAnnualPackage(current.annual ?? null);
          setMonthlyPackage(current.monthly ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) return;
    try {
      setPurchasing(true);
      await Purchases.purchasePackage(pkg);
      onDismiss(); // SubscriptionContext listener auto-updates isPro
    } catch {
      // User cancelled — do nothing
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
    onDismiss();
  };

  const annualPrice = annualPackage?.product.priceString ?? '$49.99';
  const monthlyPrice = monthlyPackage?.product.priceString ?? '$6.99';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel="Close"
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
          <Text style={styles.title}>Ellie Pro</Text>
          <Text style={styles.subtitle}>For shift workers who mean business</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Ionicons
                name={f.icon}
                size={18}
                color={theme.colors.paleGold}
                style={styles.featureIcon}
              />
              <Text style={styles.featureText}>{f.text}</Text>
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
                <Text style={styles.planName}>Annual</Text>
              </View>
              <View style={styles.planRight}>
                <Text style={styles.planPrice}>{annualPrice}/yr</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>SAVE 40%</Text>
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
                <Text style={styles.planName}>Monthly</Text>
              </View>
              <Text style={styles.planPrice}>{monthlyPrice}/mo</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing || loading}
          accessibilityRole="button"
          accessibilityLabel="Start 7-Day Free Trial"
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
              <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.noCard}>No credit card required · Cancel anytime</Text>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore} accessibilityRole="button">
            <Text style={styles.footerLink}>Restore Purchases</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  dismissButton: { alignSelf: 'flex-end', padding: 8, marginTop: 8 },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 32 },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: '800', color: theme.colors.paper, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: theme.colors.dust, marginTop: 6 },
  features: { marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  featureIcon: { marginRight: 12, marginTop: 1 },
  featureText: { flex: 1, fontSize: 15, color: theme.colors.paper, lineHeight: 22 },
  loader: { marginVertical: 24 },
  plans: { gap: 10, marginBottom: 24 },
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
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.dust,
  },
  radioSelected: { borderColor: theme.colors.paleGold, backgroundColor: theme.colors.paleGold },
  planName: { fontSize: 16, fontWeight: '600', color: theme.colors.paper },
  planPrice: { fontSize: 15, color: theme.colors.dust },
  saveBadge: {
    backgroundColor: theme.colors.paleGold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveText: { fontSize: 10, fontWeight: '800', color: theme.colors.deepVoid },
  ctaButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700', color: theme.colors.deepVoid },
  noCard: { textAlign: 'center', color: theme.colors.dust, fontSize: 13, marginTop: 12 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerLink: { fontSize: 13, color: theme.colors.dust },
  footerDot: { color: theme.colors.softStone },
});
```

---

## TASK 6 — Edit `App.tsx` — Add SubscriptionProvider + PaywallScreen overlay

**Status:** ⬜ Not done
**File to edit:** `/Users/Shared/Ellie/App.tsx`

**Current state of App.tsx (verified March 11, 2026):**

- Line 1–10: imports (React, StatusBar, StyleSheet, View, NavigationContainer, SafeAreaProvider, GestureHandlerRootView, AppNavigator, AuthProvider, OnboardingProvider, LanguageProvider, VoiceAssistantProvider, useShiftAccent)
- Lines 38–54: `export default function App()` — current provider stack is:
  `GestureHandlerRootView → SafeAreaProvider → AuthProvider → OnboardingProvider → LanguageProvider → VoiceAssistantProvider → AppContent`
- No `SubscriptionProvider` exists
- No `PaywallScreen` exists
- No `paywallVisible` state exists

**Change 1 — Add two imports at the top of the file (after line 10):**

```tsx
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { PaywallScreen } from './src/screens/subscription/PaywallScreen';
```

**Change 2 — Replace the entire `export default function App()` block (lines 38–54):**

Current (lines 38–54):

```tsx
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <LanguageProvider>
              <VoiceAssistantProvider>
                <AppContent />
              </VoiceAssistantProvider>
            </LanguageProvider>
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Replace with:

```tsx
export default function App() {
  const [paywallVisible, setPaywallVisible] = React.useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SubscriptionProvider onOpenPaywall={() => setPaywallVisible(true)}>
          <AuthProvider>
            <OnboardingProvider>
              <LanguageProvider>
                <VoiceAssistantProvider>
                  <AppContent />
                </VoiceAssistantProvider>
              </LanguageProvider>
            </OnboardingProvider>
          </AuthProvider>
          {paywallVisible && <PaywallScreen onDismiss={() => setPaywallVisible(false)} />}
        </SubscriptionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

**Why SubscriptionProvider wraps AuthProvider (not the other way around):**
`SubscriptionProvider` must be the outermost business-logic provider so that any component
anywhere in the tree can call `openPaywall()`. `AuthProvider` is inside it so auth logic
can optionally read subscription state in future if needed (v2). The `PaywallScreen` sits
inside `SubscriptionProvider` but outside the navigation tree so it renders as a true
full-screen overlay without any navigation stack involvement.

---

## TASK 7 — Edit `CustomTabBar.tsx` — Gate Center Mic Button on `isPro`

**Status:** ⬜ Not done
**File to edit:** `/Users/Shared/Ellie/src/components/navigation/CustomTabBar.tsx`

**Current state (verified March 11, 2026):**

- Line 30: `import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';`
- Line 31: `import { useShiftAccent } from '@/hooks/useShiftAccent';`
- Line 135: `const { state: voiceState, openModal } = useVoiceAssistant();`
- Lines 219–223: the `Ellie` branch in `handleTabPress` currently always calls `openModal()`:
  ```ts
  if (route.name === 'Ellie') {
    openModal();
    return;
  }
  ```

**Change 1 — Add `useSubscription` import at line 32 (after `useShiftAccent` import):**

Add this line after line 31:

```ts
import { useSubscription } from '@/hooks/useSubscription';
```

**Change 2 — Add hook call inside the component body (after line 135):**

After:

```ts
const { state: voiceState, openModal } = useVoiceAssistant();
```

Add:

```ts
const { isPro, openPaywall } = useSubscription();
```

**Change 3 — Replace lines 219–223 (the `Ellie` branch in `handleTabPress`):**

Current (lines 219–223):

```ts
// Center Ellie button opens modal instead of navigating
if (route.name === 'Ellie') {
  openModal();
  return;
}
```

Replace with:

```ts
// Center Ellie button — Pro: opens voice modal. Free: opens paywall.
if (route.name === 'Ellie') {
  if (isPro) {
    openModal();
  } else {
    openPaywall();
  }
  return;
}
```

**Behaviour after this change:**

- Free user taps gold mic → `openPaywall()` → `App.tsx` sets `paywallVisible = true` → `PaywallScreen` appears
- Pro user taps gold mic → `openModal()` → `VoiceAssistantModal` opens as before
- Nothing else in the tab bar changes

---

## TASK 8 — Edit `MonthlyCalendarCard.tsx` — Gate Non-Current Weeks

**Status:** ⬜ Not done
**File to edit:** `/Users/Shared/Ellie/src/components/dashboard/MonthlyCalendarCard.tsx`

**Current state (verified March 11, 2026):**

- File is 939 lines
- Line 13: existing imports start (`React, useCallback, useEffect, useMemo, useState, useRef`)
- Line 266: `const calendarGrid = useMemo(() => buildCalendarGrid(year, month), [year, month]);`
  — this is where `calendarGrid` is first computed; subscription logic goes right after this
- Lines 667–727: the `calendarGrid.map` week row rendering block:
  ```tsx
  {
    calendarGrid.map((week, weekIndex) => (
      <Animated.View
        key={`week-${weekIndex}`}
        style={[styles.weekRow, rowEntranceStyles[weekIndex]]}
      >
        {/* FIFO ribbons + day cells */}
      </Animated.View>
    ));
  }
  ```
- Line 906: `weekRow:` style definition exists; two new styles must be added alongside it

**Change 1 — Add two imports (after the existing import on line 46 that ends the import block):**

Add these two lines after the last existing import:

```ts
import { useSubscription } from '@/hooks/useSubscription';
import { PadlockOverlay } from '@/components/subscription/PadlockOverlay';
```

**Change 2 — Add subscription logic and `currentWeekIndex` after line 266:**

After:

```ts
const calendarGrid = useMemo(() => buildCalendarGrid(year, month), [year, month]);
```

Add:

```ts
const { isPro, openPaywall } = useSubscription();
const today = new Date();
const currentWeekIndex = calendarGrid.findIndex((week) =>
  week.some((day) => {
    if (day === null) return false;
    const d = new Date(year, month, day);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  })
);
```

**`currentWeekIndex` will be -1 for months that do not contain today.** When it is -1,
`!isCurrentWeek` is true for every row, so all weeks in past/future months show padlocks
for free users. That is correct behaviour — free users see only the current week.

**Change 3 — Replace the `calendarGrid.map` block (lines 667–727):**

Current (lines 667–727):

```tsx
{
  calendarGrid.map((week, weekIndex) => (
    <Animated.View key={`week-${weekIndex}`} style={[styles.weekRow, rowEntranceStyles[weekIndex]]}>
      {/* ...all existing FIFO ribbon + day cell code... */}
    </Animated.View>
  ));
}
```

Replace with (wrap each `Animated.View` in a relative `View` and append the overlay):

```tsx
{
  calendarGrid.map((week, weekIndex) => {
    const isCurrentWeek = weekIndex === currentWeekIndex;
    const isLocked = !isPro && !isCurrentWeek;
    return (
      <View key={`week-${weekIndex}`} style={styles.weekRowWrapper}>
        <Animated.View
          style={[styles.weekRow, rowEntranceStyles[weekIndex], isLocked && styles.weekRowLocked]}
        >
          {/* All existing FIFO ribbon + day cell code — unchanged */}
          {fifoPositionMap && gridWidth > 0 && (
            <>
              {getBlockRunsForRow(week, fifoPositionMap).map((run, runIdx) => {
                const ribbonColor = RIBBON_COLORS[run.blockType];
                const leftPos =
                  cellSpacing.offset + run.startCol * (CELL_WIDTH + cellSpacing.gap) + 2;
                const ribbonWidth =
                  run.length * (CELL_WIDTH + cellSpacing.gap) - cellSpacing.gap - 4;
                const rowDelay = animationDelay + 240 + weekIndex * 80;
                const ribbonDelay = rowDelay + runIdx * 30;
                return (
                  <AnimatedRibbon
                    key={`ribbon-${weekIndex}-${runIdx}-${year}-${month}`}
                    ribbonColor={ribbonColor}
                    leftPos={leftPos}
                    targetWidth={Math.max(ribbonWidth, 0)}
                    startsBlock={run.startsBlock}
                    endsBlock={run.endsBlock}
                    delay={ribbonDelay}
                    testID={`fifo-ribbon-${weekIndex}-${runIdx}`}
                  />
                );
              })}
            </>
          )}
          {week.map((day, dayIndex) => {
            if (day === null) {
              return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.emptyCell} />;
            }
            const shiftDay = shiftDayMap[day];
            const dayDate = new Date(year, month, day);
            const isTodayDate = checkIsToday(dayDate);
            return (
              <ShiftCalendarDayCell
                key={`day-${day}`}
                day={day}
                shiftType={shiftDay?.shiftType}
                rosterType={rosterType}
                fifoPosition={fifoPositionMap?.[day]}
                isToday={isTodayDate}
                selected={selectedDay === day}
                activeGlowColor={isTodayDate ? activeGlowColor : undefined}
                onPress={handleDayPress}
                onLongPress={fifoPositionMap ? handleLongPress : undefined}
                testID={`calendar-day-${day}`}
              />
            );
          })}
        </Animated.View>
        {isLocked && <PadlockOverlay onPress={openPaywall} testID={`padlock-week-${weekIndex}`} />}
      </View>
    );
  });
}
```

**Change 4 — Add two new styles to `StyleSheet.create` (alongside the existing `weekRow` style at line 906):**

```ts
  weekRowWrapper: {
    position: 'relative',
  },
  weekRowLocked: {
    opacity: 0.35,
  },
```

**Visual result:**

- Free user on current month: current week shows normally, all other weeks at 35% opacity with gold padlock overlay
- Pro user: all weeks show normally, no padlocks anywhere
- Free user navigates to a past/future month: every week shows padlocked (current week is in a different month)

---

## TASK 9 — Edit `ProfileScreen.tsx` — Add Subscription Status Row

**Status:** ⬜ Not done
**File to edit:** `/Users/Shared/Ellie/src/screens/main/ProfileScreen.tsx`

**Current state (verified March 11, 2026):**

- Line 16: `import { Ionicons } from '@expo/vector-icons';` — already imported, no change needed
- Line 18: `import { theme } from '@/utils/theme';` — already imported, no change needed
- Line 215: `<WorkStatsSummary data={profile.data} animationDelay={1200} />`
  — subscription row inserts immediately after this line
- Line 229: `{__DEV__ ? (` — subscription row inserts before this line
- Lines 286–308: `onboardingToolsSection`, `onboardingButton`, `onboardingButtonText`,
  `onboardingButtonHint` styles already exist in StyleSheet — the subscription row reuses them,
  so no new styles are needed

**Change 1 — Add `useSubscription` import (after line 31, the last import line):**

```ts
import { useSubscription } from '@/hooks/useSubscription';
```

**Change 2 — Add hook call inside component body (after the `useShiftAccent` hook on line 40):**

```ts
const { isPro, openPaywall } = useSubscription();
```

**Change 3 — Insert subscription row between line 215 and line 229:**

Insert after `<WorkStatsSummary data={profile.data} animationDelay={1200} />` (line 215)
and before `{__DEV__ ? (` (line 229):

```tsx
{
  /* Ellie Pro subscription row */
}
<View style={styles.onboardingToolsSection}>
  <Pressable
    style={styles.onboardingButton}
    onPress={isPro ? undefined : openPaywall}
    accessibilityRole="button"
    accessibilityLabel={isPro ? 'Ellie Pro — active' : 'Upgrade to Ellie Pro'}
    testID="subscription-row"
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={styles.onboardingButtonText}>
          {isPro ? 'Ellie Pro — Active ✓' : 'Upgrade to Ellie Pro'}
        </Text>
        <Text style={styles.onboardingButtonHint}>
          {isPro
            ? 'Full calendar · Hey Ellie voice assistant'
            : '7-day free trial · $6.99/mo or $49.99/yr'}
        </Text>
      </View>
      {!isPro && <Ionicons name="chevron-forward" size={18} color={theme.colors.paleGold} />}
    </View>
  </Pressable>
</View>;
```

**Visual result:**

- Free user: sees "Upgrade to Ellie Pro" row with gold chevron → tapping opens paywall
- Pro user: sees "Ellie Pro — Active ✓" row with no chevron and no tap action

---

## TASK 10 — Add RevenueCat Keys to `.env`

**Status:** ⬜ Not done — depends on Task 12 (RevenueCat dashboard setup)
**File to edit:** `/Users/Shared/Ellie/.env`

Add these two lines to `.env` (keys come from the RevenueCat dashboard after Task 12):

```
REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx
REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx
```

**Where to find the keys:**

- RevenueCat dashboard → your iOS app → API Keys → copy the key starting with `appl_`
- RevenueCat dashboard → your Android app → API Keys → copy the key starting with `goog_`

**Important:** `.env` is already listed in `.gitignore`. Do not commit these keys.
They will be pushed to EAS as encrypted secrets separately via:

```bash
eas secret:push --scope project --env-file .env
```

---

## TASK 11 — Run Quality Gate After All Code Changes

**Status:** ⬜ Not done — run after Tasks 1–10 are complete

```bash
cd /Users/Shared/Ellie
npm run type-check
npm test -- --runInBand --silent
npm run release:check
```

**All three commands must exit with code 0 before proceeding.**

- `type-check` — verifies TypeScript types are correct across all new subscription files and edits
- `npm test` — runs the full test suite (1,701+ tests); new files do not need their own tests
  but must not break existing ones
- `release:check` — runs the full release gate; exits 0 only if lint + type + test + backend:build
  all pass

If `type-check` fails, the most likely causes are:

- Missing `react-native-purchases` types (Task 1 not complete, or install failed)
- Incorrect import path (`@/hooks/useSubscription` resolves to `src/hooks/useSubscription.ts` — verify the file was created in Task 3)
- `theme.colors.brightGold` or `theme.colors.sacredGold` token does not exist — check `src/utils/theme.ts` and use whatever the correct gold token names are

---

## TASK 12 — RevenueCat Dashboard Setup (Manual)

**Status:** ⬜ Not done — you do this, not code
**URL:** https://app.revenuecat.com

Steps:

1. **Create a free RevenueCat account** at https://app.revenuecat.com
   (Free tier; no payment needed until revenue exceeds $2.5k/month)

2. **Create iOS app in RevenueCat:**
   - New App → Platform: App Store → Bundle ID: `com.ellie.minershiftassistant`
   - App name: `Ellie: Miner Shift Assistant`
   - Copy the iOS SDK key (starts with `appl_`) → paste into `.env` as `REVENUECAT_IOS_KEY`

3. **Create Android app in RevenueCat:**
   - New App → Platform: Google Play → Package: `com.ellie.minershiftassistant`
   - App name: `Ellie: Miner Shift Assistant`
   - Copy the Android SDK key (starts with `goog_`) → paste into `.env` as `REVENUECAT_ANDROID_KEY`

4. **Create entitlement:**
   - Entitlements → Add entitlement
   - Identifier: `pro` ← **must be exactly this string — matches `ENTITLEMENT_ID` in Task 2**
   - Display name: `Ellie Pro`

---

## TASK 13 — App Store Connect: Create Subscription Products (Manual)

**Status:** ⬜ Not done — you do this in App Store Connect
**Prerequisite:** Your app must be created in App Store Connect first (covered in ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md STEP 6)

1. Go to App Store Connect → your Ellie app → Subscriptions
2. Create subscription group: **"Ellie Pro"**
3. Add first subscription:
   - Reference name: `Ellie Pro Monthly`
   - Product ID: `ellie_pro_monthly`
   - Duration: 1 month
   - Price: $6.99 USD (or equivalent in your local currency)
   - Free trial: 7 days
   - Localised display name: `Ellie Pro`
   - Localised description: `Full calendar view and Hey Ellie voice assistant`
4. Add second subscription:
   - Reference name: `Ellie Pro Annual`
   - Product ID: `ellie_pro_annual`
   - Duration: 1 year
   - Price: $49.99 USD
   - Free trial: 7 days
   - Localised display name: `Ellie Pro Annual`
   - Localised description: `Full calendar view and Hey Ellie voice assistant — save 40%`

**Note:** Apple requires a screenshot of the paywall to be uploaded as part of the subscription
metadata. Use a screenshot of `PaywallScreen` from the iOS simulator.

---

## TASK 14 — Google Play Console: Create Subscription Products (Manual)

**Status:** ⬜ Not done — you do this in Google Play Console
**Prerequisite:** App must be created in Google Play Console first

1. Google Play Console → your Ellie app → Monetize → Subscriptions
2. Create first subscription:
   - Product ID: `ellie_pro_monthly` ← **must match App Store Connect exactly**
   - Name: `Ellie Pro Monthly`
   - Base plans → Add base plan:
     - Plan ID: `monthly`
     - Auto-renewing
     - Billing period: Monthly
     - Price: $6.99 USD
     - Free trial: 7 days
3. Create second subscription:
   - Product ID: `ellie_pro_annual`
   - Name: `Ellie Pro Annual`
   - Base plans → Add base plan:
     - Plan ID: `annual`
     - Auto-renewing
     - Billing period: Yearly
     - Price: $49.99 USD
     - Free trial: 7 days

**Activate both subscriptions** (they start in DRAFT state; you must activate them).

---

## TASK 15 — Link Products to Entitlement + Create Offering in RevenueCat (Manual)

**Status:** ⬜ Not done — do after Tasks 13 and 14
**Prerequisite:** Tasks 12, 13, and 14 must be complete first

1. **Add products to RevenueCat:**
   - RevenueCat dashboard → Products → Add product
   - Add `ellie_pro_monthly` (iOS App Store)
   - Add `ellie_pro_annual` (iOS App Store)
   - Add `ellie_pro_monthly` (Google Play)
   - Add `ellie_pro_annual` (Google Play)

2. **Attach products to the `pro` entitlement:**
   - Entitlements → `pro` → Attach products → select all four products above

3. **Create the default offering:**
   - Offerings → Create offering
   - Identifier: `default` ← **must be exactly `default`** — `PaywallScreen` uses `offerings.current` which reads the default offering
   - Add package: `Annual` → map to `ellie_pro_annual`
   - Add package: `Monthly` → map to `ellie_pro_monthly`

**Why the offering identifier matters:** In `PaywallScreen.tsx`:

```ts
Purchases.getOfferings().then((offerings) => {
  const current = offerings.current; // reads the "default" offering
  if (current) {
    setAnnualPackage(current.annual ?? null);
    setMonthlyPackage(current.monthly ?? null);
  }
});
```

`offerings.current` is null if no offering is named `default`. The paywall will show an
`ActivityIndicator` forever and users cannot purchase.

---

## TASK 16 — Sandbox Purchase Test (Manual)

**Status:** ⬜ Not done — final verification before store submission
**Prerequisite:** All tasks 1–15 must be complete

**iOS Sandbox Test:**

1. On a real iPhone (not simulator), install the development or preview build
2. Tap the gold mic button (not subscribed) → `PaywallScreen` should appear
3. Tap the annual plan (pre-selected by default) → tap "Start 7-Day Free Trial"
4. iOS prompts for sandbox Apple ID — use a sandbox tester account from App Store Connect → Users and Access → Sandbox Testers
5. Confirm the purchase
6. After confirmation:
   - Paywall should dismiss
   - Tap gold mic → `VoiceAssistantModal` opens (not paywall)
   - Profile screen shows "Ellie Pro — Active ✓"
   - All calendar weeks are visible, no padlocks
7. Tap any calendar week (verify padlock overlay is gone)
8. Tap "Restore Purchases" from a fresh install → should restore `isPro = true`

**Android Sandbox Test:**

1. Install via `eas build --platform android --profile preview` or direct APK sideload
2. Repeat steps 2–8 above using a Google Play License Tester account
   (Google Play Console → Setup → License testing → add your test account email)

---

## Verification Checklist

Run through this checklist before declaring subscription implementation complete:

```
□ react-native-purchases installed — visible in package.json dependencies
□ npm run type-check — 0 errors (all 4 new files + 4 edits type-safe)
□ npm test -- --runInBand --silent — all tests pass, no regressions
□ npm run release:check — exits code 0
□ App.tsx renders SubscriptionProvider above AuthProvider in provider tree
□ PaywallScreen appears when tapping center mic (not subscribed)
□ PaywallScreen appears when tapping any locked calendar week (not subscribed)
□ PaywallScreen shows Annual plan pre-selected by default
□ PaywallScreen CTA reads "Start 7-Day Free Trial" (not "Subscribe")
□ "No credit card required · Cancel anytime" subtext visible on paywall
□ "Restore Purchases · Privacy Policy" footer links visible on paywall
□ Completing 7-day free trial in RevenueCat sandbox → isPro = true
□ After subscribing: center mic opens VoiceAssistantModal (not paywall)
□ After subscribing: all calendar weeks visible, zero padlocks
□ After subscribing: ProfileScreen shows "Ellie Pro — Active ✓"
□ Unsubscribed ProfileScreen shows "Upgrade to Ellie Pro" row with gold chevron
□ Tapping "Upgrade to Ellie Pro" row opens paywall
□ "Restore Purchases" restores subscription correctly
□ RevenueCat dashboard shows completed sandbox purchase in Customer view
```

---

## Files Created by This Plan

| File                                             | Action | Purpose                                                             |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------- |
| `src/contexts/SubscriptionContext.tsx`           | CREATE | RevenueCat init, `isPro` state, `openPaywall`, `restorePurchases`   |
| `src/hooks/useSubscription.ts`                   | CREATE | Convenience re-export                                               |
| `src/components/subscription/PadlockOverlay.tsx` | CREATE | Calendar week lock overlay                                          |
| `src/screens/subscription/PaywallScreen.tsx`     | CREATE | Full-screen paywall UI                                              |
| `App.tsx`                                        | EDIT   | Add `SubscriptionProvider` wrapping + `PaywallScreen` overlay state |
| `CustomTabBar.tsx`                               | EDIT   | Gate center mic on `isPro` — line 32, 136, 219–223                  |
| `MonthlyCalendarCard.tsx`                        | EDIT   | Gate non-current weeks — after line 266, lines 667–727, StyleSheet  |
| `ProfileScreen.tsx`                              | EDIT   | Subscription status row — after line 215, before line 229           |
| `.env`                                           | EDIT   | Add `REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY`                  |
