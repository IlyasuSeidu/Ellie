# Firebase Backend Setup

This project uses Firebase Cloud Functions (Gen 2) from `backend/functions`.

## Prerequisites

- Firebase CLI authenticated (`firebase login`)
- A Firebase project ID
- OpenAI API key for backend secret (`OPENAI_API_KEY`)
- Blaze plan enabled on the Firebase project (required for Functions Gen 2)

## One-time project wiring

1. Copy the Firebase project config template:
   - `cp .firebaserc.example .firebaserc`
2. Edit `.firebaserc` and set your project ID as `projects.default`.

## Install backend deps

```bash
npm --prefix backend/functions install
```

## Build

```bash
npm --prefix backend/functions run build
```

## Set required secret

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

## Run local emulator

```bash
npm run firebase:emulators:functions
```

## Deploy

```bash
npm run firebase:deploy:functions
```

After deploy, update app `.env`:

- `ELLIE_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ellieBrain`
