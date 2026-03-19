# Daily Content Packs

This folder stores generated end-of-day social media packs.

Each dated folder is produced by:

```bash
npm run content:daily -- --date YYYY-MM-DD
```

Every pack includes:

- `00-brief.json`: structured git-to-story context
- `01-daily-brief.md`: daily thesis, story atoms, top moments
- `02-hook-bank.md`: reusable hooks for short-form and text posts
- `03-hero-short.md`: main short-video script and edit notes
- `04-instagram-carousel.md`: carousel concept, slide copy, caption
- `05-linkedin-post.md`: deeper founder/expert post
- `06-x-thread.md`: X / Threads draft
- `07-funnel-cuts.md`: content mapped across funnel stages
- `08-community-loop.md`: polls, reply seeds, follow-up prompts
- `09-platform-playbook.md`: native format, angle, and structure guidance per platform
- `10-codebase-context.md`: current-codebase context around the touched feature area
- `11-provider-report.json`: provider run metadata when Anthropic refinement is attempted
- `ready-to-post/`: publish-ready platform folders for TikTok, Reels, Shorts, carousel, LinkedIn, X, and Threads
  - each platform folder now contains `post.md` and `asset-brief.md`

The generator mines one day of git history as private source material, inspects the current codebase around the touched files for extra product context, and writes story-first assets that avoid leading with internal build terms in the publishable drafts.
