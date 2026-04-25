# Ellie Research Funnel Operating System

Turn miner discovery into a consented, daily, conversation-first funnel that surfaces real pain, captures direct contact, and introduces Ellie only when the lead is clearly a fit for the product that exists now.

## Goal

Build a repeatable outbound system that:

- starts with miner discovery on LinkedIn without violating platform rules
- moves contacts into a consented channel such as email or WhatsApp
- runs a 7-day research conversation that feels personal, not like a pitch
- scores fit, urgency, and product readiness
- introduces Ellie only after trust and relevance are established
- can be operated daily with Codex plus backend automation

## Non-Negotiables

- No LinkedIn scraping, auto-connects, or auto-DMs.
- LinkedIn is used for discovery, content, ads, forms, and manual or approved-source lead capture.
- Automation starts after explicit contact opt-in.
- Ellie is not pitched before fit is clear.
- Identity stays truthful. The conversation is product-light, not deceptive.
- Do not promise features Ellie does not have yet.

## Why This Fits Ellie

Ellie is strongest when the pain is about shift certainty, not generic mining software.

Current product strengths:

- rotating and FIFO roster support
- future-date shift lookup
- work block and rest block certainty
- smart reminders and post-shift check-ins
- voice assistant for roster questions
- offline-first behavior for low-connectivity environments

Current outbound hooks should stay anchored to pains Ellie already matches well:

- losing track of day/night/off position
- setting the wrong alarm or forgetting the next shift
- not knowing the next fly-in, fly-out, work block, or rest block
- struggling to plan family events around roster cycles
- checking calendars, screenshots, paper notes, or WhatsApp chats too often

Do not lead with these as primary promises yet:

- sleep intelligence
- crew-wide scheduling
- earnings analytics
- timesheets
- shift swaps

Those appear in repo plans, but they are not the core live wedge today.

## System Shape

The operating system has six layers:

1. Discovery
2. Consent capture
3. 7-day conversation sequence
4. Lead scoring and Ellie-intro decisioning
5. CRM state management
6. Daily automation and reporting

Recommended split:

- Codex: classification, scoring, sequence planning, QA, reports, prompt tuning
- Firebase and Cloud Functions: production data model, scheduler, webhooks, queue processing
- Email and WhatsApp APIs: actual message delivery after opt-in

## Exact Miner Personas

Focus on the personas Ellie can help now, not the entire mining org chart.

### Primary Persona 1: Underground Production Operator

- Typical titles: jumbo operator, bogger operator, loader operator, haul truck operator, driller, shotfirer
- Typical roster: rotating 7/7/7, 4/4/4, 2/2/3, or site-specific custom swings
- Core pain: losing place in the cycle and second-guessing tomorrow's shift
- Best Ellie fit: shift visibility, future-date lookup, reminders, voice queries
- Best hook question: `Do you ever have that moment where you need to double-check if tomorrow is days, nights, or off?`
- High-fit signals:
  - says they count forward manually
  - says they use screenshots or notes
  - mentions wrong alarms or last-minute checking

### Primary Persona 2: FIFO Field Worker

- Typical titles: FIFO operator, FIFO tradesperson, contractor, field service tech, shutdown worker
- Typical roster: 8/6, 14/7, 14/14, 21/7, 28/14
- Core pain: knowing when the next work block or rest block starts and planning life around swings
- Best Ellie fit: FIFO block tracking, next work block, next rest block, future planning
- Best hook question: `What is harder to stay on top of for you: next swing in, next swing home, or planning life around the block?`
- High-fit signals:
  - mentions fly-in or fly-out timing
  - says family planning is painful
  - says they disappear from normal routines during work blocks

### Primary Persona 3: Maintenance and Trades Miner

- Typical titles: boilermaker, fitter, electrician, diesel mechanic, fixed plant maintainer
- Typical roster: rotating or FIFO, often long shifts and short turnarounds
- Core pain: fatigue, prep time, inconsistent start times, and work-life disruption
- Best Ellie fit: reminders, calendar certainty, future-date checks, voice support
- Best hook question: `What catches you out more often: the roster itself, the start times, or the knock-on effect on your life outside site?`
- High-fit signals:
  - mentions prep routines
  - mentions short turnaround stress
  - mentions needing reminders because the pattern is mentally expensive

### Primary Persona 4: Process Plant or Control Room Operator

