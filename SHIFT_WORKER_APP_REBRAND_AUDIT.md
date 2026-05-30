# Miner-First, Universal-Ready Rebrand Audit

This audit lists the product, code, copy, asset, and release surfaces that should be updated so the app can launch with a sharp miner/FIFO wedge while keeping a universal shift-worker foundation underneath.

The current strategy is not a full universal-market rebrand on day one. The recommended strategy is:

- Launch positioning: miner-first, FIFO-first, built from real mining shift pain.
- Product foundation: universal schedule model, Universal Shift Builder, AI builder, manual builder, exceptions, reminders, and calendar import/export.
- Brand architecture: avoid permanent app names, bundle IDs, icons, or store identity that make future expansion into nurses, security, factories, transport, hospitality, emergency services, and other shift workers feel impossible.
- Expansion path: after miner/FIFO traction, broaden marketing and templates to other shift-worker industries without rewriting the core product.

In short: **market narrowly now, build broadly underneath.**

## Implementation Status: 2026-05-29

Completed in the current working tree:

- Replaced the tracked Expo identity with `Ryvro Shift Planner`, short display name `Ryvro`, slug `ryvro`, scheme `ryvro`, and native package/bundle identifier `com.ryvro.shiftplanner`.
- Updated local generated native Android and iOS identity files so the current workspace build output displays `Ryvro` and uses `com.ryvro.shiftplanner`.
- Replaced the app icon, adaptive icon, splash icon, favicon, and onboarding assistant avatar with neutral Ryvro assets.
- Removed the mining-helmet onboarding assistant asset family from the active asset set.
- Removed retired mining-helmet avatar references from publishable build-in-public story packs and expanded the content guard so active public content uses neutral Ryvro assistant/mark language instead.
- Rebranded primary English app copy, onboarding copy, paywall copy, settings/dashboard assistant copy, notification text, voice assistant UI, and calendar export metadata to `Ryvro`.
- Cleaned translated locale values so user-facing assistant strings no longer say Ellie in Chinese, Arabic, Hindi, or Russian.
- Added universal industry onboarding/e2e fixtures while preserving a miner/FIFO fixture as the launch wedge.
- Added a starter universal template catalog for healthcare, security, emergency services, manufacturing, transport, hospitality, aviation/rail, and mining FIFO examples.
- Added broad RevenueCat entitlement aliases while preserving old Ellie/miner aliases for backward compatibility.
- Added RevenueCat entitlement regression tests that pin Ryvro launch aliases while making the old Ellie/miner aliases explicit migration compatibility only.
- Added `RYVRO_BRAIN_URL` / `RYVRO_BRAIN_TIMEOUT` as the preferred voice-backend environment names while preserving the old `ELLIE_BRAIN_*` keys as migration fallbacks.
- Renamed the Firebase functions deploy codebase from `ellie-brain` to `ryvro-brain` in repo config and added `ryvroBrain` as the primary HTTPS function export. The old `ellieBrain` export remains as a compatibility endpoint until production clients and external dashboards have migrated.
- Renamed active Ryvro voice client/source symbols from the old Ellie brain naming to `RyvroBrain*` while preserving only the `ellieBrain` HTTP export as the legacy migration endpoint.
- Updated CI and e2e dummy brain endpoint environment values so both preferred and legacy compatibility variables point at the Ryvro test endpoint.
- Added repo-side App Store / Google Play listing copy in `docs/RYVRO_STORE_LISTING.md`.
- Added repo-side privacy policy, terms, support, account deletion, support email, and Firebase Auth email templates in `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`.
- Added account-side Firebase, Google OAuth, Apple Sign-In, RevenueCat, store, domain, social, analytics, and release verification handoff in `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md`.
- Added `npm run release:clearance` as a repeatable public preflight for Apple public software search, Google Play public page text, DNS/WHOIS, social URL statuses, and USPTO Trademark Search reachability.
- Added config regression tests that pin the tracked Expo app name, slug, scheme, iOS bundle ID, Android package, and app asset paths to the Ryvro launch identity.
- Verified the current working tree with full Jest and project validation after the rebrand cleanup.
- Archived old Ellie homescreen HTML prototypes and fixed-roster implementation plans so active docs point to the Universal Shift Builder path.
- Replaced the default e2e seed profile with a neutral shift-worker fixture while keeping a separate mining/FIFO launch-wedge fixture.
- Cleaned remaining launch-critical broad-market copy in README, English onboarding feature descriptions, selected translated placeholders/social proof, and onboarding icon source guidance.
- Hardened tracked generated-content guidance and publishable build-in-public packs so they use Ryvro naming, broad shift-worker discovery tags, and FIFO/shift-worker audience language instead of stale Ellie or mining-only tags.
- Re-ran local release clearance preflight, focused rebrand tests, full project validation, and GitHub CI after the latest cleanup. Latest pushed CI run for this branch passed on 2026-05-29.
- Added built-in fallback parser regression coverage across 20 shift-worker industry prompts so the AI builder fallback is proven beyond mining/FIFO examples.
- Added AI builder fallback metadata, friendlier fallback copy, and analytics events for parser completion, local fallback use, clarification, draft acceptance, manual edit after draft, and save context.
- Tightened exception, calendar, and reminder launch copy so one-off rows say they changed just that day, calendar export promises shift times/locations/notes, and smart reminder commute copy defaults to work location instead of site.
- Added calendar export metadata coverage for `LOCATION` and one-off exception notes in `.ics` files.
- Hardened the Ryvro voice backend system prompt so it does not assume mining, FIFO, or site-based work unless the user context says so, and added backend prompt tests for non-mining universal schedules.
- Added documentation regression tests that pin `docs/ARCHITECTURE.md` to the Universal Shift Builder source-of-truth architecture and keep the active FIFO guide template-specific.
- Added legal, privacy, support, external-service, and RevenueCat handoff regression tests so repo-side launch docs stay broad, Ryvro-named, and free of retired Ellie product aliases.
- Added backend analytics setup dimensions for industry, template, and schedule source so dashboards can segment universal schedule adoption without defaulting to mining/FIFO, and guarded legacy site/mining-site parameters as redacted sensitive fields.
- Updated Detox iOS release QA config to build/install the generated `Ryvro.app` product on the available iPhone 16 simulator instead of the retired `EllieMinerShiftAssistant.app` path; `npm run test:e2e:build:ios` passed on 2026-05-29T15:22:59Z and the built plist reports `CFBundleDisplayName = Ryvro`, `CFBundleName = Ryvro`, and `CFBundleIdentifier = com.ryvro.shiftplanner`.
- Added an iPhone XS Max simulator release QA target and passed the seeded dashboard smoke on a clean install: `E2E_TEST_MODE=1 npx detox test --configuration ios.release.xsmax e2e/dashboard.test.ts` passed 15/15 tests on 2026-05-29.
- Added an E2E RevenueCat guard so release simulator QA does not load RevenueCat with `test_` API keys, which trigger RevenueCat's native release-mode test-key protection alert.
- Built the Android debug APK on 2026-05-29 with package `com.ryvro.shiftplanner`; Android release-style Detox build, seeded dashboard smoke, auth form/navigation smoke, onboarding through Universal Shift Builder, and profile language-selector smoke now pass on `Medium_Phone_API_36.0`. Physical Android device QA and real provider auth remain pending.
- Tightened tracked Xcode product metadata so the iOS shared scheme and product file reference now point at `Ryvro.app`; `xcodebuild -workspace ios/Ellie.xcworkspace -scheme Ellie -configuration Release -showBuildSettings` reported `FULL_PRODUCT_NAME = Ryvro.app`, `WRAPPER_NAME = Ryvro.app`, `PRODUCT_NAME = Ryvro`, and `PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner` on 2026-05-30.
- Removed stale tracked Detox artifact logs/screenshots from the old iOS `EllieMinerShiftAssistant` identity and added `artifacts/` to `.gitignore` so generated release logs do not re-enter the tracked launch tree.

Still pending outside this repo or intentionally kept for compatibility:

- Formal trademark/legal clearance for `Ryvro`.
- App Store Connect and Google Play Console name checks from the real developer accounts.
- Domain and social handle purchase/reservation, especially `getryvro.com` or `ryvro.app`.
- New Firebase project/OAuth clients and fresh `GoogleService-Info.plist` / `google-services.json` generated from Firebase Console for `com.ryvro.shiftplanner`.
- RevenueCat dashboard product/entitlement renames if the production dashboard still uses old Ellie/miner names. Repo-side setup values and user-facing Ryvro Pro copy are documented and guarded by tests.
- Push notification, analytics, Sentry, support-email, privacy-policy, terms, website, and store-listing updates outside the repo. Repo-side source copy and setup handoff now exist in `docs/RYVRO_STORE_LISTING.md`, `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`, and `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md`.
- Production backend deploy and cutover from `ellieBrain` to `ryvroBrain`. Repo code now exposes both endpoints, but the actual Firebase project still needs a deploy, smoke test, and eventual legacy endpoint retirement plan.
- Optional internal code-symbol cleanup for old technical names such as `EllieButton`, internal `Ellie` tab route, `@ellie_language`, and wake-word model filenames. These are not user-facing in the current UI and were left stable to avoid breaking stored data, tests, native modules, and backend contracts.

## External Clearance Evidence: 2026-05-28

Public checks performed from this workspace:

- Apple public software search API for `Ryvro`: no exact `Ryvro` app result returned. Results were unrelated fuzzy matches such as `LOKO`, `rypil`, and other non-shift apps. This does not prove App Store Connect name availability.
- Refreshed Apple public software search API for `Ryvro` on 2026-05-28 after the rebrand branch was pushed: still no exact `Ryvro` app result returned.
- Second refreshed Apple public software search API check on 2026-05-28 after commit `91ed6e2`: 13 fuzzy results, no exact `Ryvro` app, no exact `Ryvro Shift Planner`, and no shift-planner competitor with that name. This still does not prove App Store Connect name availability.
- Third refreshed Apple public software search API check on 2026-05-28 after commit `7e2365d`: 16 fuzzy results, no exact `Ryvro` app, no exact `Ryvro Shift Planner`, and no shift-planner competitor with that name. This still does not prove App Store Connect name availability.
- Fourth refreshed Apple public software search API check on 2026-05-28 after commit `145ff3f`: `Ryvro` returned 9 fuzzy, unrelated software results and no exact `Ryvro` app; `Ryvro Shift Planner` returned shift-planner competitors such as `Supershift Shift Work Calendar`, `Shyft - Shift Swap, Schedule`, and `My Shift Planner - Calendar`, but no exact `Ryvro Shift Planner`. This still does not prove App Store Connect name availability.
- Fifth refreshed Apple public software search API check on 2026-05-28 after commit `6d8e3f3`: `Ryvro` returned 13 fuzzy, unrelated software results and no exact `Ryvro` or `Ryvro Shift Planner` app. This still does not prove App Store Connect name availability.
- Google Play logged-in Chrome search for `Ryvro`: no exact `Ryvro` app result visible. Results were fuzzy matches such as `RYO Software`, `Rydoo`, `Rydora`, `Ryver`, and other unrelated apps. This does not prove Play Console name availability.
- Refreshed public Google Play web search for `Ryvro` on 2026-05-28 after commit `7e2365d`: no exact `Ryvro Shift Planner` result was found in the fetched page; visible fuzzy app-name spans included `Rydoo` and `Rydora`. This still does not prove Play Console name availability.
- Refreshed Google Play logged-in Chrome search for `Ryvro` on 2026-05-28 after commit `145ff3f`: visible results included `Rolify`, `Rvolution Remote`, `Rydoo`, and `Rydora`, but no exact `Ryvro` or `Ryvro Shift Planner` result. This still does not prove Play Console title/package availability.
- Refreshed public Google Play web search for `Ryvro` on 2026-05-28 after commit `6d8e3f3`: no exact `Ryvro` or `Ryvro Shift Planner` result was found in the fetched page; visible fuzzy app-name spans included `Rydoo` and `Rydora`. This still does not prove Play Console title/package availability.
- DNS/WHOIS:
  - `getryvro.com`: no DNS A/CNAME record and Verisign WHOIS returned no match.
  - `ryvro.com`: registered through GoDaddy and parked with Afternic nameservers.
  - `ryvro.app`, `ryvro.io`, `ryvro.co`: no DNS A/CNAME record in the local check; registrar availability still needs confirmation before relying on any of them.
