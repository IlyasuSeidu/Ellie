# Anthropic Content Provider

Ellie's stop-scroll generator now supports Anthropic as an optional writing provider.

## How It Works

The pipeline stays local-first:

1. local git and codebase analysis builds the factual brief
2. local logic selects story mode, angles, and platform fit
3. Anthropic rewrites selected publishable files for stronger wording

This avoids letting the model invent the story from raw repo state.

## Files Anthropic Can Refine

- `03-hero-short.md`
- `04-instagram-carousel.md`
- `05-linkedin-post.md`
- `06-x-thread.md`
- `ready-to-post/*/post.md`

The factual and structural files stay local:

- `00-brief.json`
- `01-daily-brief.md`
- `02-hook-bank.md`
- `07-funnel-cuts.md`
- `08-community-loop.md`
- `09-platform-playbook.md`
- `10-codebase-context.md`
- `ready-to-post/*/asset-brief.md`

## Setup

Add these to `.env`:

```env
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_EFFORT=low
```

Optional:

```env
CONTENT_PROVIDER=anthropic
```

If `CONTENT_PROVIDER` is omitted, `npm run content:daily` will auto-use Anthropic when `ANTHROPIC_API_KEY` exists. Otherwise it stays local.

## Commands

```bash
npm run content:daily -- --date YYYY-MM-DD
npm run content:daily:local -- --date YYYY-MM-DD
npm run content:daily:anthropic -- --date YYYY-MM-DD
npm run content:daily -- --provider anthropic --anthropic-model claude-sonnet-4-6 --rollover-time 20:30
```

## Output

When Anthropic is used, the dated folder also includes:

- `11-provider-report.json`

That file records:

- provider
- model
- refined files
- failed files
- request count
- token usage

## Guardrails

Anthropic is prompted to:

- keep Ellie product-first
- avoid internal build terms in publishable drafts
- avoid fake traction, fake users, and fake outcomes
- use current codebase context only for naming and understanding, not false history