- Typical titles: process operator, control room operator, plant operator
- Typical roster: structured rotating shifts with frequent day-night transitions
- Core pain: staying confident on where they are in a repetitive but mentally draining cycle
- Best Ellie fit: shift certainty, calendar visibility, next-shift confidence
- Best hook question: `How often do you still need to check the pattern even when you've been on the same roster for ages?`
- High-fit signals:
  - says the roster is simple but still easy to lose mentally
  - says they need the answer fast, especially before or after sleep

## Secondary Personas

These can enter the system, but they should score lower unless their pain maps tightly to today's product.

### Secondary Persona 5: Crew Lead or Supervisor

- Useful when the pain is still personal roster certainty
- Lower fit if the pain is mostly crew allocation, approvals, or workforce planning

### Secondary Persona 6: Mining Parent or Family-Planning Worker

- Strong emotional trigger
- Good angle when they mention birthdays, school events, travel, or relationship strain
- Still needs a personal roster-management pain to qualify

## Disqualify Early

Move leads out of the active funnel when any of these dominate:

- they want enterprise workforce management
- they want crew-wide planning more than personal roster certainty
- they work fixed shifts and do not manage rotating or FIFO cycles
- they refuse direct contact or consent
- they answer vaguely with no pain and no operational need

## Lead Scoring

Use a 100-point model split into static fit and dynamic engagement.

### Static Fit Score: 0-60

#### 1. Role Fit: 0-20

- 20: underground operator, FIFO field worker, trades miner, process operator
- 14: supervisor with personal roster pain
- 6: admin, planner, or manager with weak personal use case
- 0: no mining relevance

#### 2. Roster Fit: 0-20

- 20: FIFO or rotating with multi-day blocks or alternating days and nights
- 14: custom roster with moderate complexity
- 6: simple fixed shift with low mental overhead
- 0: no roster complexity

#### 3. Problem Fit: 0-20

- 20: wrong alarm, lose cycle position, future-date planning, fly-in or fly-out uncertainty
- 14: general schedule stress with some concrete examples
- 6: curiosity only
- 0: no real pain identified

### Dynamic Engagement Score: 0-40

#### 4. Reply Depth: 0-10

- 10: gives specific examples, dates, routines, or workarounds
- 6: gives short but useful answers
- 2: one-word replies
- 0: no replies

#### 5. Contact Quality: 0-10

- 10: direct work email or active WhatsApp with clear opt-in
- 6: indirect or lower-confidence contact path
- 0: no consented channel

#### 6. Pain Urgency: 0-10

- 10: mentions repeated friction, family impact, missed alarms, stress, or planning failure
- 6: says it is annoying but manageable
- 0: no urgency

#### 7. Buying Readiness: 0-10

- 10: asks if a tool exists, asks for early access, or asks to stay updated
- 6: engaged and curious but not yet asking
- 0: purely informational

## Decision Thresholds

- 80-100: high-priority Ellie candidate
- 65-79: complete the sequence and introduce Ellie on Day 7
- 50-64: keep in research mode and do not force the product intro
- below 50: pause after the research sequence or mark not fit

Introduce Ellie only when all are true:

- day 6 or later
- total score at least 65
- static fit at least 40
- at least 2 substantive replies
- direct contact and consent captured
- pain maps to today's product

Do not introduce Ellie yet when:

- the lead's problem is team scheduling rather than personal schedule certainty
- the lead is engaged but pain maps to a planned feature only
- the lead has replied once but has not described a real workflow problem

## 7-Day Message Tree

The sequence is research-first. One short message per day. One question per message. No pitch before Day 7 unless the lead explicitly asks what you are building.

Message rules:

- keep every message under 240 characters for WhatsApp compatibility
- ask one question only
- reference their last answer when possible
- do not send links before Day 7 unless requested
- if no reply for 48 hours, pause instead of pushing daily

### Day 1: Context and Roster Reality

- Goal: learn role, roster type, and main frustration
- Core question: `What roster are you on right now, and what part of keeping track of it is the most annoying?`
- Underground variant: `Do you ever lose track of whether the next swing is days, nights, or off?`
- FIFO variant: `What is harder to keep straight for you: next swing in, next swing home, or planning around the block?`
- Score signals:
  - clear roster type
  - concrete pain
  - role fit

### Day 2: Current Workaround

- Goal: identify the system they already rely on
- Core question: `How do you keep track today: head math, screenshot, paper, calendar, WhatsApp, spreadsheet, or something else?`
- Score signals:
  - manual workaround
  - repeated checking behavior
  - no trusted system