- Refreshed DNS checks on 2026-05-28: `getryvro.com`, `ryvro.app`, `ryvro.io`, and `ryvro.co` still returned no local A/CNAME records; `ryvro.com` still resolved to parked Afternic-style IPs.
- Second refreshed DNS checks on 2026-05-28: `getryvro.com`, `ryvro.app`, `ryvro.io`, `ryvro.co`, `ryvro.ai`, `ryvro.net`, and `ryvro.org` returned no local A/CNAME records; `ryvro.com` still resolved to parked Afternic-style IPs. Registrar purchase/availability must still be checked directly.
- Third refreshed DNS checks on 2026-05-28 after commit `7e2365d`: `ryvro.com` resolved to parked-style IPs `13.248.169.48` and `76.223.54.146`; `getryvro.com`, `ryvro.app`, `ryvro.io`, and `useryvro.com` returned no local A/CNAME records. Registrar purchase/availability must still be checked directly.
- Fourth refreshed DNS/WHOIS checks on 2026-05-28 after commit `145ff3f`: `ryvro.com` resolved to `13.248.169.48` and `76.223.54.146`; Verisign WHOIS shows `RYVRO.COM` registered through GoDaddy with Afternic nameservers and an expiry of 2026-06-16. Verisign WHOIS returned `No match for domain "GETRYVRO.COM"`, and local DNS returned no A/CNAME records for `getryvro.com`, `ryvro.app`, `ryvro.co`, or `ryvro.io`. Registrar purchase/availability must still be checked directly.
- Fifth refreshed DNS/WHOIS checks on 2026-05-28 after commit `6d8e3f3`: `ryvro.com` still resolved to `13.248.169.48` and `76.223.54.146`; Verisign WHOIS still shows `RYVRO.COM` registered through GoDaddy with Afternic nameservers and an expiry of 2026-06-16. Verisign WHOIS returned `No match for domain "GETRYVRO.COM"` and `No match for domain "USERYVRO.COM"`. Local DNS returned no A/CNAME records for `getryvro.com`, `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, `ryvro.org`, or `useryvro.com`. Registrar purchase/availability must still be checked directly.
- Public web trademark search for exact `Ryvro`: no exact software/workforce scheduling mark surfaced in search results. This is still only a public search pass, not legal clearance.
- USPTO Trademark Search system checked in Chrome on 2026-05-28 for `Ryvro`: the official USPTO search UI returned `No results found`. This is stronger public evidence than a generic web search, but it is still not attorney-led trademark clearance or international clearance.
- Public social-handle HTTP checks were inconclusive. X returned a bot/permission-style `403`; Instagram and TikTok returned generic `200` responses that do not reliably prove handle ownership or availability.
- Second social-handle HTTP check on 2026-05-28: `x.com/ryvro`, `instagram.com/ryvro`, and `tiktok.com/@ryvro` returned `200`, `youtube.com/@ryvro` returned `404`, and LinkedIn returned a bot-protection style `999`. These responses are not reliable handle-reservation proof; reserve the handles directly while logged in.
- Third social-handle HTTP check on 2026-05-28 after commit `7e2365d`: `x.com/ryvro`, `instagram.com/ryvro`, and `tiktok.com/@ryvro` returned `200`, `youtube.com/@ryvro` returned `404`, and LinkedIn returned bot-protection style `999`. These responses are not reliable handle-reservation proof; reserve the handles directly while logged in.
- Fourth social-handle HTTP check on 2026-05-28 after commit `6d8e3f3`: `x.com/ryvro`, `instagram.com/ryvro`, and `tiktok.com/@ryvro` returned `200`, `youtube.com/@ryvro` returned `404`, and LinkedIn returned bot-protection style `999`. These responses are not reliable handle-reservation proof; reserve the handles directly while logged in.

Required account-only checks:

- App Store Connect: create or reserve the app record name `Ryvro Shift Planner` under the developer account.
- Google Play Console: create or reserve the app title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`.
- Domain registrar: purchase the preferred domain, with `getryvro.com` currently the cleanest public evidence candidate.
- Social platforms: reserve `@ryvro` or a consistent fallback such as `@getryvro`.
- Trademark counsel/search: run formal clearance in launch markets before public launch.

## External Clearance Evidence: 2026-05-30

Latest repeatable public preflight command:

```bash
npm run release:clearance
```

Result captured at `2026-05-30T06:28:28.205Z`:

