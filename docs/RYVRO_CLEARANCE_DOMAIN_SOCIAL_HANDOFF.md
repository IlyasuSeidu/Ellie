# Ryvro Clearance, Domain, And Social Handoff

Last updated: 2026-06-06

Use this checklist for the external clearance and public ownership work that must happen before Ryvro can be treated as launch-ready. It covers formal trademark/legal clearance, App Store and Google Play name checks, domain purchase, DNS and HTTPS proof, support mailbox setup, legal page publication, and social handle reservation.

This file is not legal advice. Public search results and automated checks are only preflight evidence. Formal trademark/legal clearance must come from the owner, counsel, or a launch-market trademark-search report before submission.

Do not store registrar passwords, payment details, legal invoices, legal privileged communications, mailbox passwords, DNS provider API keys, social account recovery codes, or private verification documents in Git, docs, screenshots, or chat.

## Required Launch Values

- Brand: `Ryvro`
- App Store name: `Ryvro Shift Planner`
- Google Play title: `Ryvro Shift Planner`
- iOS bundle ID: `com.ryvro.shiftplanner`
- Android package: `com.ryvro.shiftplanner`
- Preferred domain: `getryvro.com`
- Privacy policy URL: `https://getryvro.com/privacy`
- Terms URL: `https://getryvro.com/terms`
- Support URL: `https://getryvro.com/support`
- Account deletion URL: `https://getryvro.com/delete-account`
- Support email: `support@getryvro.com`
- Preferred social handle: `@ryvro`
- Fallback social handles: `@getryvro`, `@tryryvro`

## Current Public Preflight Evidence

Run:

```bash
npm run release:clearance
```

Latest public preflight captured on 2026-06-06 at `2026-06-06T13:11:48.530Z`:

- Apple public software search returned 5 fuzzy results and no exact `Ryvro` or `Ryvro Shift Planner` app result.
- Google Play public search found no exact `Ryvro` or `Ryvro Shift Planner` result text; visible fuzzy names were `Rydoo` and `Rydora`.
- USPTO Trademark Search app was reachable with status `200`; this is not legal clearance.
- `getryvro.com` had no public DNS records and Verisign `.com` returned no match.
- `useryvro.com`, `tryryvro.com`, and `getryvroapp.com` had no public DNS records and Verisign `.com` returned no match.
- `ryvro.app`, `ryvro.co`, `ryvro.io`, `ryvro.ai`, `ryvro.net`, and `ryvro.org` had no public DNS records in the preflight.
- `ryvro.com` is already registered through GoDaddy/Afternic, with public A records `76.223.54.146` and `13.248.169.48`, creation date `2025-06-16T10:06:52Z`, expiry date `2026-06-16T10:06:52Z`, and Afternic nameservers.
- X, Instagram, and TikTok `@ryvro` returned public `200` responses; this is not ownership or availability proof.
- YouTube `@ryvro` and LinkedIn `company/ryvro` returned public `404` responses; still reserve directly while logged in.

Logged-in browser reservation progress from 2026-06-06:

- Spaceship showed `getryvro.com` as available.
- The domain was added to the Spaceship cart without add-ons.
- Cart evidence showed `getryvro.com`, first-year line price `$8.88`, renewal price `$9.98`, and visible total `$9.08`.
- The owner then confirmed `getryvro.com` was purchased.
- Spaceship Advanced DNS was configured with an `A` record for host `@` pointing to `199.36.158.100` and a `TXT` record for host `@` with value `hosting-site=ryvro-launch-site`.
- Public DNS checks on 2026-06-06 returned `199.36.158.100` for `getryvro.com A` and `"hosting-site=ryvro-launch-site"` for `getryvro.com TXT`.
- Firebase Console has custom domain `getryvro.com` attached to Hosting site `ryvro-launch-site`. After adding Firebase's required `_acme-challenge.getryvro.com` TXT record in Spaceship, Firebase accepted the domain verification and initially moved the custom domain to `Minting certificate`.
- Public DNS checks on 2026-06-06 returned the `_acme-challenge.getryvro.com` TXT value requested by Firebase from local DNS, Google DNS, and Cloudflare DNS.
- A later Firebase Hosting custom-domain API recheck on 2026-06-06 reported `hostState` `HOST_ACTIVE`, `ownershipState` `OWNERSHIP_ACTIVE`, and certificate state `CERT_ACTIVE`.
- Spaceship Email forwarding now has individual rules forwarding `support@getryvro.com` and `reviewer@getryvro.com` to `seiduilyasu94@gmail.com`.
- Public DNS checks on 2026-06-06 returned Spaceship email-forwarding MX records `mx1.efwd.spaceship.net` and `mx2.efwd.spaceship.net`, plus SPF TXT value `v=spf1 include:spf.efwd.spaceship.net ~all`.
- A Gmail test message from `seiduilyasu94@gmail.com` to `support@getryvro.com` sent successfully, but Gmail did not show a forwarded inbound copy because the sender and forwarding destination were the same mailbox. The requested outside sender `seiduilyasu@tmail.com` could not be used because `tmail.com` returned no public MX or A records and Chrome showed a DNS error. Final mailbox proof still needs a test from a reachable different sender.
- Live HTTPS checks on 2026-06-06 returned HTTP `200` for `https://getryvro.com/`, `/privacy/`, `/terms/`, `/support/`, `/delete-account/`, and `/auth/action/`.
- The live account deletion page now includes a prefilled deletion request link to `support@getryvro.com` with subject `Ryvro account deletion request`, account email, country, and optional-notes fields, plus a primary `Start deletion request` action. Keep the broader launch row pending until support mailbox evidence, final legal/content review, and store-console evidence are complete.

