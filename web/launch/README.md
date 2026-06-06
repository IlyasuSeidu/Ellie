# Ryvro Launch Site

This folder contains static launch pages for the required public store URLs:

- `https://getryvro.com/`
- `https://getryvro.com/privacy`
- `https://getryvro.com/terms`
- `https://getryvro.com/support`
- `https://getryvro.com/delete-account`

The pages are repo-side launch assets, not legal advice. The owner should review the wording, set final effective dates, connect the production domain, and verify the live HTTPS URLs before App Store Connect or Google Play submission.

Firebase Hosting publishes this folder through a separate hosting target for the public launch site:

```bash
firebase target:apply hosting launch-site ryvro-launch-site --project ryvro-shift-planner
npm run firebase:deploy:launch-site
```

`npm run firebase:deploy:launch-site` uses `firebase.launch.json`, which points only at `web/launch` and the `launch-site` hosting target. The current target maps to Firebase Hosting site `ryvro-launch-site`, with fallback URL `https://ryvro-launch-site.web.app`. Do not replace the existing analytics admin hosting target without intentionally migrating that admin page.