- Apple public software search: no exact `Ryvro` or `Ryvro Shift Planner` app result returned across 5 fuzzy results. Public search still does not prove App Store Connect name availability.
- Google Play public search: no exact `Ryvro` or `Ryvro Shift Planner` result text found. Visible fuzzy names included `Rydoo` and `Rydora`. Public search still does not prove Play Console title/package availability.
- Chrome/Computer Use read the public Google Play search page for `Ryvro` on 2026-05-30. Visible public results included fuzzy/non-conflicting names such as Rolify, Rydoo, and Rydora, with no exact Ryvro listing visible. Do not treat this as logged-in Play Console evidence; complete Play Console title/package checks directly in the account.
- USPTO public search app: reachable only through the automated preflight. This is not legal clearance.
- `getryvro.com`: no public DNS record and Verisign `.com` returned no match.
- `useryvro.com`, `tryryvro.com`, and `getryvroapp.com`: no public DNS record and Verisign `.com` returned no match.
- `ryvro.com`: registered through GoDaddy/Afternic and should not be treated as available unless purchased from the current registrant.
- `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, and `ryvro.org`: no public DNS record in the preflight, but registrar availability still needs direct confirmation.
- X, Instagram, and TikTok `@ryvro`: public URLs returned `200`; this is not reliable handle availability proof and requires logged-in reservation.
- YouTube `@ryvro`: public URL returned `404`; still reserve directly while logged in.
- LinkedIn `company/ryvro`: public URL returned `404`; still check and reserve directly while logged in.

The account-only checks remain unchanged: App Store Connect, Google Play Console, registrar purchase, social reservation, and formal trademark/legal clearance must be completed by the account owner or counsel.

## Permanent Naming Decision: 2026-05-28

Selected permanent brand direction: `Ryvro`.

Public app name: `Ryvro Shift Planner`.

Native display name: `Ryvro`.

Bundle/package pattern, after clearance and migration approval: `com.ryvro.shiftplanner`.

Decision status: proceed with `Ryvro` as the app's permanent brand unless formal trademark, developer-console, domain, or social-handle clearance produces a hard conflict.

Why this is the current best candidate:

- It is short, pronounceable, and brandable.
- It does not trap the app inside mining, FIFO, rosters, or any one industry.
- It can still be marketed directly to miners/FIFO workers at launch: `Ryvro Shift Planner for FIFO and mining crews`.
- It is more defensible than direct shift words such as `Shyft`, `Shiftify`, `ShiftMate`, `Sked`, `Rostr`, `RosterFlow`, or `ShiftLoop`, which have direct app-store, workforce-scheduling, or trademark-style conflicts.
- It is more expandable than miner-coded names such as `Offsider`, `MineMate`, or `FIFO Planner`.
- It avoids the search/autocorrect confusion of `Ellie`, `Eli`, `Elie`, `Ellei`, and `Elliee`.
- It is cleaner than `Vylra`, which has a live creative/design product presence.

Evidence from the 2026-05-28 naming pass:

- Exact public web/app-store style searches did not show a direct `Ryvro` shift-planner, roster, workforce scheduling, or calendar app conflict.
- Trademark-style exact searches for `Ryvro` did not surface an obvious live software/workforce scheduling mark, but this is not a substitute for attorney-led trademark clearance.
- `ryvro.com` is registered and appears parked/for-sale through Afternic, so it may be purchasable but should not be assumed available.
- `getryvro.com` returned no match from Verisign WHOIS and did not resolve in DNS during the check.
- `ryvro.app` did not resolve in DNS during the check, but `.app` WHOIS availability must still be confirmed through a registrar because standard WHOIS output is limited for that TLD.
- Direct shift names are materially riskier: `Shyft` has an existing shift-swap/schedule app, and `Shiftify` has an existing shift-work calendar app.

Required before changing production identity surfaces:

- Run formal trademark clearance in launch markets.
- Check App Store Connect and Google Play Console name availability from developer accounts.
- Secure the preferred web property, likely `getryvro.com` or `ryvro.app`; only use `ryvro.com` if it can be purchased at an acceptable price.
- Confirm social handles.
- Confirm the name has no negative meaning in primary launch languages and regions.

Fallback names to keep only if `Ryvro` fails clearance:

- `Kavro Shift Planner`
- `Zynro Shift Planner`
- `Kavyn Shift Planner`
- Another invented five-letter brand plus `Shift Planner`

## Strategy Decision

### Do now: miner-first but not miner-trapped

- Keep mining/FIFO as the first audience and first marketing wedge.
- Keep founder/miner origin story because it creates trust and specificity.
- Keep mining/FIFO examples in intentional marketing, onboarding templates, and early screenshots.
- Keep Universal Shift Builder as the only schedule setup/editing system.
- Use a brand name and app identity that can expand later.
- Avoid bundle/package IDs and public product names that permanently say `miner` if the app is not yet live.
- Keep the data model, AI parser, templates, reminders, exceptions, import/export, and calendar rendering industry-neutral.

### Do later: full universal rebrand

- Multi-industry screenshots.
- Broad App Store copy for every shift worker.
- Full localization rewrite around every industry.
- Large paid template marketplace.
- Public marketing to nurses, factories, security, transport, hospitality, aviation, and emergency services.
- Broad social content and research funnels outside mining/FIFO.

### Do not do

- Do not reintroduce legacy rotating/FIFO setup screens.
- Do not make the product model mining-only.
- Do not call the app something that blocks non-miners later.
- Do not remove mining/FIFO templates; they are the launch wedge.
- Do not spend weeks broadening public marketing before validating the miner/FIFO wedge.

## Native App Identity

Repo-side identity work is complete for the current Ryvro direction:

- Public app name: `Ryvro Shift Planner`.
- Short native display name: `Ryvro`.
- Expo slug and URL scheme: `ryvro`.
- iOS bundle ID and Android package: `com.ryvro.shiftplanner`.
- Current generated iOS simulator build installs as `Ryvro.app` and exposes `CFBundleDisplayName = Ryvro` and `CFBundleName = Ryvro`; current Xcode build settings also report `FULL_PRODUCT_NAME = Ryvro.app`, `WRAPPER_NAME = Ryvro.app`, `PRODUCT_NAME = Ryvro`, and `PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner`.
- Current generated Android/iOS native identity files have been updated locally by the prebuild/run flow. If the repo keeps `ios/` and `android/` ignored, the tracked source of truth remains `app.json` and `app.config.js`.

Remaining account-side identity work:

- Create or reserve `Ryvro Shift Planner` in App Store Connect.
- Create or reserve `Ryvro Shift Planner` and package `com.ryvro.shiftplanner` in Google Play Console.
- Generate fresh Firebase iOS/Android app configs for `com.ryvro.shiftplanner`.
- Update OAuth client IDs, Sign in with Apple service configuration, deep links, push credentials, analytics dashboards, and support tooling to match the new bundle/package.
- Rename RevenueCat public offering/product display names to Ryvro while preserving old product identifiers or aliases where needed for migration.
- Update App Store / Play Store screenshots, subtitles, descriptions, keywords, privacy copy, and support text to support miner-first launch while preserving future expansion.

### Current repo verification

- `npx expo config --json` resolves to `name = Ryvro Shift Planner`, `slug = ryvro`, `scheme = ryvro`, `ios.bundleIdentifier = com.ryvro.shiftplanner`, and `android.package = com.ryvro.shiftplanner`.
- The active app icon, adaptive icon, splash icon, and favicon paths point to Ryvro assets.
- `e2e/helpers/storage.ts` uses the Ryvro bundle/package storage path.
- Legacy public names such as `Ellie: Miner Shift Assistant`, `Ellie Shift Planner`, `Miner Shift Assistant`, and `com.ellie.minershiftassistant` should not appear in active tracked source outside intentional migration aliases or archived/historical docs.

### Final identity

- Public app name: `Ryvro Shift Planner`.
- Short native display name: `Ryvro`.
- Bundle/package ID before launch: `com.ryvro.shiftplanner`.
- Launch category: `shift planner for miners and FIFO workers`.
- Future category: `AI shift planner for shift workers`.
- Keep mining/FIFO as the launch wedge and strongest first template family, not as the permanent technical boundary.

## Core Visual Assets

- Current tracked app icon, adaptive icon, splash icon, favicon, and onboarding assistant avatar now use neutral Ryvro assets instead of mining-only imagery.
- The retired onboarding mining helmet asset family has been removed from active assets. Keep any remaining helmet references archived or in tests that assert it is not active.
- Keep the strong day/night/off calendar icon language, but expand it into a universal shift icon set:
  - Day shift
  - Night shift
  - Evening shift
  - Morning shift
  - Split shift
  - On-call
  - Standby
  - Training
  - Travel
  - Overtime
  - Holiday
  - Leave
  - Sick day
  - Swap
  - Site change
- Add industry-neutral template thumbnails for healthcare, emergency services, security, transport, hospitality, manufacturing, oil/gas, aviation, rail, logistics, and mining.

### Asset replacement backlog

- App icon: done for the tracked Expo assets; continue visual QA on real devices before submission.
- Splash screen: done for the tracked Expo splash asset; continue visual QA on real devices before submission.
- Onboarding assistant avatar: done; the retired helmet family should stay out of active assets.
- Paywall hero art: currently not mine-site specific in tracked launch surfaces; keep future screenshots cross-industry capable.
- Empty states: use neutral schedule/calendar graphics for any new empty-state work.
- Template thumbnails: add visual variants for hospital, station, terminal, plant, depot, hotel, factory, airport, rig, warehouse, store, and mine.
- Notification icons: ensure small icons are readable and not industry-specific.
- Store screenshots: show at least five worker contexts, not one mining context.
- Web/social preview images: update Open Graph/Twitter/landing assets if they exist outside the repo.

## Onboarding Copy

- Replace mining-specific examples such as haul truck operator, boilermaker, electrician, mine site, underground mines, mine infrastructure, and FIFO-only language with broader examples.
- Suggested occupation placeholder: `e.g. Nurse, Security Officer, Driver, Technician`.
- Suggested company placeholder: `e.g. Hospital, Depot, Plant, Hotel, Site`.
- Keep FIFO as one supported schedule family, but do not make it feel like the main product category.
- The first onboarding screen should make the promise universal: build any repeating or irregular shift schedule with AI or manual builder.
- The onboarding assistant avatar should not be a mining helmet unless mining is selected as the user’s industry.

### Onboarding flow requirements

- First schedule setup choice should be:
  - `Describe my shifts`
  - `Build manually`
  - `Start from a template`
- Ask for industry only to personalize examples and templates, not to lock the user into a schedule model.
- Replace old “roster type” branching with Universal Shift Builder state.
- Do not mention FIFO before the user selects mining, oil/gas, offshore, shutdown, or travel-heavy work.
- Use “schedule”, “rotation”, or “shift pattern” as default language. Keep “roster” as acceptable regional copy where it helps, but not as the only term.
- Make the current-position question plain: `What are you working today?`
- Make the match date plain: `Match this schedule from`.
- Treat `location/site` as optional and universal: `Hospital, terminal, depot, store, plant, station, venue, rig, site`.

### Onboarding localization backlog

- Update `src/i18n/locales/en/onboarding.json` first.
- Then update all translated onboarding files so old FIFO/mining strings do not reappear when a user changes language.
- Remove or rewrite translated keys that describe FIFO as the default setup path.
- Keep translated FIFO template labels only inside template content.

## Profile And Settings Copy

- Replace legacy FIFO labels in profile/settings where the universal builder is now the source of truth.
- Keep “site/location” optional, because not every worker has a site, but expose it clearly for workers with changing hospitals, depots, terminals, stores, plants, yards, rigs, posts, or venues.
- Update smart reminder examples beyond mining:
  - Night shift fatigue reminder
  - Commute reminder
  - Uniform/PPE reminder
  - Medication/meal reminder
  - Handover reminder
  - Site arrival reminder
  - Sleep protection reminder

### Settings requirements

- Settings must expose the same Universal Builder entry point as onboarding.
- Settings must include an AI schedule rewrite entry: `Describe a new schedule`.
- Settings must include manual edit entry: `Edit shift types and sequence`.
- Settings must show chosen shift colors and icons in the summary card.
- Settings must show exceptions clearly:
  - public holidays
  - one-off swaps
  - imported calendar changes
- Settings must allow the user to view and edit reminder profiles per shift type.
- The current active shift color should tint the settings schedule card, but not make personal/account settings look like schedule state.

### Profile copy backlog

- Replace labels like `FIFO block`, `site days`, and `swing` unless the selected template or industry is FIFO/offshore/mining.
- Replace `How long to get to site` with `Commute or travel time`.
- Replace “site details” with `Location details`.
- Keep “site” as one example, not the main label.

## Universal Shift Templates

Add first-class examples and QA scenarios for:

- Nurses: 2-2-3, 12-hour day/night rotations, permanent nights, mixed ward rotations.
- Firefighters/EMS: 24/48, 48/96, Kelly days, station swaps.
- Security: 4-on/4-off 12-hour days/nights, permanent nights, site rotations.
- Manufacturing: DuPont, Panama, continental 2 mornings/2 afternoons/2 nights/4 off.
- Oil/gas/offshore: 14/14, 21/21, travel days, heli days, quarantine/training days.
- Transport/logistics: split shifts, early starts, rotating depot/site assignments.
- Hospitality/retail: irregular weekly rosters, late closes, one-off swaps.
- Aviation/rail: standby, reserve, duty-limit-sensitive shifts.
- Mining: FIFO and local rotating rosters remain supported, but as one industry among many.

### Template catalog to build

- Healthcare:
  - 2 days, 2 nights, 4 off
  - 2-2-3 12-hour rotation
  - permanent nights
  - rotating ward roster with training days
- Emergency services:
  - firefighter 24/48
  - firefighter 48/96
  - EMS day/night rotation
  - Kelly day pattern
- Security:
  - 4 days, 4 nights, 4 off
  - 4 on, 4 off permanent nights
  - site-based rotation with one-off swaps
- Manufacturing:
  - DuPont
  - Panama
  - continental 2 mornings, 2 afternoons, 2 nights, 4 off
  - 3-shift weekly rotation
- Transport/logistics:
  - early/late/night depot rotation
  - split shift
  - linehaul overnight
  - weekend-only pattern
- Hospitality/retail:
  - irregular weekly roster imported from calendar
  - late close/open turnaround
  - part-time recurring shifts
- Aviation/rail:
  - standby/reserve
  - early/late/night terminal rotation
  - training/check day
- Oil/gas/offshore/mining:
  - 8/6
  - 14/14
  - 21/21
  - travel day, work block, rest block
  - heli/fly-in/fly-out variants

### Template UX requirements

- Templates must be editable before save.
- Templates must set colors/icons/reminder defaults, not only sequence counts.
- Templates must include a short plain-language explanation.
- Templates must support “I am currently on day X of this pattern”.
- Templates must be searchable by industry and by pattern text.
- Paid/premium templates should only exist if they save meaningful setup work; do not sell basic patterns that users expect for free.

## Calendar And Schedule Surfaces

- Ensure selected shift colors apply consistently in:
  - Dashboard current/next shift cards
  - Calendar day cells
  - Schedule detail sheets
  - Settings schedule summaries
  - Onboarding preview
  - Notification preview rows
  - Import/export preview rows
  - Holiday and one-off exception rows
- Ensure selected shift icons appear consistently in:
  - Calendar cells
  - Dashboard cards
  - Settings summaries
  - One-off exceptions
  - Exported ICS event titles/descriptions where useful
- Make holiday exceptions visually distinct without hiding the underlying shift.
- Make one-off irregular exceptions reversible and obvious, with copy like `Changed just this day`.

### Surfaces that must render universal shift color/icon

- Dashboard header current/next shift area.
- Monthly calendar day cells.
- Calendar legend.
- Shift detail modal/sheet.
- Profile/settings schedule card.
- Universal Builder sequence list.
- Universal Builder preview calendar.
- Holiday exception rows.
- One-off exception rows.
- Import preview rows.
- Export/share preview rows.
- Reminder profile rows.
- Push notification content where the platform allows icon/name.
- Check-in modal.
- Voice assistant context cards.
- Widgets/Live Activities if added later.

### Exception display rules

- Holiday exception: show the holiday label plus the original shift underneath when useful.
- One-off swap: show the replacement shift as primary and the original shift as `was Night Shift`.
- Imported event: show import source and let user detach or delete it.
- Deleted/off exception: do not erase the original repeating pattern; show that this one date was changed.

## AI Builder

- Keep AI builder available in both onboarding and settings.
- Make the AI entry point obvious:
  - Onboarding: first schedule setup step should offer “Describe my shifts” and “Build manually”.
  - Settings: schedule editor should expose “Describe a new schedule” and “Edit manually”.
- AI prompt examples should cover multiple industries, not only 4-4-4 mining rosters.
- AI output should always be editable before save.
- AI must ask for or infer:
  - Shift names
  - Start/end times
  - Sequence pattern
  - Current position in cycle
  - Anchor/match date
  - Colors
  - Icons
  - Exceptions
  - Reminder profiles
  - Location/site when relevant

### AI builder launch requirements

- AI must handle natural phrases such as:
  - `2 earlies, 2 lates, 2 nights, 4 off`
  - `24 on 48 off`
  - `Monday to Friday 7 to 3`
  - `I work every other weekend`
  - `14 days offshore, 14 home, travel day before each swing`
  - `I am on my second night today`
- AI must not silently save. It always creates a draft.
- AI draft must show confidence, assumptions, and any unknowns.
- AI must avoid over-counting words like `days off` as day shifts.
- AI must preserve user wording enough for follow-up edits.
- AI must support follow-up refinement from the draft sheet.
- AI must fall back to deterministic parser when the remote parser is unavailable.
- The fallback parser has regression coverage against at least 20 industry examples before launch.

### AI infrastructure backlog

- Decide whether the production parser endpoint is required before launch or whether local fallback is acceptable.
- Add telemetry for AI parser success, fallback, clarification, acceptance, manual edit after draft, and save.
- Add rate-limit and privacy copy because users may type employer/site details.
- Add redaction guidance for sensitive data in support logs.

## Manual Builder UX

- Avoid user-facing jargon such as “phase offset” and “anchor date”.
- Prefer “What are you working today?” and “Match schedule from this date”.
- Make drag-and-drop sequence building support:
  - fixed repeating patterns
  - count-based runs
  - alternating patterns
  - irregular/manual days
  - multiple shifts in one day
  - overnight shifts
  - zero-duration off/holiday placeholders
  - non-24-hour cycle edge cases where appropriate
- Provide clear validation messages tied to exact fields.

### Manual builder launch requirements

- Shift type editor must support:
  - name
  - kind
  - start/end time
  - overnight crossing
  - all-day/no-time shifts
  - color
  - icon
  - location/site
  - paid/unpaid stats behavior
  - night-count behavior
  - reminder profile
- Sequence editor must support:
  - add one shift
  - add repeated block
  - reorder by drag
  - reorder with accessible up/down controls
  - duplicate
  - delete
  - long cycles
  - validation for missing definitions
- Preview must update immediately after every edit.
- Save must explain the exact issue if preview is blocked.
- The words `phase offset` and `anchor date` must not appear in user-facing UI.

## Notifications And Reminders

- Advanced reminder profiles should support per-shift defaults:
  - reminder lead time
  - commute buffer
  - preparation buffer
  - handover/briefing reminder
  - fatigue warning
  - quiet hours handling
  - critical/time-sensitive behavior where permitted
- Reminder copy should avoid mining-only language unless the selected industry is mining.

### Reminder profile defaults by shift type

- Day shift: commute/prep reminder, imminent reminder.
- Early shift: stronger sleep/bedtime reminder the previous evening.
- Evening shift: meal/family handoff reminder.
- Night shift: sleep protection, fatigue warning, post-shift check-in.
- On-call/standby: start-of-standby and end-of-standby reminders.
- Travel shift: day-before packing/travel reminder and departure reminder.
- Training: one-hour reminder and document/PPE checklist.
- Holiday/leave/off: no work reminder unless user explicitly enables it.

### Notification copy backlog

- Replace mining-only copy in notification titles/subtitles.
- Include shift name, time, and optional location.
- Keep notification text short enough for iOS lock screen.
- Respect quiet hours and sleep windows.
- Ensure reminders are recalculated when schedule, exceptions, timezone, or reminder profiles change.

## Import And Export

- Exported calendar files should use the user’s shift names, colors where supported, site/location, and notes.
- Imported calendar events should map into editable shift types and one-off exceptions where possible.
- Import failure states should explain what could not be understood and let the user fix it manually.
- Support ICS files first; Google/Apple deep sync can follow after account-linking and permissions are designed.

### Calendar import/export launch requirements

- Export:
  - date range selection
  - include/exclude off days
  - include exceptions
  - include location/site
  - include notes
  - stable event IDs where possible
- Import:
  - `.ics` file picker
  - parse timed, overnight, and all-day events
  - map matching events to existing shift types
  - create one-off exceptions for imported roster days
  - show duplicates before applying
  - allow undo/delete imported changes
- Account sync later:
  - Google Calendar
  - Apple Calendar
  - Outlook
  - workplace roster providers if users request them

## Tests And QA Data

- Replace e2e seed profile values such as `Miner` and `Test Mine Co.` with neutral/default shift-worker values or add multiple industry fixtures.
- Keep mining tests as one fixture, not the default fixture.
- Add physical-device QA scenarios for:
  - AI 4 days, 4 nights, 4 off, currently second night
  - nurse 2-2-3
  - firefighter 24/48
  - security 4-on/4-off
  - factory continental
  - hospitality irregular week
  - one-off swap
  - public holiday override
  - calendar export
  - calendar import
  - per-shift reminders
  - selected color/icon visible on calendar and settings

### Required QA matrix before public launch

- Onboarding:
  - AI setup
  - manual setup
  - template setup
  - skip/back/discard flows
  - no network
  - social sign-in
  - email sign-in
- Settings:
  - edit existing AI schedule
  - edit manual schedule
  - change colors/icons
  - add holiday exception
  - add one-off swap
  - import calendar file
  - export calendar file
  - edit reminder profile
- Dashboard:
  - current shift
  - next shift
  - no active shift
  - overnight shift
  - exception day
  - imported day
  - holiday day
  - long cycle
- Devices:
  - iPhone 13 physical
  - iPhone XS Max physical
  - current iOS simulator
  - small-screen iPhone SE simulator
  - Android emulator/physical device
- Native modules:
  - Firebase Auth/Firestore
  - Google sign-in
  - Apple sign-in
  - MMKV
  - NetInfo
  - notifications
  - document picker
  - sharing
  - speech/voice

### Test data backlog

- Replace default e2e user occupation `Miner` with a neutral default such as `Nurse` or `Shift Worker`.
- Add fixture users for nurse, security, firefighter, factory worker, driver, hospitality worker, aviation worker, offshore worker, and miner.
- Keep one mining fixture for regression coverage.
- Replace `Test Mine Co.` with neutral fixture employers or industry-specific employers.

## Documentation And Marketing

- Rewrite release docs and build-in-public docs so they support the miner-first wedge without making the product technically mining-only.
- Keep founder/mining origin story for authenticity; it should be the launch trust signal.
- For launch screenshots, miners/FIFO workers can be the primary visible audience.
- Include subtle proof that the builder supports any shift pattern, but do not dilute launch positioning with every industry at once.
- Update paywall copy from mining-only benefits to miner/FIFO benefits that are powered by a universal schedule engine.

### Documentation files to rewrite or retire

- `docs/USER_GUIDE_FIFO.md`: convert to a template guide inside a broader shift-pattern guide.
- `docs/FIFO_QA_CHECKLIST.md`: fold into universal builder QA.
- `docs/ARCHITECTURE.md`: update from dual rotating/FIFO architecture to universal schedule architecture.
- `docs/API_REFERENCE.md`: remove first-class FIFO assumptions from examples.
- `docs/ADDING_SHIFT_PATTERNS.md`: replace legacy pattern instructions with universal template instructions.
- `docs/DEPLOYMENT.md`: replace FIFO onboarding checks with universal builder checks.
- `docs/RELEASE_NOTES_FIFO_DUAL_ROSTER.md`: archive as historical.
- `docs/RYVRO_BUILD_IN_PUBLIC_AGENT.md`, `docs/RYVRO_RESEARCH_FUNNEL_OS.md`, and related content docs: keep miner-first go-to-market, but avoid saying the product can only ever serve miners.
- `docs/OFFLINE_FIRST_STRATEGY.md`: keep mining/underground as the strongest launch case, while noting the same offline-first design can later serve hospitals, factories, ships, rigs, warehouses, rail, and remote sites.

### Marketing and store checklist

- App Store title/subtitle.
- Google Play title/short description/full description.
- App keywords and category.
- Screenshots for each store size.
- Preview video script.
- Landing page headline and hero image.
- Social bios.
- Support site FAQ.
- Changelog/release notes.
- Press kit.
- Founder story copy.
- Build-in-public content prompts.
- Email capture/waitlist copy.

## Technical Follow-Ups

- Keep the universal builder behind a feature flag until the rebrand and physical-device QA pass.
- Add a rollback tag/release branch before any public rollout.
- Ensure Firebase Hosting CSP remains compatible with React Native Firebase iOS build scripts. The raw `firebase.json` should avoid literal apostrophes because RNFirebase injects it into a Ruby single-quoted parse command during iOS builds.
- Verify physical-device native modules after install:
  - Firebase Auth/Firestore native SDK
  - MMKV
  - NetInfo
  - notifications
  - document picker
  - sharing
  - speech/voice surfaces

## Auth And Trust Surfaces

- Keep email, Google, and Apple sign-in working before rebrand launch.
- Ensure auth error messages are specific enough:
  - cancelled sign-in
  - missing Google token
  - missing Apple token
  - unavailable native module
  - network error
  - Firebase credential failure
- Update welcome emails, password reset emails, email verification emails, and support sender names to universal shift-worker language.
- Update privacy copy around schedule, calendar import/export, reminders, location/site, and optional AI prompt data.
- Update permission prompts so they explain shift-worker benefits:
  - notifications: reminders before shifts
  - calendar/files: import/export schedule
  - microphone/speech: voice assistant if enabled
  - location: only if a future site/location feature truly needs device location
- Add support/debug copy that avoids implying the user works in mining.

## Analytics And Observability

- Search and rename analytics events/properties that imply mining/FIFO as the only product model.
- Keep historical event compatibility where dashboards already rely on old names, but map new events to universal names.
- Required events:
  - onboarding_started
  - schedule_builder_opened
  - ai_schedule_prompt_submitted
  - ai_schedule_draft_created
  - ai_schedule_draft_accepted
  - manual_schedule_saved
  - template_schedule_saved
  - shift_color_changed
  - shift_icon_changed
  - exception_added
  - calendar_exported
  - calendar_imported
  - reminder_profile_updated
  - social_sign_in_started
  - social_sign_in_failed
  - social_sign_in_succeeded
- Dashboards should segment by industry/template without making mining the default segment.

## Billing And Entitlements

- Rename RevenueCat offerings, products, entitlement descriptions, and paywall text away from miner-specific language.
- Keep old product IDs only if required by store migration, but show universal names to users.
- Update paywall benefits:
  - full-year schedule view
  - unlimited shift types
  - AI schedule builder
  - calendar import/export
  - holiday and one-off exceptions
  - advanced reminders
  - templates
  - cross-device backup when supported
- Avoid selling the basic ability to create a normal schedule; premium should be advanced convenience and power-user value.

## Backend, Firebase, And External Dashboards

- Firebase project display names and app nicknames should not say miner if they are visible to users or support staff.
- Dynamic links/deep links should move to universal paths before launch if any exist.
- Cloud Function names can remain technical, but user-facing logs/errors must be universal.
- Firestore collections do not need a risky rename unless names are visible or misleading.
- Remote Config keys can remain if internal, but new flags should use universal naming.
- Support tooling, test accounts, seed data, and demo accounts should use universal worker profiles.

## Legal, Privacy, And Compliance

- Update privacy policy to mention:
  - shift schedule data
  - calendar file import/export
  - optional work location/site names
  - reminder preferences
  - AI prompt processing if remote AI is enabled
  - account providers
- Update terms to avoid describing the product as mining-only.
- Add disclaimer that the app is a personal schedule aid and does not replace employer rosters, fatigue rules, union agreements, or regulated duty limits.
- For aviation, rail, healthcare, and emergency services, avoid implying compliance certification unless it exists.

## Repo Cleanup Priority

### Must change before miner-first public launch

- Public app name and store naming so the permanent brand is not miner-trapped.
- Onboarding English copy only where it makes the product model mining-only instead of miner-first.
- Default e2e/demo user data can be miner/FIFO for launch, but add at least one non-mining fixture to prove the foundation is universal.
- App icon/splash/onboarding assistant asset.
- Paywall copy should be miner/FIFO-first but not incompatible with expansion.
- Settings/profile copy should support miners while using universal schedule concepts.
- Social sign-in regression coverage.
- Calendar/settings color/icon QA.
- App Store/Play Store screenshots can be miner/FIFO-first at launch.

### Should change before beta

- Bundle/package ID if the app has not been released.
- Localized onboarding/profile/common strings.
- Legacy FIFO docs and QA docs.
- Analytics naming.
- RevenueCat product display names if they say miner in a way that blocks future expansion.
- Support/help docs.

### Can stay temporarily if internal-only

- Historical docs that are clearly archived.
- Internal compatibility fields that read universal schedule data.
- Old enum names or helper names if removing them risks regressions and they are not user-facing.
- Mining/FIFO templates as long as they are presented as one supported industry family.

## Implementation Sequence

1. Freeze and tag the current working universal-builder state for rollback.
2. Rename public identity surfaces and decide bundle/package ID so the brand can expand later.
3. Replace core assets and onboarding assistant visual if they are permanently mining-trapped.
4. Rewrite English onboarding/profile/settings/paywall/common copy to be miner-first but universal-ready.
5. Keep miner/FIFO fixture as the launch default if desired, but add non-mining fixtures and tests to prove universal capability.
6. Add mining/FIFO template catalog first; add other industry templates as expansion backlog.
7. Update localized strings only for launch-critical screens, then schedule full localization cleanup.
8. Rewrite documentation and marketing surfaces to support miner-first launch with universal-ready architecture.
9. Update analytics, billing display names, support, and legal copy.
10. Run full validation, simulator UI QA, physical iPhone 13 QA, physical iPhone XS Max QA, and Android QA.
11. Push to GitHub and verify CI.
12. Only then remove or archive legacy internal compatibility code.

## Execution Appendix: Concrete Repo Worklist

This section turns the rebrand into a file-by-file implementation backlog. Use it when assigning work to an agent or checking whether the rebrand is genuinely complete.

### 1. Native identity files

These were updated together in the Ryvro rebrand branch because they affect build, install, storage paths, deep links, Firebase, and e2e tooling:

- `app.json`
  - `expo.name`: `Ryvro Shift Planner`.
  - `expo.slug`: `ryvro`.
  - `expo.scheme`: `ryvro`.
  - `expo.ios.bundleIdentifier`: `com.ryvro.shiftplanner`.
  - `expo.android.package`: `com.ryvro.shiftplanner`.
  - `expo.icon`, `expo.splash.image`, `expo.android.adaptiveIcon.foregroundImage`: point to Ryvro assets.
- `app.config.js`
  - Uses `https://api.getryvro.com` as the default API base URL.
  - Exposes `RYVRO_BRAIN_URL` / `RYVRO_BRAIN_TIMEOUT` as preferred voice-backend names while retaining legacy `ELLIE_BRAIN_*` fallbacks for migration.
  - Confirmed no env-driven override reintroduces old public naming.
