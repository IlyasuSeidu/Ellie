# Ryvro Store Submission Form Draft

Last updated: 2026-05-31

This is a repo-side draft for the account-owner fields in App Store Connect and Google Play Console. It is not legal advice. Re-check the current console wording before submission and keep the answers aligned with the published privacy policy, RevenueCat setup, Firebase project, AI provider configuration, and production build behavior.

Primary references checked on 2026-05-31:

- Apple App Store Connect app privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Google Play Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111

## Shared Submission Values

- App name: Ryvro Shift Planner
- Native display name: Ryvro
- Bundle ID: com.ryvro.shiftplanner
- Android package: com.ryvro.shiftplanner
- Category: Productivity
- Support URL: https://getryvro.com/support
- Account deletion URL: https://getryvro.com/delete-account
- Privacy policy URL: https://getryvro.com/privacy
- Terms URL: https://getryvro.com/terms
- Support email: support@getryvro.com
- Reviewer account: reviewer@getryvro.com
- Subscription entitlement: pro
- Monthly product: ryvro_pro_monthly
- Annual product: ryvro_pro_annual

## App Store Connect App Privacy Draft

Use the most conservative accurate answers for the first release because Ryvro uses Firebase, RevenueCat, store purchases, optional voice/AI features, analytics, diagnostics, and user-created schedule data.

### Data Collection

Answer: Yes, Ryvro and third-party partners collect data from this app.

Data types to review and disclose:

- Contact Info: email address and name.
- User Content: shift schedules, roster patterns, holiday exceptions, one-off exceptions, reminder settings, calendar import/export content, typed AI builder prompts, and optional voice question transcripts or audio-derived content.
- Identifiers: Firebase Auth UID, RevenueCat app user ID or purchase identifiers, device identifiers used by Firebase/diagnostics, and platform purchase identifiers exposed by the stores or RevenueCat.
- Purchases: subscription status, entitlement state, trial state, product identifiers, and transaction identifiers. Do not declare full payment card details unless a future build directly collects them.
- Usage Data: app interactions, feature usage, schedule setup source, template choices, and subscription/paywall events.
- Diagnostics: crash logs, performance data, error logs, and build/device diagnostics.

Data types not expected for the first release unless implementation changes:

- Location: Ryvro does not request GPS or precise location permission.
- Contacts: Ryvro does not request address book permission.
- Health and Fitness: Ryvro is not a health tracking app.
- Financial Info: Ryvro does not directly collect card, bank, or credit information; app-store billing is handled by Apple/Google and subscription state by RevenueCat.
- Sensitive Info: do not ask for race, religion, sexual orientation, biometric, or similar sensitive categories.
- Browsing History/Search History: not part of the app.

### Linked To User

Mark linked to user where the console asks for each collected type if it can be associated with the Ryvro account, Firebase Auth UID, RevenueCat user ID, or device/account identity:

- Contact Info
- User Content
- Identifiers
- Purchases
- Usage Data
- Diagnostics

### Tracking

Answer: No, Ryvro does not use collected data to track users across apps or websites owned by other companies for advertising or data-broker purposes.

Do not add advertising SDKs or cross-app tracking identifiers without updating this draft, the privacy policy, the App Privacy answers, and the Google Play Data safety form.

### Collection Purposes

Use these purposes where available:

- App Functionality: account access, schedule creation, reminders, calendar import/export, saved settings, subscription gating, purchase restore, AI builder, voice assistant, and offline schedule recovery.
- Analytics: feature usage, setup funnel quality, reliability, and broad launch-persona/template reporting.
- Product Personalization: schedule-specific dashboard, current shift colors/icons, reminders, and assistant answers.
- Developer Communications: support requests, account deletion, verification email, and password reset email.

Do not claim third-party advertising, data brokerage, or unrelated marketing use unless the shipped build changes.

## Google Play Data Safety Draft

Answer the form for every app track, including internal testing, closed testing, open testing, and production.

### Security Practices

- Data is encrypted in transit: Yes.
- Users can request data deletion: Yes.
- Data deletion URL: https://getryvro.com/delete-account
- Independent security review: No, unless a real independent review has been completed.
- Committed to Google Play Families policy: No, unless the target audience later includes children.

### Data Collected

Declare collection for these categories if the production build keeps the current Firebase/RevenueCat/AI behavior:

