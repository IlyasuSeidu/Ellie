# Ellie Platform Playbook

This file explains how the Ellie content system treats each platform.

The implementation lives in:

- `config/ellie-platform-playbook.js`
- `scripts/generate-stop-scroll-content.js`

## Working Rule

Do not write one generic post and stretch it across platforms.

Each platform should get a native format:

- Reels: fast visual stop + short tension arc
- TikTok: human, creator-native confession or story
- Shorts: slightly deeper explainer
- Carousel: saveable swipe story
- LinkedIn: product judgment and grounded founder point of view
- X: sharp claim plus proof
- Threads: lighter conversation with a real insight

## Ellie Positioning Rule

Ellie stays product-first on every platform.

The miner-builder and vibe-coding overlays are secondary:

- lighter on Reels, TikTok, Shorts, and Carousel
- stronger on LinkedIn, X, and Threads

## Current Platform Guidance Used

The playbook is based on current platform guidance and platform research, including:

- [Meta best practices for creators](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/)
- [Meta on trial reels and discovery](https://about.fb.com/news/2025/06/inspiring-creativity-that-brings-people-together/amp/)
- [TikTok creative guide](https://ads.tiktok.com/business/en/guides/what-is-ad-creative-guide)
- [TikTok creator guidance](https://newsroom.tiktok.com/for-creators-future-format-summit/?lang=en)
- [YouTube on strong Shorts openings](https://blog.youtube/creator-and-artist-stories/youtube-creator-how-to-start/)
- [YouTube Shorts updates](https://blog.youtube/news-and-events/tall-updates-coming-to-shorts/)
- [LinkedIn sharing guide](https://content.linkedin.com/content/dam/help/linkedin/en-us/LinkedIn-Sharing-Guide.pdf)
- [LinkedIn video storytelling report](https://business.linkedin.com/content/dam/business/marketing-solutions/global/en_US/site/pdf/wp/2025/the-art-and-science-of-video.pdf)

## Generator Output

Every dated folder now includes:

- strategy files
- `10-codebase-context.md` for internal grounding
- `ready-to-post/<platform>/post.md`
- `ready-to-post/<platform>/asset-brief.md`

The codebase context is for internal reasoning.
The publishable files should read like native content, not an internal engineering note.