- `app.config.js.backup`
  - Updated to the same Ryvro identity values so the backup does not mislead future agents.
- `ios/Ellie/Info.plist`
  - `CFBundleDisplayName`: `Ryvro`.
  - URL schemes: `ryvro`, `com.ryvro.shiftplanner`, and `exp+ryvro`.
- `ios/Ellie.xcodeproj/project.pbxproj`
  - Product name references now build `Ryvro`.
  - Google service resource reference should still resolve.
- `ios/Ellie/GoogleService-Info.plist`
  - Needs replacement from Firebase Console because the checked-in/generated file still belongs to the old Firebase project even though the local bundle ID was adjusted.
- `ios/Ellie/Ellie.entitlements`
  - Verify Sign in with Apple entitlement remains valid.
- `android/settings.gradle`
  - `rootProject.name`: `Ryvro Shift Planner`.
- Android native package files
  - Local generated package files use `com.ryvro.shiftplanner`.
  - Replace `google-services.json` from Firebase Console because the current file still belongs to the old Firebase project.
- `e2e/helpers/storage.ts`
  - `BUNDLE_ID` and AsyncStorage path updated to `com.ryvro.shiftplanner`.

Acceptance checks:

- Fresh iOS simulator install shows the new display name: passed on iPhone 16 simulator.
- `xcrun simctl get_app_container booted com.ryvro.shiftplanner app` works and its installed `Info.plist` reports `Ryvro`: passed.
- Physical iPhone 13 and iPhone XS Max install tests: pending external device availability.
- Google sign-in and Apple sign-in with new OAuth/service configuration: pending Firebase/Apple/Google console updates.
- Existing users are either migrated or the app is confirmed unreleased so migration is not needed: product owner confirmation required before public release.

