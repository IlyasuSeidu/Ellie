# Release Notes: Dual Roster + FIFO Voice Tools

Date: 2026-02-28

## Highlights

- Added dual roster support:
  - Rotating rosters
  - FIFO/block rosters
- Added FIFO onboarding path:
  - Roster type selection
  - FIFO custom pattern setup
  - FIFO phase selector
- Updated dashboard for FIFO:
  - Work/Rest legends
  - Block-aware status labels
  - Block countdown messaging
- Expanded voice assistant scheduling tools:
  - `get_next_work_block`
  - `get_next_rest_block`
  - `days_until_work`
  - `days_until_rest`
  - `current_block_info`
- Backend parity for all scheduling tools with normalized envelope compatibility.

## Reliability/Quality

- Full type-check passed.
- Full test suite passed.
- Backend functions build passed.
- Coverage report generated for baseline tracking.

## Developer Notes

- Use `npm run release:check` before release.
- Manual device QA remains required for final release sign-off:
  - iOS physical device
  - Android physical device
