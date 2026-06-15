# Ryvro Screenshot Capture Checklist

Last updated: 2026-06-15

Use this checklist after TestFlight, Play internal testing, or production-equivalent builds are installed. Do not use Expo Go, web previews, local development-client screenshots, or mock account data for App Store or Google Play submission screenshots.

Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` beside this checklist to capture the full TestFlight iPhone and Android physical/internal-track smoke matrix. This screenshot checklist only covers final store artwork evidence.

Spec references checked on 2026-06-15:

- Apple App Store Connect requires screenshots in `.jpeg`, `.jpg`, or `.png`; for iOS apps, provide the current required iPhone 6.9 inch bucket and iPad 13 inch bucket when the app supports iPad. The existing 1290 x 2796 iPhone portrait size and 2048 x 2732 iPad portrait size are accepted in those buckets.
- Google Play requires JPEG or 24-bit PNG screenshots with no alpha channel, minimum dimension 320 px, maximum dimension 3840 px, and the long side no more than twice the short side. For app recommendation surfaces, use at least four app screenshots with 9:16 portrait at 1080 x 1920 or higher, or 16:9 landscape at 1920 x 1080 or higher.

## Preconditions

- Reviewer account `reviewer@getryvro.com` exists in the production Ryvro Firebase project.
- The account has completed onboarding with a non-mining template schedule, preferably healthcare, security, transport, hospitality, aviation, or rail.
- Ryvro Pro sandbox products are configured so the paywall can show the free-trial CTA, annual/monthly choices, restore purchases, privacy, and terms links.
- App display name is `Ryvro`.
- Installed bundle/package is `com.ryvro.shiftplanner`.
- Legal/support pages are live at:
  - `https://getryvro.com/privacy`
  - `https://getryvro.com/terms`
  - `https://getryvro.com/support`
  - `https://getryvro.com/delete-account`

## Required Store Frames

| File name                                     | Store surface     | Required size / device       | Screen                                                                                       |
| --------------------------------------------- | ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `app-store-iphone-01-template-start.png`      | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Universal Shift Builder template screen showing FIFO, healthcare, aviation, and rail options |
| `app-store-iphone-02-dashboard-calendar.png`  | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Dashboard/calendar showing current shift color, next shift, and calendar icons               |
| `app-store-iphone-03-paywall.png`             | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Ryvro Pro paywall showing free-trial CTA and restore purchases                               |
| `app-store-ipad-01-template-start.png`        | App Store iPad    | 2048 x 2732, 13 inch bucket  | Universal Shift Builder template screen showing broad launch templates                       |
| `app-store-ipad-02-dashboard-calendar.png`    | App Store iPad    | 2048 x 2732, 13 inch bucket  | Dashboard/calendar with readable shift colors and icons                                      |
| `app-store-ipad-03-paywall.png`               | App Store iPad    | 2048 x 2732, 13 inch bucket  | Ryvro Pro paywall showing free-trial CTA and restore purchases                               |
| `google-play-phone-01-template-start.png`     | Google Play phone | 1080 x 1920 or higher, 9:16  | Universal Shift Builder template screen showing broad launch templates                       |
| `google-play-phone-02-dashboard-calendar.png` | Google Play phone | 1080 x 1920 or higher, 9:16  | Dashboard/calendar showing current shift color, next shift, and calendar icons               |
| `google-play-phone-03-paywall.png`            | Google Play phone | 1080 x 1920 or higher, 9:16  | Ryvro Pro paywall; include this if submitting more than the minimum two Play screenshots     |

## Optional Extra Frames

- `app-store-iphone-04-ai-builder.png` - AI Builder prompt and generated preview.
- `app-store-iphone-05-manual-builder.png` - Manual sequence editor with shift colors and icons.
- `google-play-phone-04-exceptions.png` - Holiday or one-off exception editor.
- `google-play-phone-05-reminders.png` - Reminder profile setup.

For Google Play recommendation surfaces, capture at least one extra phone frame so the Play listing has four 9:16 app screenshots at 1080 x 1920 or higher.

## Capture Rules

- Use real native builds only: TestFlight, Play internal testing, or production-equivalent release builds.
- Use light/dark mode consistently across the set; prefer the default launch appearance unless the store listing explicitly says otherwise.
- Export Google Play files as JPEG or 24-bit PNG without alpha; do not submit transparent-background screenshots.
- Keep every Google Play screenshot at 3840 px or less on the longest side, and keep the long side no more than twice the short side.
- Do not include private employer names, exact workplace names, personal phone notifications, or real user email addresses outside the reviewer account.
- Do not add price claims, ranking claims, testimonials, or "best" / "#1" claims to screenshots.
- Keep the paywall screenshot aligned with the current store products: `ryvro_pro_monthly`, `ryvro_pro_annual`, entitlement `pro`, offering `default`.
- If a screenshot shows subscription copy, verify App Store Connect and Play Console product metadata match the visible product names and trial language.

## Evidence To Record

After capture, update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with:

- device model
- OS version
- app build number or Android versionCode
- capture date
- account used
- final file list
- any rejected or retaken frames

Also update the screenshot table in `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` or attach the equivalent non-secret screenshot evidence packet.

Keep the screenshot files out of Git unless the owner explicitly decides to version final store artwork in the repository.
