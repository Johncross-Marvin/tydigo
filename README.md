# WastiGo

Smart waste pickup, recycling rewards, and operations dashboard for households,
collectors, businesses, recycling partners, and platform admins.

## What is production-backed now

- Phone signup/signin, server-side verification records, bearer sessions, and logout.
- Protected routes for user dashboards and operations pages.
- Persistent users, profiles, pickups, payments, EcoPoints transactions, partner material requests, and KYC queues.
- D1 schema and generated worker API for durable storage and retrieval.

## Run locally

```bash
pnpm install
pnpm run dev
```

## Production checks

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run preview
```

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for GitHub, Vercel, environment variable, and database-backed deployment steps.