### 2. Asset files to replace or review

Universal replacement status:

- `assets/icon.png`: done; tracked Expo config points here.
- `assets/adaptive-icon.png`: done; tracked Expo config points here.
- `assets/favicon.png`: done; tracked Expo config points here.
- Splash asset referenced by Expo config: done; tracked Expo config points to `assets/splash-icon.png`.
- Retired mining helmet family: done; no active bundled image path should contain helmet, hardhat, mining-helmet, or Ellie naming.

Review and probably rename/reposition:

- `assets/onboarding/icons/*/roster-type-fifo.png`
- `assets/onboarding/icons/*/roster-type-rotating.png`
- `assets/onboarding/icons/*/shift-pattern-fifo-*.png`
- `assets/onboarding/icons/consolidated/roster-type-fifo*.png`
- `assets/onboarding/icons/consolidated/roster-type-rotating*.png`
- `assets/onboarding/icons/consolidated/shift-pattern-fifo-*.png`
- `assets/onboarding/icons/source/roster-type-fifo.png`
- `assets/onboarding/icons/source/roster-type-rotating.png`
- `assets/onboarding/icons/source/shift-pattern-fifo-*.png`

Assets that can remain but should be reframed as universal:

- day shift sun assets
- night shift moon assets
- days off/rest assets
- custom pattern builder hero
- validation success/warning
- work/rest balance
- morning/afternoon shift time assets
- calendar grid assets

New asset set to create:

- universal Ryvro assistant avatar
- schedule builder hero
- template cards for healthcare, security, emergency services, transport, manufacturing, hospitality, aviation/rail, oil/gas, mining
- holiday exception icon
- one-off swap icon
- calendar import icon
- calendar export icon
- reminder profile icon
- location/site icon that is not mine-specific

Acceptance checks:

- No user-facing default avatar is a mining helmet.
- Mining assets only appear when the user chooses a mining/offshore/FIFO template or in archived docs.
- App icon reads as schedule/calendar/shift work at small sizes.
- Dark mode and light mode asset contrast is acceptable.

### 3. Code surfaces that need copy/behavior review

Auth and account:

- `src/services/AuthService.ts`
- `src/contexts/AuthContext.tsx`
- `src/screens/auth/SignInScreen.tsx`
- `src/screens/auth/SignUpScreen.tsx`
- `src/utils/authErrorMessage.ts`
- `src/i18n/locales/*/common.json`

Onboarding:

- `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
- `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`
- `src/screens/onboarding/premium/PremiumPainHookScreen.tsx`
- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`
- `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`
- `src/components/onboarding/premium/ChatAvatar.tsx`
- `src/components/onboarding/premium/SettingsEntryActionButtons.tsx`
- `src/constants/onboardingProgress.ts`
- `src/utils/onboardingNavigation.ts`
- `src/utils/onboardingPersistence.ts`
- `src/utils/onboardingErrorMessage.ts`
- `src/i18n/locales/*/onboarding.json`

Builder and schedule:

- `src/screens/onboarding/premium/UniversalShiftBuilderScreen.tsx` if present, or the current Universal Builder route file.
- `src/components/shift-builder/*`
- `src/services/ShiftScheduleParserService.ts`
- `src/services/ShiftCalendarFileService.ts`
- `src/utils/universalShiftUtils.ts`
- `src/utils/universalShiftScheduleUtils.ts`
- `src/utils/universalShiftCalendarUtils.ts`
- `src/utils/shiftUtils.ts`
- `src/utils/shiftQueryTools.ts`
- `src/utils/voiceAssistantPrompts.ts`

Dashboard:

- `src/components/dashboard/PersonalizedHeader.tsx`
- `src/components/dashboard/CurrentShiftStatusCard.tsx`
- `src/components/dashboard/MonthlyCalendarCard.tsx`
- `src/components/dashboard/ShiftCalendarDayCell.tsx`
- `src/components/dashboard/UpcomingShiftsCard.tsx`
- `src/components/dashboard/StatisticsCard.tsx`
- `src/components/dashboard/QuickActionsBar.tsx`
- `src/components/dashboard/OnboardingChecklist.tsx`
- `src/i18n/locales/*/dashboard.json`

Profile/settings:

- `src/screens/main/ProfileScreen.tsx`
- `src/components/profile/ShiftSettingsPanel.tsx`
- `src/components/profile/ProfileEditForm.tsx`
- `src/components/profile/ProfileHeroSection.tsx`
- `src/components/profile/SmartRemindersPanel.tsx`
- `src/components/profile/WorkStatsSummary.tsx`
- `src/utils/profileUtils.ts`
- `src/i18n/locales/*/profile.json`

Paywall/billing:

- `src/screens/subscription/PaywallScreen.tsx`
- `src/components/subscription/PadlockOverlay.tsx`
- `src/services/RevenueCatEntitlements.ts`
- `src/services/RevenueCatRuntime.ts`
- `src/services/RevenueCatUIRuntime.ts`
- `src/services/RevenueCatOfferingsCacheService.ts`
- `ellie_Paywall_&_Subscription_Plan Tasks.md`

Backend/support:

- `backend/functions/src/audience-os/product-onboarding.ts`
- Firebase Hosting config in `firebase.json`
- any Cloud Function prompt or onboarding copy used by support/research tooling

Acceptance checks:

- `rg -n "Miner|miner|mining|mine|FIFO|fifo|roster|haul|underground|Mine Site|Test Mine" src app.json app.config.js ios android e2e tests backend` has no user-facing hits except allowed template/history contexts.
- Any remaining `FIFO` in code is either a compatibility shim, a template, or an archived document.
- All English user-facing strings are universal.
- Non-English strings either have updated translations or intentionally fall back to updated English.

### 4. Localization completion plan

Current locale groups to review:

- `src/i18n/locales/en/common.json`
- `src/i18n/locales/en/onboarding.json`
- `src/i18n/locales/en/profile.json`
- `src/i18n/locales/en/dashboard.json`
- same files under `es`, `fr`, `id`, `hi`, `af`, `pt-BR`, `ar`, `zu`, `zh-CN`, `ru`

Order:

1. Rewrite English strings.
2. Keep keys stable where possible.
3. Add new universal keys for builder/template concepts.
4. Remove unused legacy keys only after code references are gone.
5. Machine-translate draft updates for non-English locales only as a temporary step.
6. Mark translations needing human review.

Acceptance checks:

- Switching language does not bring back mining-first onboarding.
- Paywall social proof is universal in every locale.
- Dashboard and settings labels remain understandable on small screens.

### 5. Documentation completion plan

Rewrite into universal docs:

- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/ADDING_SHIFT_PATTERNS.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING_STRATEGY.md`
- `docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md`
- `docs/OFFLINE_FIRST_STRATEGY.md`
- `docs/dashboard-implementation-plan.md`
- `docs/profile-shift-settings-plan.md`

Archive or rename:

- `docs/USER_GUIDE_FIFO.md`
- `docs/FIFO_QA_CHECKLIST.md`
- `docs/RELEASE_NOTES_FIFO_DUAL_ROSTER.md`
- `docs/PHASE_7_10_EXECUTION_REPORT.md`

Rewrite marketing/research docs:

- `docs/RYVRO_BUILD_IN_PUBLIC_AGENT.md`
- `docs/RYVRO_RESEARCH_FUNNEL_OS.md`
- `docs/RYVRO_RESEARCH_FUNNEL_AUTOMATION_PROMPT.md`
- `docs/RYVRO_ANGLE_FRAMEWORK.md`
- `docs/RYVRO_PLATFORM_PLAYBOOK.md`
- `docs/STOP_SCROLL_AUTOMATION_PROMPT.md`
- `docs/STOP_SCROLL_CONTENT_OS.md`

Acceptance checks:

- The main docs describe Universal Shift Builder as the single schedule system.
- FIFO docs are either template-specific or archived.
- Build-in-public/research docs say the product serves all shift workers, with mining as the origin story.

### 6. Product copy replacement map

Use these replacements consistently:

- `miner` -> `shift worker`, unless the selected industry is mining.
- `mining` -> `shift work`, `worksite`, or selected industry.
- `mine site` -> `work location`, `site`, `hospital`, `depot`, `plant`, `station`, `terminal`, `venue`.
- `FIFO roster` -> `FIFO/offshore template` only inside templates; otherwise `schedule` or `rotation`.
- `roster` -> `schedule` by default; keep `roster` as a secondary regional term.
- `swing` -> `work block` or `rotation block` unless FIFO/offshore context.
- `site days` -> `work days` or `location days`.
- `home block` -> `off days` or `rest days`.
- `haul truck operator` -> rotate examples: `nurse`, `security officer`, `driver`, `technician`, `firefighter`, `factory operator`.

Do not replace blindly:

- `determine`, `undetermined`, `examine`, or unrelated words containing `mine`.
- Historical archived docs if clearly marked as archived.
- Mining template names.
- Technical compatibility fields until migration is complete.

### 7. Universal QA scenarios to add to automated tests

Parser/AI fallback:

- `2 earlies, 2 lates, 2 nights, 4 off`
- `4 days, 4 nights, 4 off, today is second night`
- `24 on, 48 off`
- `48 on, 96 off`
- `Monday to Friday 7am to 3pm`
- `three 12-hour nights every week`
- `every other weekend`
- `14 offshore, 14 home, travel day before`
- `2 mornings, 2 afternoons, 2 nights, 4 off`
- `split shift 6-10 and 4-8`

Schedule calculation:

- overnight shifts crossing midnight
- all-day travel
- off/no-time shifts
- one-off swap
- one-off make-off
- holiday override preserving original shift
- imported timed event
- imported overnight event
- duplicate imported event
- timezone boundary around midnight

UI:

- onboarding AI builder
- onboarding manual builder
- settings AI builder
- settings manual builder
- color/icon updates on dashboard
- color/icon updates in settings
- exception rows
- reminder profile editor
- calendar export
- calendar import

Physical devices:

- iPhone 13
- iPhone XS Max
- small-screen simulator
- Android

### 8. External non-repo checklist

These cannot be completed only in code, but must be tracked before launch:

- Apple Developer app identifier and Sign in with Apple configuration.
- Firebase iOS app and Android app identifiers.
- Google OAuth client IDs and reversed client IDs.
- RevenueCat products, offerings, and entitlement display names.
- App Store Connect metadata, screenshots, privacy nutrition labels.
- Google Play Console metadata, screenshots, data safety.
- Support email templates.
- Password reset / verification email templates.
- Website/landing page.
- Domain, deep links, and universal links.
- Analytics dashboard names and saved charts.
- Crash reporting project/app display name.
- Customer support macros.
- Social media bios and pinned posts.
- Waitlist/email capture forms.

### 9. Definition of done for miner-first, universal-ready launch

The launch rebrand is not complete until all of these are true:

- The app installs with a broad, expandable brand/category name on iOS and Android.
- Store-facing bundle/package decisions are final before public launch.
- The first-run onboarding experience can speak directly to miners/FIFO workers, but it must not make the schedule system mining-only.
- Universal Shift Builder is the only schedule setup/editing surface.
- AI builder and manual builder are available from onboarding and settings.
- Default demo/e2e data includes miner/FIFO launch coverage plus at least one non-mining fixture proving universal capability.
- Mining/FIFO appears as the primary launch template family, not as a hard-coded product limit.
- Selected shift colors/icons render on dashboard, calendar, settings, builder preview, exceptions, and reminders.
- Holiday exceptions, one-off exceptions, import/export, and reminder profiles use language that works for miners and can expand to other shift workers.
- Social sign-in works after native Firebase changes.
- English launch-critical strings are miner-first but universal-ready.
- Non-English launch-critical strings do not contradict the miner-first/universal-ready strategy.
- App icon/splash/onboarding assistant are not permanently mining-trapped.
- Paywall and subscription copy sell miner/FIFO value powered by the universal schedule engine.
- Docs and marketing pages are either miner-first/universal-ready or clearly archived.
- Physical iPhone 13, physical iPhone XS Max, simulator, and Android QA have passed.
- CI passes after rebrand changes.
- A rollback tag or branch exists before release.

### 10. Suggested branch and rollback plan

- Create branch: `codex/universal-shift-worker-rebrand`.
- Before changing identifiers, tag current state: `pre-universal-rebrand`.
- Split implementation into commits:
  - identity/config
  - assets
  - English copy
  - localization
  - templates/test data
  - docs/marketing
  - QA fixes
- If bundle/package ID changes, do it in its own commit and test immediately.
- If OAuth breaks, revert only the identity/OAuth commit, not the whole Universal Builder work.
- Keep the Universal Builder feature work separate from branding commits so schedule functionality remains recoverable.

## Release Gate: Miner-First Universal-Ready Task Register

This register is the final source of truth for implementation. A task is not done until its verification step passes.

| ID     | Priority | Area         | Task                                                                                              | Verification                                                                                                     |
| ------ | -------- | ------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| RB-001 | P0       | Identity     | Pick final public app name and short native display name.                                         | Name appears in `app.json`, iOS display name, Android project name, store drafts, and docs.                      |
| RB-002 | P0       | Identity     | Decide final bundle/package ID before public release.                                             | Fresh install works under final ID; OAuth/Firebase files match.                                                  |
| RB-003 | P0       | Identity     | Update e2e bundle/container references after any ID change.                                       | `e2e/helpers/storage.ts` can seed simulator data.                                                                |
| RB-004 | P0       | Auth         | Verify email, Google, and Apple sign-in after native Firebase changes.                            | Real device sign-in test passes on iPhone 13 and simulator.                                                      |
| RB-005 | P0       | Onboarding   | First-run setup must route to Universal Shift Builder only.                                       | Fresh install reaches AI/manual/template setup, not legacy screens.                                              |
| RB-006 | P0       | Onboarding   | Remove mining-only onboarding copy while keeping miner-first launch positioning.                  | English onboarding can target miners/FIFO but does not hard-code the schedule model to mining only.              |
| RB-007 | P0       | Builder      | Confirm AI builder appears in onboarding and settings.                                            | UI test opens AI builder from both entry points.                                                                 |
| RB-008 | P0       | Builder      | Confirm manual builder appears in onboarding and settings.                                        | UI test edits a schedule manually from both entry points.                                                        |
| RB-009 | P0       | Builder      | Remove user-facing `phase offset` and `anchor date`.                                              | `rg -n "phase offset                                                                                             | anchor date" src/i18n src/screens src/components` has no user-facing hits. |
| RB-010 | P0       | Dashboard    | Shift colors/icons render on dashboard calendar and header.                                       | UI test saves custom colors/icons and sees them on dashboard.                                                    |
| RB-011 | P0       | Settings     | Shift colors/icons render in settings summary.                                                    | UI test saves custom colors/icons and sees them in profile/settings.                                             |
| RB-012 | P0       | Test Data    | Add non-mining fixture while keeping miner/FIFO launch fixture if desired.                        | E2E/test fixtures prove at least one mining and one non-mining schedule.                                         |
| RB-013 | P0       | Assets       | Replace mining helmet assistant avatar if it is the default brand avatar.                         | Default onboarding assistant is broad enough for future expansion; mining imagery can appear in miner templates. |
| RB-014 | P0       | Assets       | Replace app icon/splash if mining-trapped.                                                        | App home screen and splash do not block future non-miner adoption.                                               |
| RB-015 | P0       | Paywall      | Rewrite paywall from mining-only value to miner/FIFO-first value powered by universal scheduling. | Paywall can target miners/FIFO but does not make the product technically mining-only.                            |
| RB-016 | P0       | CI           | Run full validation after rebrand.                                                                | `npm run validate` passes.                                                                                       |
| RB-017 | P0       | CI           | Run focused universal builder tests.                                                              | Parser, schedule, builder, dashboard, settings tests pass.                                                       |
| RB-018 | P0       | GitHub       | Push branch and verify CI.                                                                        | GitHub Actions green on pushed branch.                                                                           |
| RB-019 | P1       | Localization | Rebrand English common/profile/dashboard/onboarding strings to miner-first/universal-ready.       | English UI is coherent for miners/FIFO and does not block later expansion.                                       |
| RB-020 | P1       | Localization | Update non-English locales or mark fallback strategy.                                             | Switching languages does not contradict the launch strategy.                                                     |
| RB-021 | P1       | Templates    | Add miner/FIFO launch templates first, then universal expansion templates.                        | Template picker supports launch audience and has a path for other industries.                                    |
| RB-022 | P1       | Templates    | Mining/FIFO appears as launch wedge, not hard-coded model.                                        | First-run can prioritize miners/FIFO without removing universal schedule capability.                             |
| RB-023 | P1       | AI           | Add parser tests for 20 industry phrases.                                                         | New parser test suite passes.                                                                                    |
| RB-024 | P1       | AI           | Add AI fallback telemetry and copy.                                                               | Fallback state is clear and not scary to users.                                                                  |
| RB-025 | P1       | Exceptions   | Holiday exception UI copy is universal.                                                           | Builder exception rows use universal holiday language.                                                           |
| RB-026 | P1       | Exceptions   | One-off swap UI copy is universal.                                                                | Builder one-off rows explain `changed just this day`.                                                            |
| RB-027 | P1       | Calendar     | Export copy and ICS metadata are universal.                                                       | Exported calendar contains shift names, times, locations, notes.                                                 |
| RB-028 | P1       | Calendar     | Import copy and errors are universal.                                                             | Bad import explains what to fix manually.                                                                        |
| RB-029 | P1       | Reminders    | Reminder profile copy is universal.                                                               | Smart reminders no longer say mine/site as the default.                                                          |
| RB-030 | P1       | Voice        | Voice assistant prompt context is universal.                                                      | Voice responses do not assume mining/FIFO.                                                                       |
| RB-031 | P1       | Docs         | Rewrite architecture docs around universal schedule.                                              | Main docs say Universal Shift Builder is source of truth.                                                        |
| RB-032 | P1       | Docs         | Archive FIFO-only docs or fold them into template docs.                                           | FIFO docs are marked archived or template-specific.                                                              |
| RB-033 | P1       | Store        | Draft new App Store screenshots and copy.                                                         | Screenshots can be miner/FIFO-first and brand remains expandable.                                                |
| RB-034 | P1       | Store        | Draft new Play Store screenshots and copy.                                                        | Screenshots can be miner/FIFO-first and brand remains expandable.                                                |
| RB-035 | P1       | Billing      | Rename RevenueCat display names and paywall products if miner-trapped.                            | User-facing products support launch positioning without blocking expansion.                                      |
| RB-036 | P1       | Legal        | Update privacy/terms for universal schedule and AI/calendar data.                                 | Legal docs mention AI prompt and calendar import/export if shipped.                                              |
| RB-037 | P1       | External     | Update Firebase app display names if user/support visible.                                        | Firebase project/app names do not confuse support workflow.                                                      |
| RB-038 | P1       | External     | Update Google OAuth clients if bundle/package changes.                                            | Google sign-in works after final IDs.                                                                            |
| RB-039 | P1       | External     | Update Apple app identifier and Sign in with Apple if bundle changes.                             | Apple sign-in works after final IDs.                                                                             |
| RB-040 | P2       | Marketing    | Rewrite founder/build-in-public docs to miner-first/universal-ready.                              | Mining is the launch wedge and origin story, not a permanent technical boundary.                                 |
| RB-041 | P2       | Support      | Update support macros and help copy.                                                              | Support replies mention shift workers broadly.                                                                   |
| RB-042 | P2       | Analytics    | Rename or map mining/FIFO-specific analytics fields.                                              | Dashboards segment by industry/template without mining default.                                                  |
| RB-043 | P2       | Visual QA    | Check small-screen iPhone layout.                                                                 | iPhone SE/XS Max screen has no clipped core text.                                                                |
| RB-044 | P2       | Visual QA    | Check dark/light surfaces if app supports both.                                                   | Text contrast and colors remain readable.                                                                        |
| RB-045 | P2       | Cleanup      | Remove stale backup/config files or update them.                                                  | Stale files do not reintroduce old app identity.                                                                 |

## Release Gate: Allowed Old Terms Policy

Use this policy when scanning the repo after implementation.

Allowed remaining terms:

- `mining`, `miner`, `mine`, `FIFO`, `roster`, and `swing` inside archived historical docs.
- `mining`, `FIFO`, and `offshore` inside optional templates or industry-specific examples.
- Technical compatibility field names that are internal-only and covered by tests.
- Words where `mine` is only part of another word, such as `determine`, `undetermined`, or `examine`.

Not allowed:

- App name or public product copy saying `Miner Shift Assistant`.
- Default onboarding making mining the only possible schedule model.
- Only having miner/FIFO test data with no non-mining proof fixture.
- Paywall social proof describing only miners or FIFO operators in a way that conflicts with the broad brand name.
- Settings labels that make `site` mean mine site by default.
- Dashboard copy that says FIFO/roster when the user did not choose that template.
- Store screenshots using only mining/FIFO is allowed for miner-first launch if the app name/description remains expandable.

Scan commands:

```bash
rg -n "Miner Shift Assistant|Test Mine|Mine Site|haul truck|underground|FIFO|fifo|miner|mining|mine site|roster|swing" src app.json app.config.js ios android e2e tests backend docs
rg -n "phase offset|anchor date" src i18n
rg -n "minershiftassistant|EllieMinerShiftAssistant" .
```

Each hit must be classified as:

- `must-change`
- `allowed-template`
- `allowed-archived-doc`
- `allowed-internal-compat`
- `false-positive`

## Release Gate: Agent Handoff Prompt

Use this prompt when asking another AI coding agent to implement the rebrand:

```text
You are working in /Users/Shared/Ellie. Read SHIFT_WORKER_APP_REBRAND_AUDIT.md completely before editing. The goal is to prepare a miner-first, universal-ready launch while preserving the Universal Shift Builder as the single schedule system.

