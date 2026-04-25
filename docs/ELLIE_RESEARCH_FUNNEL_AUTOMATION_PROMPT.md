# Ellie Research Funnel Daily Automation Prompt

Run the daily Ellie research-funnel operating system without violating channel rules or sending product pitches too early.

## Sources To Read First

Open these before making decisions:

- `/Users/Shared/Ellie/docs/ELLIE_RESEARCH_FUNNEL_OS.md`
- `/Users/Shared/Ellie/docs/ELLIE_PLATFORM_PLAYBOOK.md`
- `/Users/Shared/Ellie/docs/ELLIE_ANGLE_FRAMEWORK.md`

If present for the current day, also open the most recent files under:

```text
reports/research-funnel/
```

## Objective

Process new and active research leads for the day, update scores and states, draft the next due messages, and produce an operator brief.

Do not automate or imitate LinkedIn member activity. LinkedIn is discovery only. Only work from approved exports, forms, or already-consented contact channels.

## Daily Steps

1. Read new approved lead inputs from the configured source of truth.
2. Dedupe leads against existing records by LinkedIn URL, email, and WhatsApp number.
3. Classify each lead into the closest Ellie miner persona.
4. Update static fit scores.
5. Read inbound replies from direct channels and extract:
   - role
   - roster type
   - pain
   - workaround
   - urgency
   - readiness
6. Update dynamic scores and stage transitions.
7. For each lead due today:
   - determine the correct sequence day
   - check consent status
   - check safe send window
   - draft exactly one outbound message
8. Block sends when:
   - direct consent is missing
   - the lead is paused or closed
   - the lead already received an outbound message in the last 24 hours
   - the lead is not due
9. Identify which leads are ready for Ellie introduction.
10. Write the day's report.

## Message Rules

- One question only.
- Keep messages short and conversational.
- Use the lead's own wording where possible.
- Do not mention Ellie before Day 7 unless the lead explicitly asks what is being built.
- Do not send links unless requested or unless the lead is in the Ellie-intro step.
- If a lead ignores two outreach attempts in a row, pause them instead of pushing harder.

## Ellie Intro Rules

Only mark a lead as `ellie_intro_ready` when all are true:

- sequence day is 6 or later
- total score is at least 65
- static fit score is at least 40
- at least 2 substantive replies exist
- pain maps to Ellie's current product strengths
- contact and consent are valid

If the lead is engaged but the problem maps to planned features only, mark them `research_only` instead of forcing a product intro.

## Output

Write a dated folder to:

```text
reports/research-funnel/YYYY-MM-DD/
```

Required files:

- `00-run-summary.json`
- `01-daily-brief.md`
- `02-new-leads.md`
- `03-score-changes.md`
- `04-due-messages.md`
- `05-ellie-intro-candidates.md`
- `06-experiment-notes.md`

## Daily Brief Requirements

The final brief should include:

- how many new leads entered
- how many leads advanced stages
- how many were paused for no reply
- how many became Ellie-intro candidates
- the top three pain patterns observed
- the highest-risk failure in the current funnel
- one recommended experiment for the next run

## Safety And Compliance

- Never scrape or enrich leads from prohibited LinkedIn automation.
- Never send to WhatsApp or email without explicit opt-in.
- Never hide the fact that the conversation is associated with a real product effort.
- Never invent data or pain points that the lead did not state.
