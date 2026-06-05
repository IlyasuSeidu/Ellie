# Ryvro Privacy And Support Templates

Last updated: 2026-05-31

These templates are repo-side launch assets. They are not legal advice. Publish final versions on the production website or hosted policy pages before App Store Connect and Google Play submission.

Use `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md` beside this file for App Store privacy answers, Google Play Data safety answers, content rating, export compliance, and reviewer notes.

Static HTML launch-page drafts now live in `web/launch`. Review them, set final effective dates, connect the production domain, and verify the live HTTPS URLs before using them in App Store Connect, Google Play Console, RevenueCat, Firebase Auth email templates, or in-app legal links.

## Required Public URLs

- Privacy policy URL: `https://getryvro.com/privacy`
- Terms URL: `https://getryvro.com/terms`
- Support URL: `https://getryvro.com/support`
- Account deletion URL: `https://getryvro.com/delete-account`
- Support email: `support@getryvro.com`

If `getryvro.com` is not secured, use the final purchased Ryvro domain and update this file, App Store Connect, Google Play Console, RevenueCat, website footer, and in-app legal links together.

Repo-side page paths:

- Landing page: `web/launch/index.html`
- Privacy page: `web/launch/privacy/index.html`
- Terms page: `web/launch/terms/index.html`
- Support page: `web/launch/support/index.html`
- Account deletion page: `web/launch/delete-account/index.html`

## Privacy Policy Draft

# Ryvro Privacy Policy

Effective date: [insert date]

Ryvro Shift Planner helps shift workers create, edit, and understand work schedules. This policy explains what information Ryvro collects, how it is used, and the choices users have.

## Information We Collect

Account information:

- name
- email address
- authentication provider identifiers
- profile settings such as country, occupation, workplace, and language

Schedule information:

- shift names, colors, icons, start times, and end times
- repeating patterns and templates
- holiday exceptions and one-off exceptions
- reminder settings
- calendar import/export metadata

Device and app information:

- app version
- device type and operating system
- crash, diagnostic, and performance information
- analytics events used to understand app reliability and feature usage

Voice and AI information:

- typed or spoken schedule questions
- schedule context needed to answer the question
- AI builder prompts used to draft schedules

Payment information:

- subscription status and purchase identifiers from the App Store, Google Play, and RevenueCat
- Ryvro does not directly collect or store full payment card details

## How We Use Information

Ryvro uses information to:

- create and display shift schedules
- save schedule changes across devices
- send reminders and notifications
- answer schedule questions
- generate AI-assisted schedule drafts
- provide subscriptions and restore purchases
- improve reliability, security, and support
- detect and fix bugs

## Third-Party Services

Ryvro may use:

- Firebase for authentication, database, analytics, and backend services
- RevenueCat for subscription status and purchase management
- OpenAI or another AI provider for AI-assisted schedule parsing and voice answers
- Apple and Google services for app distribution, sign-in, purchases, notifications, and platform features

Only the information needed for each service is sent.

## Calendar Import And Export

Ryvro can import or export calendar files when the user chooses to do so. Exported calendar files may include shift names, times, colors, icons, schedule names, and metadata needed to preserve shift meaning.

## Notifications

Ryvro can send shift reminders if the user enables notifications. Users can turn notifications off in device settings or inside the app where available.

## Data Retention

Ryvro keeps account and schedule information while the account is active. Users can request deletion of account data from `https://getryvro.com/delete-account` or by contacting support.

## Children

Ryvro is not intended for children under the minimum age required by the app stores or local law.

## User Choices

Users can:

- edit schedule and profile information
- disable notifications
- stop using AI or voice features
- request account deletion
- contact support about privacy questions

## Contact

Email: support@getryvro.com

## Terms Of Service Draft

# Ryvro Terms Of Service

Effective date: [insert date]

Ryvro Shift Planner helps users plan and understand shift schedules. By using Ryvro, users agree to these terms.

## Not An Employer System

Ryvro is a personal planning tool. It does not replace an employer roster, payroll system, HR system, fatigue management policy, safety instruction, or official work direction. Users should confirm critical work times with their employer.

## Not For Safety-Critical Decisions

Ryvro is not a clinical, aviation, rail, emergency dispatch, transport compliance, fatigue-management, or mine-safety system. Users working in regulated or safety-critical roles must follow their employer's official roster, handover, dispatch, duty-time, fatigue, safety, and compliance systems.

## User Responsibility

Users are responsible for entering accurate schedule information and checking that generated schedules match their real roster before relying on them.

## AI Features

AI-assisted features can draft schedules or answer questions, but they may make mistakes. Users must review AI-generated schedules before saving or acting on them.

## Subscriptions