Do not remove Universal Shift Builder behavior. Do not reintroduce legacy rotating/FIFO onboarding screens. Mining/FIFO is the launch wedge, but it must not become a hard-coded product limitation.

Implement the rebrand in small commits:
1. Identity/config.
2. Assets.
3. English copy.
4. Localization/fallbacks.
5. Test data/templates.
6. Docs/marketing.
7. QA fixes.

Before every commit run the relevant focused tests. Before final handoff run npm run validate, focused universal builder tests, auth tests, and UI smoke tests on simulator. If changing bundle/package IDs, test Google and Apple sign-in on a real iOS device.

Use the Release Gate task register in SHIFT_WORKER_APP_REBRAND_AUDIT.md as the acceptance checklist. Every remaining mining/FIFO/roster term must be classified under the Allowed Old Terms Policy.
```

## Release Gate: Final Verification Commands

Run these before calling the rebrand complete:

```bash
npm run validate
npm test -- --runInBand --silent src/services/__tests__/ShiftScheduleParserService.test.ts
npm test -- --runInBand --silent src/contexts/__tests__/AuthContext.test.tsx src/screens/auth/__tests__/SignInScreen.test.tsx src/screens/auth/__tests__/SignUpScreen.test.tsx
npm test -- --runInBand --silent src/utils/__tests__/universalShiftEdgeCases.test.ts src/utils/__tests__/universalShiftCalendarUtils.test.ts
rg -n "Miner Shift Assistant|Test Mine|Mine Site|haul truck|underground|minershiftassistant|EllieMinerShiftAssistant" src app.json app.config.js ios android e2e tests backend docs
rg -n "phase offset|anchor date" src src/i18n
```

Manual verification:

- Fresh install on iOS simulator.
- Fresh install on iPhone 13.
- Fresh install on iPhone XS Max.
- Fresh install on Android.
- Email sign-in.
- Google sign-in.
- Apple sign-in.
- Onboarding AI builder.
- Onboarding manual builder.
- Settings AI builder.
- Settings manual builder.
- Dashboard color/icon rendering.
- Settings color/icon rendering.
- Holiday exception.
- One-off swap.
- Calendar export.
- Calendar import.
- Reminder profile edit.

## Release Gate: Rebrand Completion Report Template

When implementation is finished, write a short report with:

```text
Branch:
Commit:
CI run:

Identity:
- App name:
- Bundle ID:
- Android package:

Completed P0 tasks:
Completed P1 tasks:
- RB-023 parser tests for 20 industry phrases: covered by `ShiftScheduleParserService.test.ts`.
- RB-024 AI fallback telemetry and copy: parser results now expose `parserSource` / `fallbackReason`, local fallback drafts persist that metadata, the review sheet shows plain-language fallback copy, and `UniversalShiftBuilderScreen` emits completion, fallback, clarification, acceptance, manual-edit, and save analytics.
- RB-025/RB-026/RB-027/RB-029 launch copy and calendar metadata: guarded by `ryvroEnvTemplate.test.ts` and `universalShiftCalendarUtils.test.ts`.
- RB-030 universal voice assistant prompt context: guarded by backend `ryvro-brain.test.ts`.
- RB-031/RB-032 active docs architecture and FIFO guide posture: guarded by `ryvroDocsArchive.test.ts`.
- RB-035 repo-side RevenueCat launch setup: guarded by `ryvroEnvTemplate.test.ts`; external dashboard changes remain account-owner work.
- RB-036 privacy/terms coverage for AI prompts and calendar import/export: guarded by `ryvroEnvTemplate.test.ts`.
Deferred P2 tasks:
- RB-042 analytics industry/template/source mapping: backend daily summaries now expose setup dimensions and redact legacy site/mining-site fields; external dashboards still need to consume the mapped dimensions.
- RB-041 support macros and help copy: repo-side templates are guarded by `ryvroEnvTemplate.test.ts`; published support desk/macros remain account-owner work.

Remaining old-term hits:
- must-change: 0 expected
- allowed-template:
- allowed-archived-doc:
- allowed-internal-compat:
- false-positive:

Device QA:
- iOS simulator: iPhone 16 dashboard smoke passed 15/15; iPhone XS Max simulator dashboard smoke passed 15/15 after clean install.
- iPhone 13:
- iPhone XS Max: simulator equivalent passed; physical device remains pending if required.
- Android: debug APK identity passed with package `com.ryvro.shiftplanner`; release-style Detox build, seeded dashboard smoke, auth form/navigation smoke, onboarding through Universal Shift Builder, and profile language-selector smoke passed on `Medium_Phone_API_36.0`; physical device and real provider auth QA remain pending.

Auth QA:
- Email:
- Google:
- Apple:

Universal Builder QA:
- Onboarding AI:
- Onboarding manual:
- Settings AI:
- Settings manual:
- Color/icon dashboard:
- Color/icon settings:
- Exceptions:
- Import/export:
- Reminders:

