# Tydigo Deployment

Tydigo is an on-demand waste pickup, recycling, and rewards platform helping homes, estates, businesses, collectors, and recyclers build cleaner African cities.

## Production Architecture

- Frontend: React/Vite static app in `dist`.
- Backend: generated worker at `dist/server/index.js`.
- Database: D1 binding named `DB`.
- Schema: `drizzle/0001_wastigo_core.sql`.
- Auth: phone-based signup/signin, server-side verification records, bearer sessions, logout/session revocation.
- OTP delivery: Termii or Twilio SMS when server-side credentials are configured; in-app verification fallback when no SMS provider is configured.

## Push To GitHub

```bash
git status
git add -A
git commit -m "Add production auth and persistent data backend"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/tydigo.git
git push -u origin main
```

If `origin` already exists, update it instead:

```bash
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/tydigo.git
git push -u origin main
```

## Deploy On Vercel

Vercel can host the frontend cleanly. For real user data, set the frontend to call the production API URL from the full-stack worker deployment.

1. Import the GitHub repo in Vercel.
2. Framework preset: `Vite`.
3. Install command: `pnpm install --frozen-lockfile`.
4. Build command: `pnpm run build`.
5. Output directory: `dist`.
6. Add environment variable:

```bash
VITE_API_BASE_URL=https://YOUR_FULL_STACK_TYDIGO_API_URL
```

7. Deploy.

Do not leave `VITE_API_BASE_URL` empty on Vercel unless the API is also deployed behind the same host. A static-only Vercel deploy cannot persist users, sessions, pickups, payments, or recycler material requests by itself.

## Full-Stack Worker Deployment

The included `.openai/hosting.json` binds D1 as `DB`, and the build embeds the API worker.

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run build
```

For admin promotion, configure this as a private server-side environment variable in the hosting provider:

```bash
ADMIN_INVITE_CODE=use-a-long-private-random-value
```

For real SMS OTP delivery, configure either Termii:

```bash
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=Tydigo
TERMII_CHANNEL=generic
```

Or Twilio:

```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

Normal public signup supports home/estate, collector, business, and recycler accounts. Admin access should remain invitation-only.