Paid features may be offered through Ryvro Pro. Subscription purchases, renewals, cancellations, refunds, and trials are handled by the App Store, Google Play, and RevenueCat according to platform rules.

## Acceptable Use

Users must not misuse Ryvro, interfere with the service, reverse engineer the app, or use the app for unlawful purposes.

## Availability

Ryvro aims to be reliable, including offline schedule visibility where supported, but no service is guaranteed to be available at all times.

## Limitation Of Liability

To the extent allowed by law, Ryvro is not liable for missed shifts, payroll issues, travel costs, safety incidents, employer disputes, or other losses caused by incorrect user input, AI mistakes, calendar sync issues, notification failures, or service outages.

## Contact

Email: support@getryvro.com

## Support Page Draft

# Ryvro Support

Need help with Ryvro?

Email: support@getryvro.com

Include:

- the email on your Ryvro account
- your device model
- iOS or Android version
- app version
- a short description of the issue
- screenshots if useful

Common support topics:

- building a schedule
- editing a saved schedule
- using AI builder
- importing or exporting a calendar
- changing a one-off day
- holiday exceptions
- reminders
- subscription and restore purchases
- account deletion

## Account Deletion Page Draft

# Delete Your Ryvro Account

Users can request deletion of their Ryvro account and associated app data at:

`https://getryvro.com/delete-account`

To request deletion, email support@getryvro.com with the subject "Ryvro account deletion request" and include the email address used for the Ryvro account.

Ryvro account deletion covers saved account profile data, schedules, shift templates, exceptions, reminder settings, AI builder prompts retained with the account, and app settings associated with the account.

Account deletion does not automatically cancel App Store or Google Play subscriptions. Users must cancel active subscriptions through their Apple ID or Google Play account to stop future billing.

Support may need to keep limited records required for security, fraud prevention, legal compliance, dispute handling, or completed subscription transactions.

Ryvro will confirm the request and complete deletion within the timeframe required by applicable law and app-store policy.

## Account Deletion Request Template

Subject: Ryvro account deletion request

Body:

Hello Ryvro Support,

Please delete my Ryvro account and associated app data.

Account email:
Country:
Optional notes:

I understand this may remove saved schedules and app settings.

## Support Email Templates

### Password Reset Help

Subject: Ryvro password reset help

Hi [name],

You can reset your Ryvro password from the sign-in screen by tapping "Forgot password?" and entering your account email.

If the reset email does not arrive, please check spam/junk folders and confirm you used the same email you used to create your Ryvro account.

Ryvro Support

### Subscription Restore Help

Subject: Ryvro Pro restore purchases

Hi [name],

To restore Ryvro Pro, open Ryvro, go to Profile or the paywall, and tap "Restore Purchases."

Make sure you are signed into the same Apple ID or Google account that made the original purchase.

If it still does not restore, send us:

- your Ryvro account email
- iOS or Android
- the purchase platform
- a screenshot of the purchase receipt if available

Ryvro Support

### Calendar Import Help

Subject: Ryvro calendar import help

Hi [name],

Ryvro can import supported calendar files when the file includes shift events with dates and times. If import does not look right, send the file source, the expected pattern, and a screenshot of the incorrect result.

Do not send sensitive employer documents unless you are comfortable sharing them with support.

Ryvro Support

### AI Builder Correction Help

Subject: Ryvro AI Builder correction

Hi [name],

The AI Builder creates a draft from your description, but you should always check the preview before saving.

If the draft is wrong, try adding:

- the exact sequence
- start and end times
- the date the pattern should match
- what shift you are on that date
- any days off, travel days, or swaps

Example:

"I work 4 days 6am-6pm, 4 nights 6pm-6am, 4 off. The match date is 2026-06-01 and that day is my second night."

Ryvro Support

## Firebase Auth Email Template Copy

Use these when configuring Firebase Auth templates.

Console settings:

- Sender name: Ryvro Support
- Reply-to email: support@getryvro.com
- Public action domain: getryvro.com
- Continue URL / action URL domain: https://getryvro.com
- Do not use retired Ellie sender names, reply-to addresses, or action domains in the production Firebase project.

### Verification Email

Subject: Verify your Ryvro email

Body:

Hi,

Confirm this email address so you can use it with Ryvro.

Verify email: %LINK%

If you did not create a Ryvro account, you can ignore this email.

Ryvro Support

### Email Change Confirmation

Subject: Your Ryvro email was changed

Body:

Hi,

The email address on your Ryvro account was changed.

If you made this change, no action is needed.

If you did not make this change, contact Ryvro Support immediately at support@getryvro.com.

Ryvro Support

### Password Reset Email

Subject: Reset your Ryvro password

Body:

Hi,

Use this link to reset your Ryvro password:

%LINK%

If you did not request a password reset, you can ignore this email.

Ryvro Support
