# Ryvro Launch Site

This folder contains static launch pages for the required public store URLs:

- `https://getryvro.com/`
- `https://getryvro.com/privacy`
- `https://getryvro.com/terms`
- `https://getryvro.com/support`
- `https://getryvro.com/delete-account`
- `https://getryvro.com/auth/action`

The pages are repo-side launch assets, not legal advice. The owner should review the wording, set final effective dates, connect the production domain, and verify the live HTTPS URLs before App Store Connect or Google Play submission.

`/auth/action/` is the Firebase Auth email action handler for verification, password reset, and email recovery links. Configure Firebase Authentication email templates with custom action URL `https://getryvro.com/auth/action/` after the `getryvro.com` domain is connected to Firebase Hosting and verified. The page uses Firebase Hosting reserved SDK URLs and `/__/firebase/init.js`, so it must run on the Firebase Hosting site rather than from a plain local file.

Firebase Hosting publishes this folder through a separate hosting target for the public launch site:

```bash
firebase target:apply hosting launch-site ryvro-launch-site --project ryvro-shift-planner
npm run firebase:deploy:launch-site
```

`npm run firebase:deploy:launch-site` uses `firebase.launch.json`, which points only at `web/launch` and the `launch-site` hosting target. The current target maps to Firebase Hosting site `ryvro-launch-site`, with fallback URL `https://ryvro-launch-site.web.app`. Do not replace the existing analytics admin hosting target without intentionally migrating that admin page.
