# Ryvro Screenshot Capture Checklist

Last updated: 2026-06-24

Use this checklist after TestFlight, Play internal testing, or production-equivalent builds are installed. Do not use Expo Go, web previews, local development-client screenshots, or mock account data for App Store or Google Play submission screenshots.

The screenshots must show the current concept:

> Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.

Do not capture old builder, tab, dashboard, stats, or calendar-first screens for store submission.

## Preconditions

- Reviewer account `reviewer@getryvro.com` exists in the production Ryvro Firebase project.
- The account can complete the new simplified setup flow.
- Ryvro Pro sandbox products are configured.
- App display name is `Ryvro`.
- Installed bundle/package is `com.ryvro.shiftplanner`.
- Legal/support pages are live:
  - `https://getryvro.com/privacy`
  - `https://getryvro.com/terms`
  - `https://getryvro.com/support`
  - `https://getryvro.com/delete-account`

## Required Store Frames

| File name                          | Store surface     | Required size / device       | Screen                       |
| ---------------------------------- | ----------------- | ---------------------------- | ---------------------------- |
| `app-store-iphone-01-welcome.png`  | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Welcome screen               |
| `app-store-iphone-02-setup.png`    | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Simple shift setup           |
| `app-store-iphone-03-ask.png`      | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Ask screen with Ryvro answer |
| `app-store-iphone-04-paywall.png`  | App Store iPhone  | 1290 x 2796, 6.9 inch bucket | Ryvro Pro paywall            |
| `app-store-ipad-01-welcome.png`    | App Store iPad    | 2048 x 2732, 13 inch bucket  | Welcome screen               |
| `app-store-ipad-02-ask.png`        | App Store iPad    | 2048 x 2732, 13 inch bucket  | Ask screen with Ryvro answer |
| `app-store-ipad-03-paywall.png`    | App Store iPad    | 2048 x 2732, 13 inch bucket  | Ryvro Pro paywall            |
| `google-play-phone-01-welcome.png` | Google Play phone | 1080 x 1920 or higher, 9:16  | Welcome screen               |
| `google-play-phone-02-setup.png`   | Google Play phone | 1080 x 1920 or higher, 9:16  | Simple shift setup           |
| `google-play-phone-03-ask.png`     | Google Play phone | 1080 x 1920 or higher, 9:16  | Ask screen with Ryvro answer |
| `google-play-phone-04-paywall.png` | Google Play phone | 1080 x 1920 or higher, 9:16  | Ryvro Pro paywall            |

## Optional Extra Frames

- `app-store-iphone-05-known-date.png` - known date setup.
- `app-store-iphone-06-try-ryvro.png` - onboarding voice trial.
- `google-play-phone-05-reminders.png` - reminder setup.

## Capture Rules

- Use real native builds only: TestFlight, Play internal testing, or production-equivalent release builds.
- Export Google Play files as JPEG or 24-bit PNG without alpha.
- Keep every Google Play screenshot at 3840 px or less on the longest side.
- Keep the long side no more than twice the short side.
- Use the Ryvro visual system: dark base, cyan, blue `#147cff`, silver, and muted text.
- Do not show shift-specific random colors.
- Do not include private employer names, exact workplace names, personal phone notifications, or real user email addresses outside the reviewer account.
- Do not add price claims, ranking claims, testimonials, or `best` / `#1` claims to screenshots.
- Keep the paywall screenshot aligned with `ryvro_pro_monthly`, `ryvro_pro_annual`, entitlement `pro`, and offering `default`.
- If a screenshot shows subscription copy, verify App Store Connect and Play Console metadata match the visible product names and trial language.

## Evidence To Record

After capture, update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` with:

- device model
- OS version
- app build number or Android versionCode
- capture date
- account used
- final file list
- any rejected or retaken frames

Keep the screenshot files out of Git unless the owner explicitly decides to version final store artwork in the repository.
