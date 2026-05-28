# Ryvro Store Listing Pack

Last updated: 2026-05-28

This pack is the source copy for App Store Connect, Google Play Console, screenshots, and launch review notes. It keeps the launch wedge miner/FIFO-first without trapping Ryvro as mining-only.

## Source Requirements

- Apple requires a privacy policy URL for all apps in App Store Connect app privacy metadata.
- Google Play main store listing fields include an app name, short description, and full description. Google Play lists a 30 character app name limit, an 80 character short description limit, and a 4000 character full description limit.
- Google Play metadata must be clear, accurate, not misleading, and should not use ranking, price, or promotional claims in the title, icon, screenshots, or description.

Sources:

- Apple App Store Connect app privacy reference: https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy
- Apple App Store Connect manage app privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Google Play create and set up your app: https://support.google.com/googleplay/android-developer/answer/9859152
- Google Play metadata policy: https://support.google.com/googleplay/android-developer/answer/9898842

## App Identity

- App Store name: Ryvro Shift Planner
- Google Play app name: Ryvro Shift Planner
- Native display name: Ryvro
- Bundle ID: com.ryvro.shiftplanner
- Android package: com.ryvro.shiftplanner
- Primary category: Productivity
- Secondary category: Utilities
- Launch audience: miners, FIFO crews, and rotating shift workers
- Expansion audience: healthcare, security, emergency services, manufacturing, transport, hospitality, aviation, rail, and other shift workers

## App Store Subtitle

AI schedules for shift workers

## Google Play Short Description

AI shift planner for FIFO, mining, nights, rosters, reminders, and calendars.

Character count: 79

## Promotional Text

Build your shift pattern with AI, edit it manually, add exceptions, and export your roster to your calendar.

## App Store Description

Ryvro helps miners, FIFO crews, and shift workers know exactly what they are working today, tomorrow, and months from now.

Describe your shift pattern in plain English, start from a template, or build it manually with the Universal Shift Builder. Ryvro turns repeating rosters, night shifts, days off, travel days, training, on-call work, holidays, and one-off swaps into a clear schedule you can trust.

Built for real shift work:

- AI-assisted shift builder for natural-language schedules
- Manual Universal Shift Builder for custom rotations
- Launch templates for mining/FIFO plus healthcare, security, emergency services, manufacturing, transport, hospitality, aviation, and rail
- Day, night, evening, morning, travel, training, on-call, leave, holiday, and custom shift types
- Shift colors and icons that show across the calendar and dashboard
- One-off irregular exceptions for swaps and roster changes
- Holiday exceptions for public holidays and special days
- Reminder profiles per shift type
- Calendar import and export
- Offline-first schedule visibility for low-signal work environments

Ryvro is miner-first because that is where the product started: real FIFO and rotating-shift pain. But the schedule engine is universal, so it can support almost any worker whose life runs around shifts.

Use Ryvro to stop counting through your roster manually and start planning your life with confidence.

## Google Play Full Description

Ryvro is an AI-assisted shift planner for miners, FIFO crews, and shift workers.

If your schedule repeats, rotates, swaps, runs overnight, changes by site, or does not fit a simple 9-to-5 calendar, Ryvro helps you turn it into a clear plan.

Build your schedule three ways:

- Describe your shift pattern in words
- Start from a shift-work template
- Build manually with the Universal Shift Builder

Ryvro supports:

- FIFO and mining rosters
- 4 days, 4 nights, 4 off
- 2-2-3 and Pitman-style schedules
- 24/48 emergency service shifts
- early, late, and night transport patterns
- hospitality and retail weekly patterns
- manufacturing continental rotations
- custom sequences for any shift worker

Key features:

- AI shift builder for natural-language schedule setup
- Manual drag-and-drop style Universal Shift Builder
- Shift names, colors, icons, start times, and end times
- Day, night, evening, morning, travel, training, on-call, leave, holiday, and custom shift types
- Calendar preview before saving
- Dashboard colors and icons for the current shift
- One-off exceptions for swaps or changed days
- Holiday exceptions for public holidays and special work rules
- Reminder profiles per shift type
- Calendar import and export
- Offline-first access to your schedule

Ryvro is built for shift workers who need certainty: whether you are heading to site, starting nights, planning family time, checking your next rest block, or trying to avoid setting the wrong alarm.

Miner-first at launch. Universal by design.

## Keywords

shift planner, roster, FIFO, mining roster, shift calendar, night shift, work schedule, rotation, days off, shift reminders, 4 on 4 off, 2-2-3, Pitman schedule, nurse schedule, security roster, firefighter schedule, transport roster

## Screenshot Set

1. AI Builder
   - Caption: Describe your shifts in plain English
   - Screen: Universal Shift Builder AI prompt and generated preview

2. Manual Builder
   - Caption: Build any rotation manually
   - Screen: shift definitions, colors, icons, and sequence builder

3. Calendar Preview
   - Caption: See days, nights, off days, and swaps
   - Screen: monthly calendar with colored shift icons

4. Dashboard
   - Caption: Know what you are working now
   - Screen: current shift, next shift, countdown, and quick actions

5. Exceptions
   - Caption: Handle holidays and one-off changes
   - Screen: holiday exception and swap editing

6. Reminders
   - Caption: Set reminders per shift type
   - Screen: advanced reminder profiles

7. Templates
   - Caption: Start from real shift-work templates
   - Screen: mining/FIFO, healthcare, security, emergency, manufacturing, transport, hospitality, aviation/rail templates

## App Review Notes

Ryvro creates shift schedules from manual input, templates, or user-provided natural-language descriptions. It stores user schedule data, reminders, profile fields, and app settings. Voice and AI features may use third-party providers when enabled. Subscription access is handled through RevenueCat and the native app stores.

Test account:

- Email: to be created in the production Firebase project
- Password: to be created before submission
- Subscription state: include either a sandbox subscription path or reviewer instructions for the unlocked test account

Review paths:

- Create account or sign in
- Complete onboarding
- Use Universal Shift Builder
- Save a schedule
- View dashboard and calendar
- Open settings and edit schedule
- Test paywall or sandbox subscription if requested

## Do Not Use

- "Best ever"
- "#1 shift app"
- "Guaranteed"
- Anonymous testimonials
- Price claims in screenshots or promotional graphics
- Claims that Ryvro replaces employer payroll, HR, or official rostering systems