### Day 3: Consequence

- Goal: surface the cost of the current workaround
- Core question: `What is the last real problem this caused for you: wrong alarm, late planning, family clash, travel confusion, or something else?`
- Score signals:
  - recent pain
  - emotional consequence
  - operational cost

### Day 4: Daily Rhythm

- Goal: learn when certainty matters most
- Core question: `When do you usually need the answer fast: the night before, pre-dawn, during handover, or when planning time off?`
- Score signals:
  - daily habit potential
  - reminder need
  - voice-query potential

### Day 5: Planning Depth

- Goal: qualify future-planning need
- Core question: `How far ahead do you usually need to trust the roster: tomorrow, next week, next swing, or months out for life planning?`
- Score signals:
  - long-range planning need
  - family event use case
  - recurring value

### Day 6: Ideal Outcome

- Goal: get explicit product requirements in the lead's own words
- Core question: `If one tool fixed this properly, what would it need to answer in under 10 seconds for you?`
- Score signals:
  - wording that maps to Ellie
  - strongest JTBD
  - intro readiness

### Day 7: Soft Reveal and Invite

- Goal: introduce Ellie only if the lead is qualified
- Core question for qualified leads: `We’re building Ellie around exactly this problem: [their pain in their words]. Want early access when the next version is ready?`
- Core question for borderline leads: `You’ve described a real roster-planning problem. Would you want to see a very early prototype when it’s ready, or should I keep you in the research loop only?`
- Do not send Day 7 intro when score is below threshold.

## No-Reply Handling

- 24 hours with no reply: send one short follow-up tied to the previous question
- 48 hours with no reply: move to `paused_no_reply`
- 7 days with no reply after pause: send one reactivation question only
- after that, close or archive unless they re-engage

Examples:

- Day 2 follow-up: `Curious because the workaround usually tells me how painful the problem really is.`
- Reactivation: `Quick one: do you still have to count forward manually on your roster, or do you already have a system you trust?`

## AI Agent Architecture

This should be built as a narrow multi-agent system with deterministic state transitions, not a free-form swarm.

### Agent 1: Lead Intake Agent

- input: approved lead source, CSV export, form submission, or direct opt-in
- job: normalize fields, dedupe leads, create source record
- output: `researchLead` record in CRM

### Agent 2: Persona Classifier

- input: title, company, country, first reply, roster hints
- job: map the lead to one primary persona and one confidence score
- output: persona label plus static-fit explanation

### Agent 3: Sequence Planner

- input: persona, previous messages, current day in sequence, score
- job: choose the next question and safe send window
- output: planned outbound message

### Agent 4: Message Writer

- input: planner instruction plus lead history
- job: write one short, natural message in a conversational tone
- guardrails:
  - one question only
  - no generic sales phrases
  - no premature Ellie reveal

### Agent 5: Reply Interpreter

- input: inbound reply
- job: extract roster type, pain, workaround, urgency, readiness, and objections
- output: structured update for scoring and CRM

### Agent 6: Scoring Agent

- input: static fit and new dynamic signals
- job: update lead score and introduction eligibility
- output: score, explanation, and next-state decision

### Agent 7: Compliance and Consent Agent

- input: channel preference, contact details, opt-in evidence
- job: block sends when direct consent is missing or unclear
- output: send allowed or blocked

### Agent 8: Daily Review Agent

- input: prior day's sequences, replies, conversions, and stalled leads
- job: produce experiment notes, failures, and changes for the next run
- output: daily operator brief

## Recommended Repo Placement

If this moves from docs into runtime code, add a dedicated module:

```text
backend/functions/src/research-funnel/
  types.ts
  persona-classifier.ts
  score-lead.ts
  sequence-engine.ts
  reply-interpreter.ts
  decision-engine.ts
  compliance.ts
  daily-run.ts
  reporting.ts
```

## CRM and Status Pipeline

Use Firestore as the system of record.

### Core Collections

```text
researchLeads
leadContacts
leadScores
conversationThreads
conversationEvents
messageQueue
dailyResearchRuns
```

### `researchLeads`

Suggested fields:

- `leadId`
- `sourceChannel`
- `sourceUrl`
- `fullName`
- `jobTitle`
- `company`
- `country`
- `linkedInProfileUrl`
- `persona`
- `personaConfidence`
- `rosterTypeHint`
- `stage`
- `sequenceDay`
- `timezone`
- `safeSendWindow`
- `createdAt`
- `updatedAt`