- Personal info: name, email address, user IDs, occupation/profile fields, workplace/company profile fields, and country/language settings.
- App activity: app interactions, in-app search or assistant interactions, feature usage, and setup source/template events.
- App info and performance: crash logs, diagnostics, performance data, and app version/device context.
- Device or other IDs: device identifiers, Firebase installation identifiers, RevenueCat identifiers, and store purchase identifiers exposed to the app.
- User-generated content: shift schedules, shift names, roster patterns, exceptions, reminder settings, calendar import/export content, typed prompts, and optional voice/AI question content.
- Financial info or purchases: declare purchase history/subscription status if the form maps RevenueCat/store subscription state to purchase data. Do not declare payment card details unless Ryvro directly collects them in a future build.
- Audio files: declare only if the submitted build sends raw or stored audio to a third party. If the build processes microphone input into transient speech recognition without storing or sharing raw audio, document that distinction in the form notes.

Do not declare location, contacts, photos/videos, health and fitness, web browsing history, or SMS/call log unless a future build adds those permissions or features.

### Sharing

Declare sharing with service providers where required by Google Play definitions:

- Firebase/Google Cloud for authentication, database, analytics, diagnostics, and backend functions.
- RevenueCat for subscription status, product loading, purchase restore, and entitlement state.
- Apple and Google app-store billing systems for purchases and receipts.
- OpenAI or the configured AI provider for AI builder and voice/schedule questions when enabled.

Use service provider / app functionality / analytics / fraud prevention purposes where the console asks.

### Optional Versus Required Data

- Required for app functionality: account identifiers, schedule data, settings, subscription entitlement state, diagnostics required for reliability, and reminders.
- Optional/user-initiated: voice questions, AI builder prompts, calendar import/export files, support screenshots/files, and optional profile fields not needed to save a schedule.

## Content Rating And Age Notes

Ryvro is a productivity app for working adults and is not directed at children.

Expected answers for first release:

- No gambling, contests, or real-money games.
- No dating or user matching.
- No user-to-user social network.
- No unrestricted web browser.
- No user-generated public feeds.
- No sale of physical goods.
- No medical diagnosis or health treatment claims.
- No employer, payroll, HR, fatigue-management, or safety-critical decision replacement claims.
- No clinical, emergency dispatch, aviation, rail, transport compliance, fatigue-management, mine-safety, or other regulated-duty replacement claims.
- In-app purchases: Yes, Ryvro Pro subscription.
- AI features: Yes, AI-assisted schedule drafting and schedule questions; users must review generated schedules before relying on them.

## Export Compliance Draft

Ryvro uses standard platform/network encryption such as HTTPS/TLS through Firebase, RevenueCat, app-store services, and API calls.

Use the non-exempt encryption answer only if a future build adds custom cryptography or regulated encryption behavior. The current Expo config sets `ITSAppUsesNonExemptEncryption` to `false`.

## App Access And Review Notes

Provide reviewer access only after the owner creates the production Firebase/Auth account and sandbox products:

- Reviewer email: reviewer@getryvro.com
- Reviewer password: create a fresh strong password immediately before submission.
- Subscription test path: use RevenueCat sandbox products `ryvro_pro_monthly` and `ryvro_pro_annual`, or configure the reviewer account with test entitlement access if the store review flow allows it.

Suggested review note:

Ryvro Shift Planner helps users create shift schedules from templates, manual setup, or natural-language descriptions. To test: sign in with the reviewer account, complete onboarding, open the Universal Shift Builder, save a schedule, view the dashboard/calendar, open Profile, open the Ryvro Pro paywall, and test sandbox purchase or restore. The app is a personal planning tool and does not replace employer rosters, payroll, HR systems, fatigue-management policy, or safety instructions.

For regulated or safety-critical roles, Ryvro is not a clinical, aviation, rail, emergency dispatch, transport compliance, fatigue-management, or mine-safety system. Users must follow their employer's official roster, handover, dispatch, duty-time, fatigue, safety, and compliance systems.

## Account-Owner Checks Before Submission

- Confirm the published privacy policy matches the answers above.
- Confirm Firebase, RevenueCat, OpenAI/AI provider, and analytics behavior match the answers above.
- Confirm no extra SDKs were added after this draft without updating privacy/data-safety answers.
- Confirm legal/support URLs are live before upload.
- Confirm the reviewer account exists and can complete onboarding.
- Confirm sandbox subscription purchase, cancellation, and restore work on iOS and Android.
