# End-of-Day Stop-Scroll Automation Prompt

Run the daily Ellie content pack and refine it into publish-ready, platform-native assets.

## Steps

1. Run:

```bash
npm run content:daily
```

If you need to force a provider:

```bash
npm run content:daily -- --provider local
npm run content:daily -- --provider anthropic --anthropic-model claude-sonnet-4-6 --rollover-time 20:30
```

2. Find the newest dated folder in:

```text
build-in-public/daily-content/
```

3. Open:

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
- `11-provider-report.json` if present
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
- `/Users/Shared/Ellie/docs/HYBRID_REWRITE_STYLE.md`
- `/Users/Shared/Ellie/docs/ELLIE_ANGLE_FRAMEWORK.md`
- `/Users/Shared/Ellie/config/ellie-brand-context.js`
- `/Users/Shared/Ellie/config/ellie-platform-playbook.js`
- `/Users/Shared/Ellie/docs/ELLIE_BUILD_IN_PUBLIC_AGENT.md`
- `/Users/Shared/Ellie/docs/ELLIE_PLATFORM_PLAYBOOK.md`

4. Also inspect the last 3 previously generated dated folders to avoid repeating the same hooks, angles, or CTA patterns.

5. If the newest pack says there was no tracked work for the day, stop and report that no pack was generated.

6. Otherwise, refine the content inside that dated folder using these rules:

- Keep tension, proof, and participation in every asset.
- Blend at least two angles per asset.
- Use `10-codebase-context.md` so feature language reflects what the app actually does now, not just the commit phrasing.
- Make the hero short native to TikTok / Reels / Shorts, not generic.
- Make the LinkedIn post sharper and more opinionated.
- Make the carousel easier to scan and save.
- Make the thread tighter and more conversational.
- Keep proof anchored in the story brief.
- Cut generic phrases, filler, and repetitive openings.
- Preserve the strongest story moment from the day.
- Do not lead with `GitHub`, `commit`, `push`, `diff`, or other internal build terms in publishable drafts.
- Apply the hybrid rewrite style from `docs/HYBRID_REWRITE_STYLE.md`: keep the strongest tension, remove any claim the brief cannot defend, preserve chronology, and translate technical work into human consequence.
- Keep Ellie product-first. For LinkedIn, X, and Threads you may layer in the miner-builder or vibe-coding angle, but it should support the product story rather than replace it.
- Use `asset-brief.md` files to keep the format native to each platform rather than collapsing everything into one generic post shape.
- For the scheduled `20:30` run, treat the pack as a rollover window from the previous day’s `20:30:00` to the current day’s `20:29:59`.

7. Update the `ready-to-post/` platform folders so each platform still has a publish-ready final draft.

8. In the final response, summarize:

- the date processed
- the main story thesis
- the strongest asset
- the best audience question to post
