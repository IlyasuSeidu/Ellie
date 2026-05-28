# FIFO + Voice QA Checklist

## Automated gate

- [ ] `npm run type-check`
- [ ] `npm test -- --runInBand`
- [ ] `npm run backend:build`

## Onboarding flows

- [ ] Rotating flow reaches completion and dashboard.
- [ ] FIFO preset flow reaches completion and dashboard.
- [ ] FIFO custom flow (`FIFOCustomPattern`) reaches completion and dashboard.
- [ ] Correct routing to `PhaseSelector` vs `FIFOPhaseSelector`.

## Dashboard

- [ ] FIFO legend shows `Work Block` and `Rest Block`.
- [ ] FIFO day badges render `W` / `H` markers.
- [ ] Status card shows `WORK BLOCK`/`REST BLOCK` and `Day X of Y`.
- [ ] Countdown switches between next work/rest block text.

## Voice assistant

- [ ] `get_next_work_block` tool path returns expected date.
- [ ] `get_next_rest_block` tool path returns expected date.
- [ ] `days_until_work` and `days_until_rest` return correct numbers.
- [ ] `current_block_info` reports block, day-in-block, and days-to-change.
- [ ] No stuck state after `no-speech`, offline, backend error, and permission denial.

## Platform smoke

- [ ] iOS dev client smoke pass
- [ ] Android dev client smoke pass
- [ ] Wake-word unavailable path still allows manual tap-to-talk