### `leadContacts`

- `leadId`
- `email`
- `whatsAppNumber`
- `preferredChannel`
- `optInStatus`
- `optInSource`
- `optInCapturedAt`
- `lastConsentVerifiedAt`

### `leadScores`

- `leadId`
- `staticFitScore`
- `dynamicScore`
- `totalScore`
- `introEligible`
- `reasons`
- `updatedAt`

### `conversationThreads`

- `threadId`
- `leadId`
- `currentDay`
- `status`
- `lastInboundAt`
- `lastOutboundAt`
- `nextActionAt`
- `nextActionType`

### `conversationEvents`

- `eventId`
- `leadId`
- `channel`
- `direction`
- `messageText`
- `parsedFields`
- `sequenceDay`
- `createdAt`

### `messageQueue`

- `queueId`
- `leadId`
- `channel`
- `plannedSendAt`
- `sendWindowLocal`
- `messageType`
- `messageText`
- `status`
- `failureReason`

### `dailyResearchRuns`

- `runId`
- `date`
- `newLeads`
- `messagesPlanned`
- `messagesSent`
- `repliesReceived`
- `ellieIntrosSent`
- `earlyAccessInterested`
- `pausedNoReply`
- `notFitClosed`
- `notes`

## Stage Model

Use explicit stages instead of vague labels.

- `new`
- `consent_pending`
- `opted_in`
- `enriched`
- `active_sequence`
- `awaiting_reply`
- `paused_no_reply`
- `contact_captured`
- `fit_review`
- `ellie_intro_ready`
- `ellie_intro_sent`
- `early_access_interested`
- `research_only`
- `not_fit`
- `closed`

Stage notes:

- `contact_captured` means a direct channel exists and consent is valid
- `fit_review` is the checkpoint after Day 6
- `research_only` is for interesting people whose needs do not map tightly to Ellie yet

## Daily Automation Workflow

The daily system should run in lead-local time, not one global blast.

### Every Day

1. Ingest new approved leads and opt-ins.
2. Dedupe against existing LinkedIn URLs, emails, and phone numbers.
3. Run persona classification and static scoring.
4. Parse all inbound replies from the last 24 hours.
5. Update dynamic scores and stage transitions.
6. Plan the next due message for each active lead.
7. Validate consent and send-window rules.
8. Queue messages for sending.
9. Process send results and failures.
10. Produce a daily operator report.

### Send-Window Rules

- if shift times are known, never send 90 minutes before shift start or during the first 2 hours of the shift
- if shift times are unknown, default to the lead's local lunch window
- when a lead says they are on night shift, bias toward late afternoon local time
- never send more than one outbound message in a 24-hour window

## Codex Role

Codex is best used for recurring intelligence and operator workflows, not as the only production sender.

Good Codex jobs:

- classify new leads
- rewrite due messages
- update scores
- produce daily summaries
- audit sequence quality
- suggest copy experiments

Bad Codex jobs:

- simulating LinkedIn user activity
- scraping LinkedIn profiles
- sending unconsented outreach

## Suggested Daily Output

Write a dated report to:

```text
reports/research-funnel/YYYY-MM-DD/
```

Suggested files:

- `00-run-summary.json`
- `01-daily-brief.md`
- `02-new-leads.md`
- `03-score-changes.md`
- `04-due-messages.md`
- `05-ellie-intro-candidates.md`
- `06-experiment-notes.md`

## Success Metrics

- opt-in rate from LinkedIn discovery to direct contact
- reply rate on Days 1 through 3
- reply depth, not just reply count
- percentage reaching `fit_review`
- percentage reaching `ellie_intro_ready`
- early-access acceptance rate
- share of leads marked `research_only` versus `not_fit`
- top pain points by persona

## Implementation Order

### Phase 1

- create Firestore schema
- define stages
- implement daily report generation
- keep sending manual

### Phase 2

- implement persona classification
- implement scoring engine
- implement message planning
- connect email and WhatsApp send queues

### Phase 3

- implement reply parsing
- automate stage transitions
- automate Ellie-intro eligibility

### Phase 4

- add Codex recurring daily automation
- add experiment loop and prompt tuning
- add persona- and pain-level reporting dashboards

## Recommended Positioning For This Funnel

Do not market Ellie first as an app.

Market it first as help with:

- shift certainty
- swing planning
- roster confidence
- knowing the next work or rest block without counting

Then reveal Ellie as the product being built around the exact problems the miner described.
