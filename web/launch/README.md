# Ryvro Launch Site

This folder contains static launch pages for the required public store URLs:

- `https://getryvro.com/`
- `https://getryvro.com/privacy`
- `https://getryvro.com/terms`
- `https://getryvro.com/support`
- `https://getryvro.com/delete-account`

The pages are repo-side launch assets, not legal advice. The owner should review the wording, set final effective dates, connect the production domain, and verify the live HTTPS URLs before App Store Connect or Google Play submission.

Firebase Hosting can publish this folder after a separate hosting target is configured for the public launch site:

```bash
firebase target:apply hosting launch-site <firebase-hosting-site-id>
firebase deploy --config firebase.json --only hosting:launch-site
```

Do not replace the existing analytics admin hosting target without intentionally migrating that admin page.