Rollback tag/branch:
Known risks:
```

## Working Tracker: Phase Checklist

Use this section during implementation. Do not mark a phase complete until every checkbox in that phase is complete and the phase gate passes.

### Phase 0: Freeze, Branch, And Baseline

- [ ] Create branch `codex/universal-shift-worker-rebrand`.
- [ ] Tag or note rollback point before identity changes.
- [ ] Save current CI status.
- [ ] Save current app install status on simulator and iPhone 13.
- [ ] Confirm whether iPhone XS Max is available before using it as a blocking QA target.
- [ ] Run `npm run validate`.
- [ ] Run focused auth tests.
- [ ] Run focused Universal Builder tests.
- [ ] Capture current old-term scan output and classify obvious false positives.

Phase gate:

- [ ] Baseline is reproducible.
- [ ] Rollback point exists.
- [ ] Current known failures are documented before rebrand edits begin.

### Phase 1: Public Identity

- [ ] Finalize public name.
- [ ] Finalize short app label.
- [x] Finalize bundle ID/package ID decision: `com.ryvro.shiftplanner`.
- [x] Update `app.json`.
- [x] Update `app.config.js` if needed.
- [ ] Update or remove `app.config.js.backup`.
- [ ] Update `android/settings.gradle`.
- [x] Update iOS display name.
- [x] Update e2e bundle/container references if ID changes.
- [x] Replace Google/Firebase native config file bundle/package values in tracked local fixtures; fresh console-generated production files still require Firebase owner access.
- [x] Test iOS build settings after identity changes.
- [ ] Test simulator install after identity changes.
- [ ] Test real iPhone install after identity changes.

Phase gate:

- [ ] App installs and launches under final identity.
- [ ] Auth still works or any OAuth reconfiguration work is explicitly tracked.
- [ ] No public app identity still says miner/mining.

### Phase 2: Core Assets

- [ ] Replace app icon.
- [ ] Replace adaptive icon.
- [ ] Replace splash image.
- [ ] Replace favicon.
- [ ] Replace mining helmet assistant avatar in all density folders.
- [ ] Replace consolidated mining helmet assets.
- [ ] Add universal assistant/source asset.
- [ ] Add industry template thumbnail set.
- [ ] Update import paths from old asset names where needed.
- [ ] Verify assets render in onboarding.
- [ ] Verify assets render on app icon/home screen.

Phase gate:

- [ ] Default app visuals read as universal shift calendar/planner.
- [ ] Mining visuals appear only inside optional mining/offshore templates or archived docs.

### Phase 3: English Product Copy

- [ ] Rebrand `common.json`.
- [ ] Rebrand `onboarding.json`.
- [ ] Rebrand `profile.json`.
- [ ] Rebrand `dashboard.json`.
- [ ] Rebrand auth screens.
- [ ] Rebrand onboarding screens.
- [ ] Rebrand dashboard cards.
- [ ] Rebrand profile/settings screens.
- [ ] Rebrand paywall.
- [ ] Rebrand reminder copy.
- [ ] Rebrand calendar import/export copy.
- [ ] Rebrand exception copy.
- [ ] Rebrand AI builder examples.
- [ ] Rebrand manual builder helper text.
- [ ] Replace location/site examples with universal examples.

Phase gate:

- [ ] English UI no longer assumes mining, FIFO, mine sites, or miner personas.
- [ ] Universal Builder remains understandable to a non-technical shift worker.

### Phase 4: Localization

- [ ] Identify all changed English keys.
- [ ] Update translated `common.json` files.
- [ ] Update translated `onboarding.json` files.
- [ ] Update translated `profile.json` files.
- [ ] Update translated `dashboard.json` files.
- [ ] Mark machine-translated strings for human review if applicable.
- [ ] Test language switch on simulator.
- [ ] Scan translated files for old mining-first copy.

Phase gate:

- [ ] Changing language does not bring back mining-first onboarding or paywall copy.
- [ ] Critical screens still fit on mobile.

### Phase 5: Universal Templates And Demo Data

- [ ] Replace default e2e user occupation.
- [ ] Replace default e2e company.
- [ ] Add healthcare fixture.
- [ ] Add security fixture.
- [ ] Add emergency services fixture.
- [ ] Add manufacturing fixture.
- [ ] Add transport/logistics fixture.
- [ ] Add hospitality/retail fixture.
- [ ] Add aviation/rail fixture.
- [ ] Add offshore/mining fixture as optional.
- [ ] Add universal template metadata.
- [ ] Add template colors/icons/reminder defaults.
- [ ] Add template QA cases.

Phase gate:

- [ ] Default demo user is not a miner.
- [ ] Mining remains supported as one template family.
- [ ] Templates save into Universal Shift Builder data, not legacy fields.

### Phase 6: Builder, Calendar, Exceptions, And Reminders

- [ ] Verify onboarding AI builder entry.
- [ ] Verify onboarding manual builder entry.
- [ ] Verify settings AI builder entry.
- [ ] Verify settings manual builder entry.
- [ ] Verify color picker updates dashboard.
- [ ] Verify icon picker updates dashboard.
- [ ] Verify color/icon updates settings.
- [ ] Verify holiday exception copy and rendering.
- [ ] Verify one-off swap copy and rendering.
- [ ] Verify imported event copy and rendering.
- [ ] Verify exported ICS event names.
- [ ] Verify reminder profiles per shift type.
- [ ] Verify “phase offset” is not user-facing.
- [ ] Verify “anchor date” is not user-facing.

Phase gate:

- [ ] Builder is universal and complete from onboarding and settings.
- [ ] Calendar, settings, exceptions, reminders, import, and export all honor selected shift colors/icons.

### Phase 7: Auth, Billing, Analytics, And External Systems

- [ ] Test email sign-in.
- [ ] Test Google sign-in.
- [ ] Test Apple sign-in.
- [ ] Update RevenueCat product display names.
- [ ] Update RevenueCat offering names.
- [ ] Update paywall benefits.
- [ ] Update analytics event names or mappings.
- [ ] Update Firebase visible app names if needed.
- [ ] Update Google OAuth clients if bundle/package changes.
- [ ] Update Apple app identifier if bundle changes.
- [ ] Update support email templates.
- [ ] Update password reset/email verification templates.

Phase gate:

- [ ] Account creation and sign-in are trustworthy.
- [ ] Billing/paywall language sells universal shift-worker value.
- [ ] External dashboards do not confuse support or launch review.

### Phase 8: Docs, Marketing, Legal, And Store

- [ ] Rewrite architecture docs.
- [ ] Rewrite API/reference docs.
- [ ] Rewrite testing strategy.
- [ ] Rewrite deployment docs.
- [ ] Archive FIFO-only docs.
- [ ] Rewrite build-in-public docs.
- [ ] Rewrite research funnel docs.
- [ ] Draft App Store listing.
- [ ] Draft Google Play listing.
- [ ] Draft screenshots.
- [ ] Draft preview video outline.
- [ ] Update privacy policy.
- [ ] Update terms.
- [ ] Update support FAQ.
- [ ] Update social bios.
- [ ] Update landing page copy if present.

Phase gate:

- [ ] Public materials describe a universal shift-worker app.
- [ ] Mining origin story is allowed, but no public surface makes mining the whole product.

### Phase 9: Automated QA

- [x] `npm run validate`.
- [x] Auth tests.
- [x] Parser tests.
- [x] Universal schedule edge-case tests.
- [x] Calendar import/export tests.
- [x] Dashboard tests.
- [x] Settings tests.
- [x] Onboarding tests.
- [x] Reminder tests.
- [x] E2E smoke test if available.
- [x] Old-term scan.
- [x] Bundle/package identity scan.

Phase gate:

- [x] All P0/P1 automated checks pass.
- [x] Remaining old-term hits are classified and allowed.

### Phase 10: Device QA

- [x] Fresh install on iOS simulator. Detox installed rebuilt `Ryvro.app` on a clean iPhone XS Max simulator before the seeded dashboard smoke.
- [ ] Fresh onboarding on iOS simulator.
- [ ] Settings edit on iOS simulator.
- [ ] Dashboard color/icon check on iOS simulator.
- [ ] Fresh install on iPhone 13.
- [ ] Auth check on iPhone 13.
- [ ] Universal Builder check on iPhone 13.
- [ ] Fresh install on iPhone XS Max when available.
- [x] Small-screen visual QA on iPhone XS Max or equivalent simulator.
- [x] Android release-style build/install dashboard smoke on emulator. `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/dashboard.test.ts` passed 15/15 dashboard tests.
- [x] Android release-style auth form/navigation smoke on emulator. `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/auth.test.ts` passed 16/16 auth tests.
- [x] Android release-style onboarding Universal Shift Builder happy path on emulator. `DETOX_ANDROID_AVD=Medium_Phone_API_36.0 DETOX_ANDROID_ARCHS=arm64-v8a npx detox test --configuration android.release e2e/onboarding.test.ts` passed Welcome through Completion.
- [ ] Android physical device QA.
- [ ] Android real Firebase/OAuth provider auth check.
- [ ] Android physical-device Universal Builder check.

Phase gate:

- [ ] iOS and Android both pass core user flows.
- [ ] Small-screen layouts do not clip critical text or controls.

### Phase 11: GitHub And Release Readiness

- [ ] Commit changes in logical groups.
- [ ] Push branch.
- [ ] Verify GitHub CI.
- [x] Attach completion report.
- [x] Attach old-term classification.
- [x] Attach device QA notes.
- [x] Attach rollback note.
- [ ] Confirm deferred tasks are not P0/P1 launch blockers.

Phase gate:

- [ ] CI is green.
- [x] Completion report is filled.
- [ ] Rebrand can be reviewed or merged without hidden assumptions.

## Working Tracker: Old-Term Classification Table

Fill this table after each old-term scan.

| Term/Path                                                                | Classification            | Reason                                               | Action                              |
| ------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `app.json` app name                                                      | done                      | Public app identity is Ryvro Shift Planner           | Keep verified                       |
| `ios/Ellie/Info.plist` display name                                      | done-generated-native     | Local generated native output now displays Ryvro     | Regenerate with EAS/native workflow |
| `android/settings.gradle` root name                                      | done-generated-native     | Local generated native output now uses Ryvro         | Regenerate with EAS/native workflow |
| `e2e/helpers/testData.ts` default fixture                                | done                      | Default demo user is neutral; mining is separate     | Keep both fixture classes           |
| `assets/.../mining-helmet-sacred-flame.png`                              | done                      | Retired helmet family removed from active assets     | Keep only archived references       |
| `build-in-public/**` mining helmet avatar references                     | done                      | Publishable story packs now use Ryvro assistant copy | Guarded by public-content scan      |
| `docs/USER_GUIDE_FIFO.md`                                                | rewritten                 | Current guide routes FIFO through builder            | Keep as template-specific guide     |
| `docs/FIFO_QA_CHECKLIST.md`                                              | archived                  | Historical fixed-roster QA                           | Keep in legacy archive              |
| `docs/RELEASE_NOTES_FIFO_DUAL_ROSTER.md`                                 | archived                  | Historical release note                              | Keep in legacy archive              |
| `src/i18n/locales/*/onboarding.json` FIFO copy                           | allowed-template-specific | FIFO keys remain for migration/template labels       | Do not use as default flow          |
| `src/i18n/locales/*/common.json` paywall miner social proof              | cleaned                   | Broad social proof now used where launch-critical    | Keep miner examples only by intent  |
| `src/components/shift-builder/ShiftInspectorSheet.tsx` location examples | done                      | Builder placeholder uses broader site/location copy  | Keep broad examples                 |

## Working Tracker: Concrete Replacement Decisions

Use these defaults unless the product owner chooses different names.

- App display name: `Ryvro Shift Planner`.
- Short app label: `Ryvro`.
- Bundle ID: `com.ryvro.shiftplanner`.
- Android package: `com.ryvro.shiftplanner`.
- Default e2e user name: `E2E Tester`.
- Default launch e2e occupation: `Shift Operator`.
- Required proof fixture occupation: `Nurse`, `Security Officer`, or `Factory Operator`.
- Default launch e2e employer: `Universal Shift Co.`.
- Required non-mining fixture employer: `City Hospital`, `Metro Depot`, or `North Plant`.
- Default location example: `Site, hospital, depot, terminal, plant, store, station, venue`.
- Default AI prompt example: `2 earlies, 2 lates, 2 nights, then 4 off`.
- Default manual builder title: `Build your shift schedule`.
- Default settings entry: `Edit shift schedule`.
- Default AI settings entry: `Describe a new schedule`.
- Default template entry: `Start from a template`.
- Default holiday copy: `Treat public holidays differently`.
- Default one-off copy: `Change just this day`.
- Default calendar export copy: `Export to calendar`.
- Default calendar import copy: `Import roster or calendar file`.

## Working Tracker: Miner-First Universal-Ready Pass/Fail Summary

The launch rebrand passes only when:

- [ ] P0 task count complete: 18/18.
- [ ] P1 task count complete or explicitly approved for later.
- [ ] No `must-change` old-term hits remain.
- [ ] Identity/config changes install successfully.
- [ ] App assets are not permanently mining-trapped.
- [ ] Onboarding is miner-first and universal-ready.
- [ ] Settings are miner-first and universal-ready.
- [ ] Dashboard supports miner/FIFO launch schedules and non-mining proof fixtures.
- [ ] Paywall is miner/FIFO-first and universal-ready.
- [ ] AI/manual builder entry points work.
- [ ] Import/export/reminders/exceptions work with language that can expand beyond mining.
- [ ] Auth works.
- [ ] CI works.
- [ ] Device QA works.
- [ ] Rollback exists.