## Formal Clearance

Complete before public launch.

- Search the intended launch markets for `Ryvro`, `Ryvro Shift Planner`, and confusingly similar names.
- Check app/productivity, workforce scheduling, calendar, AI assistant, subscription software, and mobile app categories.
- Confirm whether `Ryvro` is safe enough for the intended launch markets.
- Confirm whether the app can use `Ryvro Shift Planner` as the store title.
- Keep the full legal report or counsel communication outside the repo.

Record only non-secret evidence:

- Clearance source: counsel, trademark-search report, or owner search packet
- Launch markets checked
- Search date
- Decision summary: pass, pass with caveats, or failed
- Any required fallback name or domain decision

## Domain Reservation And DNS

Reserve the launch domain before store submission.

- Purchase or reserve `getryvro.com` if available.
- If `getryvro.com` is unavailable, choose a fallback and update all repo/env/store references together.
- Do not treat `ryvro.com` as available unless it is purchased from the current registrant.
- Configure DNS through the chosen registrar or DNS provider.
- Configure HTTPS.
- Publish the landing, privacy, terms, support, and account deletion pages.
- Configure `support@getryvro.com` before store review.

Required live checks:

```bash
dig +short getryvro.com A
dig +short getryvro.com TXT
dig +short _acme-challenge.getryvro.com TXT
curl -I http://getryvro.com
curl -I https://getryvro.com
curl -I https://getryvro.com/privacy
curl -I https://getryvro.com/terms
curl -I https://getryvro.com/support
curl -I https://getryvro.com/delete-account
curl -I https://getryvro.com/auth/action/
```

Record:

- Registrar purchase or reservation note
- Domain owner/control proof
- DNS provider note
- HTTPS status for all required URLs
- Support mailbox send/receive test note
- Account deletion request-flow test note
- Any deployment target, such as Firebase Hosting, Vercel, Netlify, or static host

## Static Launch Pages

Repo-side drafts already exist:

- Landing page: `web/launch/index.html`
- Privacy page: `web/launch/privacy/index.html`
- Terms page: `web/launch/terms/index.html`
- Support page: `web/launch/support/index.html`
- Account deletion page: `web/launch/delete-account/index.html`

Firebase Hosting progress from 2026-06-06:

- Separate Hosting site: `ryvro-launch-site`
- Default Hosting URL: `https://ryvro-launch-site.web.app`
- Custom domain: `https://getryvro.com`
- Privacy and terms effective date: `June 6, 2026`
- Live privacy check: `curl -sS https://getryvro.com/privacy/` confirmed `Effective date: June 6, 2026`
- Live terms check: `curl -sS https://getryvro.com/terms/` confirmed `Effective date: June 6, 2026`
- Local target mapping: `.firebaserc` maps project `ryvro-shift-planner` target `launch-site` to site `ryvro-launch-site`
- Deployment command used: `npm run firebase:deploy:launch-site -- --project ryvro-shift-planner`
- Verified fallback HTTP checks: `/`, `/privacy/`, `/terms/`, `/support/`, `/delete-account/`, and `/auth/action/` returned HTTP `200`; `/privacy` returned a single HTTP `301` to `/privacy/`
- `http://getryvro.com` now returns HTTP `301` to `https://getryvro.com/`.
- `https://getryvro.com/`, `/privacy/`, `/terms/`, `/support/`, `/delete-account/`, and `/auth/action/` now return HTTP `200` with the launch-site security headers.
- Firebase now reports certificate state `CERT_ACTIVE`, but repeat the HTTPS checks against the production domain before final store submission.

Before publishing:

- Review all legal/support copy.
- Set final effective dates.
- Repeat the HTTPS checks against the production domain.
- Confirm subscription, RevenueCat, Firebase, AI provider, microphone, calendar import/export, analytics, diagnostics, and account deletion behavior match the shipped build.
- Confirm the pages do not claim Ryvro is live before App Store and Google Play evidence exists.
- Confirm in-app links, App Store Connect, Google Play Console, Firebase Auth email templates, RevenueCat, and store review notes use the same live URLs.

## Social Handle Reservation

Reserve while logged in. Public HTTP status is not enough.

Preferred:

- X: `@ryvro`
- Instagram: `@ryvro`
- TikTok: `@ryvro`
- YouTube: `@ryvro`
- LinkedIn company page: `Ryvro`

Fallbacks:

- `@getryvro`
- `@tryryvro`

Record:

- Platform
- Reserved handle or fallback handle
- Profile URL
- Display name
- Owner account email or business account note, without password or recovery codes
- Bio/status note
- Link to `https://getryvro.com`

## Evidence Log Updates

Update `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` after owner proof exists.

Only mark rows `Passed` when the matching evidence is complete:

- Formal trademark/legal clearance for `Ryvro`
- Domain control for `getryvro.com`
- `Social handles`
- `Privacy page`
- `Terms page`
- `Support page/mailbox`
- `Account deletion page`

Keep rows as `Pending owner evidence` until the owner evidence exists and `npm run release:submit:check` no longer reports those rows.
