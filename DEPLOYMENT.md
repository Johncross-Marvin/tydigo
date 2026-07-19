# WastiGo Deployment

WastiGo is now a full-stack app: the Vite frontend talks to authenticated API routes, and production data is stored in the D1 database bound as `DB`.

## Production Architecture

- Frontend: React/Vite static app in `dist`.
- Backend: generated worker at `dist/server/index.js`.
- Database: D1 binding named `DB`.
- Schema: `drizzle/0001_wastigo_core.sql`.
- Auth: phone-based signup/signin, server-side verification records, bearer sessions, logout/session revocation.

## Push To GitHub

```bash
git status
git add -A
git commit -m "Add production auth and persistent data backend"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/wastigo.git
git push -u origin main
```

If `origin` already exists, update it instead:

```bash
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/wastigo.git
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
VITE_API_BASE_URL=https://wastigo-20260719.johncros.chatgpt.site
```

7. Deploy.

Do not leave `VITE_API_BASE_URL` empty on Vercel unless the API is also deployed behind the same host. A static-only Vercel deploy cannot persist users, sessions, pickups, payments, or partner requests by itself.

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

Normal public signup supports household, collector, business, and recycling partner accounts. Admin access should remain invitation-only.
