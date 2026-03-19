# Stop-Scroll Content OS

Ellie now includes a local `git -> story -> platform pack` pipeline for end-of-day content generation.

## Goal

Turn one day of tracked work into a reusable content pack that can feed:

- TikTok / Instagram Reels / YouTube Shorts
- Instagram carousel posts
- LinkedIn founder posts
- X / Threads posts
- Community prompts, polls, and reply follow-ups

The system is designed to avoid one-way "today I shipped X" posts. Every pack is built around:

- tension
- proof
- participation

The tracked work is private source material. The publishable assets should lead with the story, user friction, turning point, and lesson, not internal version-control language.

## Command

```bash
npm run content:daily -- --date YYYY-MM-DD
npm run content:daily:local -- --date YYYY-MM-DD
npm run content:daily:anthropic -- --date YYYY-MM-DD
npm run content:daily -- --date YYYY-MM-DD --rollover-time 20:30
```

Optional flags:

```bash
npm run content:daily -- --date 2026-03-17
npm run content:daily -- --since "2026-03-17 00:00:00" --until "2026-03-17 23:59:59"
npm run content:daily -- --date 2026-03-17 --rollover-time 20:30
npm run content:daily -- --output-root reports/stop-scroll
npm run content:daily -- --provider local --date 2026-03-17
npm run content:daily -- --provider anthropic --anthropic-model claude-sonnet-4-6 --date 2026-03-17 --rollover-time 20:30
```

## What The Generator Does

1. Reads git history for the selected window.
2. Pulls commit subjects, diff stats, and changed files.
3. Detects product themes such as onboarding, paywall, localization, calendar trust, or voice.
4. Scores the strongest moments for content potential.
5. Inspects the current codebase around the touched files so the story uses real app context, not commit titles alone.
6. Rotates storytelling angles using prior generated packs to reduce repetition.
7. Writes a publish-ready pack into `build-in-public/daily-content/<date>/`.
8. Optionally sends selected publishable drafts to Anthropic for stronger platform-native wording while keeping the local factual layer intact.

## Rollover Window

Use `--rollover-time HH:MM` when the pack should represent work since the previous cutoff rather than the calendar day.

Example:

```bash
npm run content:daily -- --rollover-time 20:30
```

With `--rollover-time 20:30`, a pack dated `2026-03-17` covers:

- start: `2026-03-16 20:30:00`
- end: `2026-03-17 20:29:59`

That means anything pushed after `20:30` is intentionally held for the next day’s `20:30` run.

## Output Files

- `00-brief.json`
- `01-daily-brief.md`
- `02-hook-bank.md`
- `03-hero-short.md`
- `04-instagram-carousel.md`
- `05-linkedin-post.md`
- `06-x-thread.md`
- `07-funnel-cuts.md`
- `08-community-loop.md`
- `09-platform-playbook.md`
- `10-codebase-context.md`
- `11-provider-report.json` when a provider run beyond local generation is attempted
- `ready-to-post/instagram-reels/post.md`
- `ready-to-post/instagram-reels/asset-brief.md`
- `ready-to-post/tiktok/post.md`
- `ready-to-post/tiktok/asset-brief.md`
- `ready-to-post/youtube-shorts/post.md`
- `ready-to-post/youtube-shorts/asset-brief.md`
- `ready-to-post/instagram-carousel/post.md`
- `ready-to-post/instagram-carousel/asset-brief.md`
- `ready-to-post/linkedin/post.md`
- `ready-to-post/linkedin/asset-brief.md`
- `ready-to-post/x/post.md`
- `ready-to-post/x/asset-brief.md`
- `ready-to-post/threads/post.md`
- `ready-to-post/threads/asset-brief.md`

## Story Design Rules

Each pack should be refined with these constraints in mind:

- The first seconds or first line must create a pattern interrupt.
- Every asset should blend at least two angles, not one.
- "Polish" only counts as content if it changes comprehension or trust.
- Bug fixes become stories when the wrong assumption is made explicit.
- A good pack does not end at awareness. It should cover awareness, consideration, decision, activation, retention, and advocacy.
- Publishable drafts should not lead with `GitHub`, `commit`, `push`, or similar internal terms unless you intentionally want a niche builder-only post.
- Current-codebase context should be used to understand what the feature area actually does now, but it should not be used to invent historical claims that the day brief cannot support.
- Current-codebase context should stay mostly invisible in public-facing drafts. Use it to sharpen names, stakes, and proof, not to write “the current code shows...” style copy.
- Ellie should stay product-first. Builder-facing posts can use the miner-builder or vibe-coding lens, but the product problem still comes first.
- Ready-to-post folders should include the actual post plus an asset brief so recording, editing, and posting decisions are platform-native.

## Recommended Automation Behavior

Run the generator every evening after development has slowed down. The generator now writes both strategy files and ready-to-post platform folders. Codex can still refine them further, but the first pass should already be publishable.

The automation prompt should:

1. Run `npm run content:daily -- --date <today>` or, for the scheduled evening run, `npm run content:daily -- --date <today> --rollover-time 20:30`.
2. Stop if there is no tracked work for the day.
3. Read the newly generated pack plus the last few packs for repetition control.
4. Use `10-codebase-context.md` to cross-check what the touched feature area does in the current app.
5. Sharpen the hook, trim generic phrasing, and preserve proof from the story brief.
6. Leave the final assets in the dated folder.

An editable prompt version is stored in:

- `docs/STOP_SCROLL_AUTOMATION_PROMPT.md`
- `docs/HYBRID_REWRITE_STYLE.md`
- `docs/ELLIE_ANGLE_FRAMEWORK.md`
- `config/ellie-brand-context.js`
- `config/ellie-platform-playbook.js`
- `docs/ELLIE_BUILD_IN_PUBLIC_AGENT.md`
- `docs/ELLIE_PLATFORM_PLAYBOOK.md`
- `docs/ANTHROPIC_CONTENT_PROVIDER.md`

## Provider Modes

- `local`: deterministic repo-aware writer only
- `anthropic`: local factual pack first, then Anthropic rewrites the publishable drafts
- default behavior: if `ANTHROPIC_API_KEY` exists, `content:daily` uses `anthropic`; otherwise it uses `local`

Relevant environment variables:

- `CONTENT_PROVIDER`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_EFFORT`

## Day 1 Replay

Once the system is in place, you can replay old repository history by date to generate content packs for earlier milestones.
